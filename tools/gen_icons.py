#!/usr/bin/env python3
# 生成扩展图标（16/32/48/128）。使用 Pillow，若系统缺字体则回退到默认字体。
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "icons")
os.makedirs(OUT, exist_ok=True)

SIZES = [16, 32, 48, 128]
TOP = (99, 102, 241)     # #6366f1
BOTTOM = (139, 92, 246)  # #8b5cf6


def find_font(size, bold_latin=True, cjk=False):
    candidates = []
    if cjk:
        candidates += [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/Supplemental/Songti.ttc",
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        ]
    if bold_latin:
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNS.ttf",
        ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make(size):
    scale = size / 128.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # 渐变背景
    for y in range(size):
        t = y / max(size - 1, 1)
        c = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        ImageDraw.Draw(img).line([(0, y), (size, y)], fill=c + (255,))

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    r = int(28 * scale)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    img.putalpha(mask)

    d = ImageDraw.Draw(img)

    # 中央大问号
    q_size = int(74 * scale)
    fq = find_font(q_size, bold_latin=True)
    q = "?"
    bbox = d.textbbox((0, 0), q, font=fq)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    # 向上偏一点，给右下角徽章留空间
    cx = (size - w) / 2 - bbox[0] - int(4 * scale)
    cy = (size - h) / 2 - bbox[1] - int(10 * scale)
    d.text((cx, cy), q, font=fq, fill=(255, 255, 255, 255))

    # 右下角小徽章：优先写“译”，否则写“T”
    badge_r = int(26 * scale)
    bx0 = size - badge_r * 2 - int(6 * scale)
    by0 = size - badge_r * 2 - int(6 * scale)
    bx1 = size - int(6 * scale)
    by1 = size - int(6 * scale)
    d.ellipse([bx0, by0, bx1, by1], fill=(255, 255, 255, 255))

    t = "译"
    ft = find_font(int(30 * scale), bold_latin=False, cjk=True)
    tb = d.textbbox((0, 0), t, font=ft)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    tx = (bx0 + bx1) / 2 - tw / 2 - tb[0]
    ty = (by0 + by1) / 2 - th / 2 - tb[1]
    d.text((tx, ty), t, font=ft, fill=TOP)

    return img


for s in SIZES:
    im = make(s)
    out = os.path.join(OUT, "icon%d.png" % s)
    im.save(out)
    print("wrote", out, im.size)
print("done")
