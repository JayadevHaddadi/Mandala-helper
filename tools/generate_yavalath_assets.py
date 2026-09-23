#!/usr/bin/env python3
"""
Generate release-ready metadata assets for Yavalath (Cameron Browne / nestorgames) per BGA specifications.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "games", "yavalath", "bga", "metadata_assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_hexagon(draw, center, radius, fill, outline, width=2):
    cx, cy = center
    points = []
    for i in range(6):
        angle_deg = 60 * i - 30
        angle_rad = math.radians(angle_deg)
        x = cx + radius * math.cos(angle_rad)
        y = cy + radius * math.sin(angle_rad)
        points.append((x, y))
    draw.polygon(points, fill=fill, outline=outline, width=width)

def generate_box():
    # 280x280 RGBA transparent
    img = Image.new("RGBA", (280, 280), (0, 0, 0, 0))

    # Shadow
    shadow = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse((35, 45, 245, 255), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    img.paste(shadow, (0, 0), shadow)

    draw = ImageDraw.Draw(img)
    # Slate/Stone disc
    for r in range(105, 0, -1):
        ratio = r / 105.0
        val = int(32 + (1.0 - ratio) * 40)
        draw.ellipse((140 - r, 140 - r, 140 + r, 140 + r), fill=(val, val + 2, val + 5, 255))

    # Outer border: emerald / cyan
    draw.ellipse((35, 35, 245, 245), outline=(46, 175, 125, 240), width=4)
    draw.ellipse((42, 42, 238, 238), outline=(80, 210, 160, 180), width=2)

    # 4 connected dots (representing 4 in a row)
    for idx, dy in enumerate([-45, -15, 15, 45]):
        draw.ellipse((140 - 12, 140 + dy - 12, 140 + 12, 140 + dy + 12), fill=(245, 245, 245), outline=(46, 175, 125), width=2)

    # Title "YAVALATH"
    try:
        font = ImageFont.truetype("arial.ttf", 26)
        sub_font = ImageFont.truetype("arial.ttf", 13)
    except:
        font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    t_bbox = draw.textbbox((0, 0), "YAVALATH", font=font)
    tw = t_bbox[2] - t_bbox[0]
    draw.text((140 - tw/2, 60), "YAVALATH", font=font, fill=(255, 255, 255))

    credit = "BROWNE & LUDI"
    c_bbox = draw.textbbox((0, 0), credit, font=sub_font)
    cw = c_bbox[2] - c_bbox[0]
    draw.text((140 - cw/2, 202), credit, font=sub_font, fill=(180, 220, 200))

    box_path = os.path.join(OUTPUT_DIR, "box_280x280.png")
    img.save(box_path, "PNG")
    print(f"Generated {box_path}")

def generate_icon():
    for size, filename in [(50, "icon_50x50.png"), (500, "icon_500x500.png")]:
        img = Image.new("RGBA", (size, size), (22, 28, 25, 255))
        draw = ImageDraw.Draw(img)

        pad = size * 0.08
        draw_hexagon(draw, (size / 2, size / 2), size / 2 - pad, fill=(30, 42, 36, 255), outline=(46, 175, 125, 255), width=max(1, int(size * 0.04)))

        # Letter Y
        font_size = int(size * 0.55)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        text = "Y"
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((size/2 - w/2, size/2 - h/2 - size*0.04), text, font=font, fill=(80, 220, 160, 255))

        out_path = os.path.join(OUTPUT_DIR, filename)
        img.save(out_path, "PNG")
        print(f"Generated {out_path}")

def generate_banner():
    w, h = 1920, 556
    img = Image.new("RGB", (w, h), (18, 24, 22))
    draw = ImageDraw.Draw(img)

    # Subtle hex pattern background
    hex_size = 42
    for q in range(-15, 35):
        for r in range(-6, 12):
            cx = 400 + hex_size * (math.sqrt(3) * q + (math.sqrt(3)/2) * r)
            cy = 278 + hex_size * (1.5 * r)
            if -80 <= cx <= w + 80 and -80 <= cy <= h + 80:
                dist = math.hypot(cx - w/2, cy - h/2)
                alpha_factor = max(0.1, 1.0 - dist / 1100.0)
                outline_color = (int(30 * alpha_factor), int(55 * alpha_factor), int(45 * alpha_factor))
                fill_color = (int(20 * alpha_factor), int(32 * alpha_factor), int(26 * alpha_factor))
                draw_hexagon(draw, (cx, cy), hex_size - 3, fill=fill_color, outline=outline_color, width=1)

    # 4 in a row visual on left
    for i in range(4):
        x = 280 + i * 55
        y = 278
        draw.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(245, 245, 250), outline=(46, 175, 125), width=3)

    # 3 in a row visual on right (warning/cross)
    for i in range(3):
        x = 1500 + i * 55
        y = 278
        draw.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(35, 35, 40), outline=(215, 45, 40), width=3)

    try:
        title_font = ImageFont.truetype("arial.ttf", 98)
        sub_font = ImageFont.truetype("arial.ttf", 26)
    except:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    title_text = "YAVALATH"
    t_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    tw = t_bbox[2] - t_bbox[0]
    draw.text((w/2 - tw/2, 170), title_text, font=title_font, fill=(70, 220, 160))

    subtitle = "INVENTED BY CAMERON BROWNE & LUDI • PUBLISHED BY NESTORGAMES"
    s_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sw = s_bbox[2] - s_bbox[0]
    draw.text((w/2 - sw/2, 290), subtitle, font=sub_font, fill=(180, 205, 195))

    rule_desc = "Connect 4 to WIN — Avoid 3 in a row!"
    r_bbox = draw.textbbox((0, 0), rule_desc, font=sub_font)
    rw = r_bbox[2] - r_bbox[0]
    draw.text((w/2 - rw/2, 335), rule_desc, font=sub_font, fill=(230, 230, 230))

    banner_path = os.path.join(OUTPUT_DIR, "banner_1920x556.jpg")
    img.save(banner_path, "JPEG", quality=92)
    print(f"Generated {banner_path}")

def copy_publisher():
    # Copy nestorgames publisher logo from omega
    src = os.path.join(os.path.dirname(__file__), "..", "games", "omega", "bga", "metadata_assets", "publisher_280x280.png")
    dst = os.path.join(OUTPUT_DIR, "publisher_280x280.png")
    if os.path.exists(src):
        with open(src, "rb") as f_in, open(dst, "wb") as f_out:
            f_out.write(f_in.read())
        print(f"Copied publisher logo to {dst}")

if __name__ == "__main__":
    generate_box()
    generate_icon()
    generate_banner()
    copy_publisher()
    print("All Yavalath metadata assets generated successfully!")
