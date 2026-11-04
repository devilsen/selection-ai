#!/usr/bin/env python3
# 生成 Chrome 商店推广图（440x280 小图 / 920x680 大图 / 1400x560 宽横幅）
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "store-assets")
os.makedirs(OUT, exist_ok=True)

TOP = (99, 102, 241)
BOTTOM = (139, 92, 246)


def font(size, cjk=False):
    cands = []
    if cjk:
        cands += [
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/STHeiti Medium.ttc",
        ]
    cands += [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def gradient(w, h):
    img = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=c + (255,))
    return img


def center_text(d, cx, cy, text, f, fill):
    bbox = d.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    d.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), text, font=f, fill=fill)


def make(w, h, name):
    base = min(w, h)
    img = gradient(w, h)
    d = ImageDraw.Draw(img)
    ft = font(int(base * 0.16))
    fs = font(int(base * 0.08))
    fc = font(int(base * 0.062), cjk=True)
    center_text(d, w / 2, h * 0.34, "Selection AI", ft, (255, 255, 255, 255))
    center_text(d, w / 2, h * 0.58, "Select  \u00b7  Explain  \u00b7  Translate", fs, (255, 255, 255, 232))
    center_text(d, w / 2, h * 0.78, "\u5212\u8bcd AI \u52a9\u624b \u00b7 \u9009\u4e2d\u5373\u89e3\u91ca/\u7ffb\u8bd1", fc, (255, 255, 255, 220))
    out = os.path.join(OUT, name)
    img.convert("RGB").save(out, "PNG")
    print("wrote", out, (w, h))


make(440, 280, "small-tile-440x280.png")
make(920, 680, "large-tile-920x680.png")
make(1400, 560, "marquee-1400x560.png")
print("done")
