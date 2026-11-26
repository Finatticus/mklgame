"""Convert an official KataGo network (.bin.gz / .txt.gz) into an ONNX file
that onnxruntime-web can run in the browser.

Usage:  python tools/katago2onnx.py <model.bin.gz> <out.onnx> [--fp16]

--fp16 stores the weights as float16 and casts them back to float32 inside the
graph (the runtime folds the casts when the session is created), which halves
the download size with no measurable change in play.

Inputs of the produced model
  bin_input    float32 [N, 22, H, W]   KataGo V7 spatial features
  global_input float32 [N, 19]         KataGo V7 global features
  size_scale   float32 [1]             (sqrt(H*W) - 14) / 10
Outputs
  policy [N, C, H, W]  (channel 0 = move logits)   pass [N, C]
  value  [N, 3]        misc [N, K]                 ownership [N, 1, H, W]

The board must fill the whole tensor (no masking), so run 9x9 as H=W=9 etc.
Supports model versions 8..15 without transformer blocks or meta encoders.
"""
import gzip
import sys

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper


class Reader:
    def __init__(self, data, binary):
        self.d = data
        self.p = 0
        self.binary = binary

    def tok(self):
        d, p = self.d, self.p
        n = len(d)
        while p < n and d[p] in b" \t\r\n":
            p += 1
        s = p
        while p < n and d[p] not in b" \t\r\n":
            p += 1
        self.p = p
        return d[s:p].decode("ascii")

    def int(self):
        return int(self.tok())

    def float(self):
        return float(self.tok())

    def floats(self, n):
        if self.binary:
            i = self.d.index(b"@BIN@", self.p)
            if i - self.p > 100:
                raise ValueError("binary block not found where expected")
            s = i + 5
            arr = np.frombuffer(self.d, dtype="<f4", count=n, offset=s).copy()
            self.p = s + 4 * n
            return arr
        # text floats: grab n whitespace separated tokens quickly
        d, p = self.d, self.p
        out = np.empty(n, dtype=np.float32)
        chunk = d[p:p + n * 24 + 64].split(None, n)
        if len(chunk) <= n:
            chunk = d[p:].split(None, n)
        for k in range(n):
            out[k] = float(chunk[k])
        # advance: find the position after the n-th token
        pos = p
        for k in range(n):
            pos = d.index(chunk[k], pos) + len(chunk[k])
        self.p = pos
        return out


class Builder:
    def __init__(self, fp16):
        self.nodes = []
        self.inits = []
        self.n = 0
        self.fp16 = fp16

    def name(self, base):
        self.n += 1
        return "%s_%d" % (base, self.n)

    def weight(self, arr, base="w"):
        arr = np.ascontiguousarray(arr, dtype=np.float32)
        nm = self.name(base)
        if self.fp16 and arr.size >= 64:
            raw = nm + "_h"
            self.inits.append(numpy_helper.from_array(arr.astype(np.float16), raw))
            self.nodes.append(helper.make_node("Cast", [raw], [nm], to=TensorProto.FLOAT))
        else:
            self.inits.append(numpy_helper.from_array(arr, nm))
        return nm

    def ints(self, vals):
        nm = self.name("i")
        self.inits.append(numpy_helper.from_array(np.array(vals, dtype=np.int64), nm))
        return nm

    def op(self, op, inputs, out=None, **attrs):
        out = out or self.name(op.lower())
        self.nodes.append(helper.make_node(op, inputs, [out], **attrs))
        return out


def read_conv(r):
    name = r.tok()
    ky, kx, ic, oc, dy, dx = (r.int() for _ in range(6))
    w = r.floats(ky * kx * ic * oc).reshape(ky, kx, ic, oc).transpose(3, 2, 0, 1)
    return dict(w=w, ky=ky, kx=kx, ic=ic, oc=oc, dy=dy, dx=dx, name=name)


def read_bn(r):
    name = r.tok()
    c = r.int()
    eps = r.float()
    has_scale = r.int()
    has_bias = r.int()
    mean = r.floats(c)
    var = r.floats(c)
    scale = r.floats(c) if has_scale else np.ones(c, np.float32)
    bias = r.floats(c) if has_bias else np.zeros(c, np.float32)
    ms = scale / np.sqrt(var + eps)
    mb = bias - ms * mean
    return dict(scale=ms.astype(np.float32), bias=mb.astype(np.float32), c=c)


def read_act(r, ver):
    r.tok()
    if ver >= 11:
        kind = r.tok()
        return {"ACTIVATION_IDENTITY": "id", "ACTIVATION_RELU": "relu", "ACTIVATION_MISH": "mish"}[kind]
    return "relu"


def read_matmul(r):
    r.tok()
    ic, oc = r.int(), r.int()
    return dict(w=r.floats(ic * oc).reshape(ic, oc), ic=ic, oc=oc)


def read_matbias(r):
    r.tok()
    c = r.int()
    return dict(b=r.floats(c))


def read_block(r, ver):
    kind = r.tok()
    b = dict(kind=kind)
    r.tok()  # name
    if kind == "ordinary_block":
        b["preBN"] = read_bn(r); b["preAct"] = read_act(r, ver); b["conv1"] = read_conv(r)
        b["midBN"] = read_bn(r); b["midAct"] = read_act(r, ver); b["conv2"] = read_conv(r)
    elif kind == "gpool_block":
        b["preBN"] = read_bn(r); b["preAct"] = read_act(r, ver); b["conv1"] = read_conv(r)
        b["gconv"] = read_conv(r); b["gBN"] = read_bn(r); b["gAct"] = read_act(r, ver)
        b["gmul"] = read_matmul(r)
        b["midBN"] = read_bn(r); b["midAct"] = read_act(r, ver); b["conv2"] = read_conv(r)
    elif kind == "nested_bottleneck_block":
        nb = r.int()
        b["preBN"] = read_bn(r); b["preAct"] = read_act(r, ver); b["preConv"] = read_conv(r)
        b["blocks"] = [read_block(r, ver) for _ in range(nb)]
        b["postBN"] = read_bn(r); b["postAct"] = read_act(r, ver); b["postConv"] = read_conv(r)
    else:
        raise ValueError("unsupported block kind: " + kind)
    return b


def parse(path):
    raw = gzip.open(path, "rb").read()
    r = Reader(raw, binary=".bin" in path)
    m = dict(name=r.tok(), version=r.int())
    ver = m["version"]
    if ver < 8 or ver > 15:
        raise ValueError("unsupported model version %d" % ver)
    m["cin"], m["gin"] = r.int(), r.int()
    m["post"] = [r.float() for _ in range(7)] if ver >= 13 else None
    if ver >= 15:
        meta = r.int()
        if meta != 0:
            raise ValueError("meta encoder models are not supported")
        for _ in range(7):
            r.int()
    # trunk
    r.tok()
    nblocks = r.int()
    m["trunkC"], m["midC"], m["regC"], m["dilC"], m["gpoolC"] = (r.int() for _ in range(5))
    if ver >= 15:
        if r.int() != 0:
            raise ValueError("RMSNorm trunk not supported")
        for _ in range(5):
            r.int()
    m["initConv"] = read_conv(r)
    m["initMul"] = read_matmul(r)
    m["blocks"] = [read_block(r, ver) for _ in range(nblocks)]
    m["tipBN"] = read_bn(r)
    m["tipAct"] = read_act(r, ver)
    # policy head
    r.tok()
    p = {}
    p["p1Conv"] = read_conv(r); p["g1Conv"] = read_conv(r); p["g1BN"] = read_bn(r); p["g1Act"] = read_act(r, ver)
    p["gmul"] = read_matmul(r); p["p1BN"] = read_bn(r); p["p1Act"] = read_act(r, ver)
    p["p2Conv"] = read_conv(r); p["passMul"] = read_matmul(r)
    if ver >= 15:
        p["passBias"] = read_matbias(r); p["passAct"] = read_act(r, ver); p["passMul2"] = read_matmul(r)
    m["policy"] = p
    # value head
    r.tok()
    v = {}
    v["v1Conv"] = read_conv(r); v["v1BN"] = read_bn(r); v["v1Act"] = read_act(r, ver)
    v["v2Mul"] = read_matmul(r); v["v2Bias"] = read_matbias(r); v["v2Act"] = read_act(r, ver)
    v["v3Mul"] = read_matmul(r); v["v3Bias"] = read_matbias(r)
    v["sv3Mul"] = read_matmul(r); v["sv3Bias"] = read_matbias(r)
    v["own"] = read_conv(r)
    m["value"] = v
    return m


def build(m, fp16):
    g = Builder(fp16)

    def conv(x, c):
        return g.op("Conv", [x, g.weight(c["w"])], kernel_shape=[c["ky"], c["kx"]],
                    dilations=[c["dy"], c["dx"]],
                    pads=[c["dy"] * (c["ky"] // 2), c["dx"] * (c["kx"] // 2)] * 2)

    def bn(x, b):
        y = g.op("Mul", [x, g.weight(b["scale"].reshape(1, -1, 1, 1), "bs")])
        return g.op("Add", [y, g.weight(b["bias"].reshape(1, -1, 1, 1), "bb")])

    def act(x, kind):
        if kind == "relu":
            return g.op("Relu", [x])
        if kind == "mish":
            return g.op("Mul", [x, g.op("Tanh", [g.op("Softplus", [x])])])
        return x

    def matmul(x, d):
        return g.op("MatMul", [x, g.weight(d["w"], "mm")])

    def spatial(x):  # [N,C] -> [N,C,1,1]
        return g.op("Unsqueeze", [x, g.ints([2, 3])])

    def gpool(x, value_head=False):
        mean = g.op("ReduceMean", [x], axes=[2, 3], keepdims=0)
        scaled = g.op("Mul", [mean, "size_scale"])
        if value_head:
            third = g.op("Mul", [mean, "size_scale2"])
        else:
            third = g.op("ReduceMax", [x], axes=[2, 3], keepdims=0)
        return g.op("Concat", [mean, scaled, third], axis=1)

    def block(x, b):
        k = b["kind"]
        if k == "ordinary_block":
            y = conv(act(bn(x, b["preBN"]), b["preAct"]), b["conv1"])
            y = conv(act(bn(y, b["midBN"]), b["midAct"]), b["conv2"])
        elif k == "gpool_block":
            a = act(bn(x, b["preBN"]), b["preAct"])
            y = conv(a, b["conv1"])
            gp = gpool(act(bn(conv(a, b["gconv"]), b["gBN"]), b["gAct"]))
            y = g.op("Add", [y, spatial(matmul(gp, b["gmul"]))])
            y = conv(act(bn(y, b["midBN"]), b["midAct"]), b["conv2"])
        else:
            y = conv(act(bn(x, b["preBN"]), b["preAct"]), b["preConv"])
            for sub in b["blocks"]:
                y = block(y, sub)
            y = conv(act(bn(y, b["postBN"]), b["postAct"]), b["postConv"])
        return g.op("Add", [x, y])

    # size_scale2 = size_scale^2 - 0.1
    sq = g.op("Mul", ["size_scale", "size_scale"])
    g.op("Sub", [sq, g.weight(np.array([0.1], np.float32), "c")], out="size_scale2")

    x = conv("bin_input", m["initConv"])
    x = g.op("Add", [x, spatial(matmul("global_input", m["initMul"]))])
    for b in m["blocks"]:
        x = block(x, b)
    trunk = act(bn(x, m["tipBN"]), m["tipAct"])

    p = m["policy"]
    pp = conv(trunk, p["p1Conv"])
    gp = gpool(act(bn(conv(trunk, p["g1Conv"]), p["g1BN"]), p["g1Act"]))
    pp = g.op("Add", [pp, spatial(matmul(gp, p["gmul"]))])
    pp = act(bn(pp, p["p1BN"]), p["p1Act"])
    g.op("Identity", [conv(pp, p["p2Conv"])], out="policy")
    ps = matmul(gp, p["passMul"])
    if "passMul2" in p:
        ps = g.op("Add", [ps, g.weight(p["passBias"]["b"], "b")])
        ps = matmul(act(ps, p["passAct"]), p["passMul2"])
    g.op("Identity", [ps], out="pass")

    v = m["value"]
    v1 = act(bn(conv(trunk, v["v1Conv"]), v["v1BN"]), v["v1Act"])
    vp = gpool(v1, value_head=True)
    v2 = act(g.op("Add", [matmul(vp, v["v2Mul"]), g.weight(v["v2Bias"]["b"], "b")]), v["v2Act"])
    g.op("Add", [matmul(v2, v["v3Mul"]), g.weight(v["v3Bias"]["b"], "b")], out="value")
    g.op("Add", [matmul(v2, v["sv3Mul"]), g.weight(v["sv3Bias"]["b"], "b")], out="misc")
    g.op("Identity", [conv(v1, v["own"])], out="ownership")

    f = TensorProto.FLOAT
    inputs = [
        helper.make_tensor_value_info("bin_input", f, ["n", m["cin"], "h", "w"]),
        helper.make_tensor_value_info("global_input", f, ["n", m["gin"]]),
        helper.make_tensor_value_info("size_scale", f, [1]),
    ]
    outputs = [
        helper.make_tensor_value_info("policy", f, ["n", p["p2Conv"]["oc"], "h", "w"]),
        helper.make_tensor_value_info("pass", f, ["n", None]),
        helper.make_tensor_value_info("value", f, ["n", 3]),
        helper.make_tensor_value_info("misc", f, ["n", None]),
        helper.make_tensor_value_info("ownership", f, ["n", 1, "h", "w"]),
    ]
    graph = helper.make_graph(g.nodes, m["name"], inputs, outputs, g.inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)], producer_name="katago2onnx")
    model.ir_version = 8
    return model


def main():
    src, dst = sys.argv[1], sys.argv[2]
    fp16 = "--fp16" in sys.argv
    m = parse(src)
    print("name=%s version=%d blocks=%d trunk=%d post=%s" % (m["name"], m["version"], len(m["blocks"]), m["trunkC"], m["post"]))
    model = build(m, fp16)
    onnx.save(model, dst)
    print("wrote", dst)


if __name__ == "__main__":
    main()
