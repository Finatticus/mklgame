"""把襯線字型裁成只含介面用到的字，讓字型檔夠小、可離線使用。
介面文字有增減後請重跑：  python tools/build_fonts.py <NotoSerifTC.ttf> <CormorantGaramond.ttf>
（原始字型取自 Google Fonts，SIL OFL 授權；未收錄的字會退回系統字型。）"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')


def used_chars():
    chars = set()
    files = [os.path.join(ROOT, 'index.html')]
    for pat in ('js/**/*.js', 'css/*.css'):
        files += glob.glob(os.path.join(ROOT, pat), recursive=True)
    for f in files:
        with open(f, encoding='utf-8') as fh:
            chars.update(fh.read())
    # 常用補充：數字、標點與玩家可能看到的動態字
    chars.update('0123456789，。、：；！？「」（）／·…—−＋×%零一二三四五六七八九十百千萬億年月日時分秒天前後今昨明')
    return ''.join(sorted(c for c in chars if ord(c) > 0x2E7F or c in '，。、：；！？「」（）／·…—−＋×'))


def build(src, dst, text=None, unicodes=None):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = [1, 2]
    opts.notdef_outline = True
    font = TTFont(src)
    sub = subset.Subsetter(opts)
    sub.populate(text=text or '', unicodes=unicodes or [])
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(dst)
    print(os.path.basename(dst), os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    cjk, latin = sys.argv[1], sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    text = used_chars()
    print(len(text), 'CJK glyphs')
    build(cjk, os.path.join(OUT, 'serif-tc.woff2'), text=text)
    build(latin, os.path.join(OUT, 'latin.woff2'), unicodes=list(range(0x20, 0x7F)) + [0xA0, 0xB7, 0xD7, 0x2013, 0x2014, 0x2212, 0x2026])
