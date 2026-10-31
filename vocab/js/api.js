// ===================== 後端呼叫與離線佇列 =====================
class ServerError extends Error {}

const Api = {
    // 直接呼叫（讀取類）。網路錯誤丟出一般 Error，後端回報錯誤丟出 ServerError
    async call(action, payload = {}) {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ ...payload, action, username: S.user })
        });
        // 伺服器暫時故障（非 2xx）視為網路問題，之後重送；回應成功卻不是 JSON 則視為後端錯誤，避免佇列永遠卡住
        if (!res.ok) throw new Error("伺服器暫時無法使用（" + res.status + "）");
        let data;
        try { data = await res.json(); }
        catch (e) { throw new ServerError("後端回應格式錯誤，請確認 GAS 已部署最新版本"); }
        if (data.status !== "success") throw new ServerError(data.message || "後端錯誤");
        return data;
    }
};

// 所有寫入都先存進本機佇列再依序送出：離線時不會遺失，恢復連線後自動補送
const Queue = {
    flushing: null,
    needsResync: false,

    key() { return "vocab_queue_" + S.user; },
    items() { return lsGet(Queue.key(), []); },
    save(items) { lsSet(Queue.key(), items); Queue.updateBadge(); },
    size() { return S.user ? Queue.items().length : 0; },

    push(action, payload) {
        const items = Queue.items();
        items.push({ qid: uid(), action, payload, at: Date.now() });
        Queue.save(items);
        Queue.flush();
    },

    flush() {
        if (Queue.flushing) return Queue.flushing;
        Queue.flushing = Queue._run().finally(() => { Queue.flushing = null; Queue.updateBadge(); });
        return Queue.flushing;
    },

    async _run() {
        if (!S.user) return;
        while (true) {
            const items = Queue.items();
            if (!items.length) break;
            if (!navigator.onLine) break;
            const item = items[0];
            try {
                await Api.call(item.action, item.payload);
            } catch (e) {
                if (!(e instanceof ServerError)) break; // 網路問題：保留，之後重送
                console.error("後端拒絕操作", item, e);
                showToast(`同步失敗：${e.message}`, "error", 5000);
                Queue.needsResync = true;
            }
            // 成功或被後端拒絕：只移除這一筆
            Queue.save(Queue.items().filter(x => x.qid !== item.qid));
        }
        if (Queue.needsResync && !Queue.items().length) {
            Queue.needsResync = false;
            Sync.run({ full: true, quiet: true });
        }
    },

    updateBadge() {
        const chip = $("sync-chip");
        if (!chip || !S.user) return;
        const n = Queue.items().length;
        const offline = !navigator.onLine;
        chip.hidden = n === 0 && !offline;
        chip.classList.toggle("offline", offline);
        chip.innerHTML = offline
            ? `<i class="icon-wifi-off"></i> 離線${n ? ` · ${n}` : ""}`
            : `<i class="icon-cloud-upload"></i> ${n}`;
        chip.title = n ? `${n} 筆修改等待同步` : "目前離線";
    }
};

window.addEventListener("online", () => { Queue.updateBadge(); Queue.flush(); });
window.addEventListener("offline", () => Queue.updateBadge());
setInterval(() => { if (S.user && Queue.size()) Queue.flush(); }, 30000);
