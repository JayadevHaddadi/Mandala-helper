#!/usr/bin/env python3
"""
Generate release-ready metadata assets for Omega (nestorgames) per BGA specifications.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "games", "omega", "bga", "metadata_assets")
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
    # 280x280 RGBA with transparent background
    img = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Soft shadow
    shadow = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse((35, 45, 245, 255), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    img.paste(shadow, (0, 0), shadow)

    # 3D Emblem Disc / Case (nestorgames style)
    # Gradient disc: dark graphite / carbon
    for r in range(105, 0, -1):
        alpha = 255
        ratio = r / 105.0
        # Dark slate gradient
        val = int(28 + (1.0 - ratio) * 45)
        draw.ellipse((140 - r, 140 - r, 140 + r, 140 + r), fill=(val, val + 2, val + 6, alpha))

    # Metallic gold outer rim
    draw.ellipse((35, 35, 245, 245), outline=(212, 175, 55, 230), width=4)
    draw.ellipse((42, 42, 238, 238), outline=(240, 215, 120, 180), width=2)

    # Hex ring inside disc
    for i in range(6):
        angle = math.radians(60 * i)
        hx = 140 + 65 * math.cos(angle)
        hy = 140 + 65 * math.sin(angle)
        draw_hexagon(draw, (hx, hy), 12, fill=(45, 48, 55, 200), outline=(212, 175, 55, 140), width=1)

    # White and black mini stone dots
    draw.ellipse((140 - 65 - 6, 140 - 6, 140 - 65 + 6, 140 + 6), fill=(245, 245, 245, 255), outline=(120, 120, 120, 255))
    draw.ellipse((140 + 65 - 6, 140 - 6, 140 + 65 + 6, 140 + 6), fill=(20, 20, 20, 255), outline=(60, 60, 60, 255))

    # Draw Omega symbol Ω
    try:
        font = ImageFont.truetype("arial.ttf", 96)
    except:
        font = ImageFont.load_default()

    text = "Ω"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    # Gold drop shadow for text
    draw.text((140 - w/2 + 2, 134 - h/2 + 2), text, font=font, fill=(100, 75, 10, 220))
    draw.text((140 - w/2, 134 - h/2), text, font=font, fill=(245, 220, 110, 255))

    # "OMEGA" text below
    try:
        small_font = ImageFont.truetype("arial.ttf", 18)
    except:
        small_font = ImageFont.load_default()
    sub_bbox = draw.textbbox((0, 0), "OMEGA", font=small_font)
    sw = sub_bbox[2] - sub_bbox[0]
    draw.text((140 - sw/2, 192), "OMEGA", font=small_font, fill=(220, 220, 220, 230))

    box_path = os.path.join(OUTPUT_DIR, "box_280x280.png")
    img.save(box_path, "PNG")
    print(f"Generated {box_path}")

def generate_icon():
    # 50x50 PNG and 500x500 high-res
    for size, filename in [(50, "icon_50x50.png"), (500, "icon_500x500.png")]:
        img = Image.new("RGBA", (size, size), (24, 26, 32, 255))
        draw = ImageDraw.Draw(img)

        # Gold hex border
        pad = size * 0.08
        draw_hexagon(draw, (size / 2, size / 2), size / 2 - pad, fill=(35, 38, 46, 255), outline=(212, 175, 55, 255), width=max(1, int(size * 0.04)))

        # Omega text
        font_size = int(size * 0.52)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        text = "Ω"
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((size/2 - w/2, size/2 - h/2 - size*0.04), text, font=font, fill=(245, 220, 110, 255))

        out_path = os.path.join(OUTPUT_DIR, filename)
        img.save(out_path, "PNG")
        print(f"Generated {out_path}")

def generate_banner():
    # 1920x556 JPG
    w, h = 1920, 556
    img = Image.new("RGB", (w, h), (22, 24, 28))
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
                outline_color = (int(45 * alpha_factor), int(50 * alpha_factor), int(60 * alpha_factor))
                fill_color = (int(26 * alpha_factor), int(28 * alpha_factor), int(34 * alpha_factor))
                draw_hexagon(draw, (cx, cy), hex_size - 3, fill=fill_color, outline=outline_color, width=1)

    # Left and Right clusters of glossy white and black stones
    stones = [
        # Left cluster
        (260, 220, 'white', 26), (310, 250, 'white', 26), (260, 280, 'white', 26),
        (360, 220, 'black', 26), (410, 250, 'black', 26), (360, 280, 'black', 26),
        # Right cluster
        (1600, 240, 'white', 26), (1650, 270, 'white', 26),
        (1550, 270, 'black', 26), (1600, 300, 'black', 26), (1650, 330, 'black', 26)
    ]
    for sx, sy, col, srad in stones:
        # Shadow
        draw.ellipse((sx - srad + 4, sy - srad + 6, sx + srad + 4, sy + srad + 6), fill=(10, 10, 12))
        if col == 'white':
            draw.ellipse((sx - srad, sy - srad, sx + srad, sy + srad), fill=(235, 235, 240), outline=(180, 180, 190), width=2)
            draw.ellipse((sx - srad*0.5, sy - srad*0.6, sx + srad*0.1, sy), fill=(255, 255, 255))
        else:
            draw.ellipse((sx - srad, sy - srad, sx + srad, sy + srad), fill=(28, 28, 32), outline=(50, 50, 60), width=2)
            draw.ellipse((sx - srad*0.5, sy - srad*0.6, sx + srad*0.1, sy), fill=(60, 60, 70))

    # Center Vignette overlay
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    # Darken edges
    for x in range(0, 350):
        alpha = int((1.0 - x / 350.0) * 180)
        odraw.line([(x, 0), (x, h)], fill=(15, 17, 20, alpha))
        odraw.line([(w - x, 0), (w - x, h)], fill=(15, 17, 20, alpha))
    img.paste(Image.composite(Image.new("RGB", (w, h), (15, 17, 20)), img, overlay.split()[3]))

    # Title Typography: OMEGA
    try:
        title_font = ImageFont.truetype("arial.ttf", 108)
        sub_font = ImageFont.truetype("arial.ttf", 28)
    except:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    draw = ImageDraw.Draw(img)
    title_text = "OMEGA"
    t_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    tw = t_bbox[2] - t_bbox[0]
    draw.text((w/2 - tw/2 + 3, 160 + 3), title_text, font=title_font, fill=(0, 0, 0))
    draw.text((w/2 - tw/2, 160), title_text, font=title_font, fill=(245, 220, 110))

    subtitle = "A GAME OF MATHEMATICAL HARMONY BY NÉSTOR ROMERAL ANDRÉS"
    s_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sw = s_bbox[2] - s_bbox[0]
    draw.text((w/2 - sw/2, 290), subtitle, font=sub_font, fill=(185, 190, 200))

    banner_path = os.path.join(OUTPUT_DIR, "banner_1920x556.jpg")
    img.save(banner_path, "JPEG", quality=92)
    print(f"Generated {banner_path}")

def generate_publisher():
    # 280x280 transparent PNG for nestorgames
    img = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Stylized nestorgames red/white circular logo
    draw.ellipse((30, 30, 250, 250), fill=(215, 45, 40, 255), outline=(160, 25, 20, 255), width=3)
    draw.ellipse((42, 42, 238, 238), outline=(255, 255, 255, 200), width=2)

    # N / nestorgames text
    try:
        n_font = ImageFont.truetype("arial.ttf", 110)
        sub_font = ImageFont.truetype("arial.ttf", 20)
    except:
        n_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    n_bbox = draw.textbbox((0, 0), "n", font=n_font)
    nw = n_bbox[2] - n_bbox[0]
    draw.text((140 - nw/2 - 2, 60), "n", font=n_font, fill=(255, 255, 255, 255))

    nestor_text = "nestorgames"
    sub_bbox = draw.textbbox((0, 0), nestor_text, font=sub_font)
    sw = sub_bbox[2] - sub_bbox[0]
    draw.text((140 - sw/2, 185), nestor_text, font=sub_font, fill=(255, 255, 255, 240))

    pub_path = os.path.join(OUTPUT_DIR, "publisher_280x280.png")
    img.save(pub_path, "PNG")
    print(f"Generated {pub_path}")

if __name__ == "__main__":
    generate_box()
    generate_icon()
    generate_banner()
    generate_publisher()
    print("All Omega metadata assets generated successfully!")
