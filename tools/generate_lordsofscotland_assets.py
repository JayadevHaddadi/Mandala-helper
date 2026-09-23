#!/usr/bin/env python3
"""
Generate release-ready metadata branding assets for Lords of Scotland per BGA specifications.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "games", "lordsofscotland", "bga", "metadata_assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_box():
    img = Image.new("RGBA", (280, 280), (0, 0, 0, 0))

    # Shadow
    shadow = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((35, 30, 245, 250), radius=16, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    img.paste(shadow, (0, 0), shadow)

    draw = ImageDraw.Draw(img)
    # 3D Box front: Scottish Royal Navy / Tartan blue
    draw.rounded_rectangle((35, 25, 245, 245), radius=14, fill=(20, 38, 70, 255), outline=(212, 175, 55, 255), width=3)
    draw.rounded_rectangle((42, 32, 238, 238), radius=10, fill=(15, 28, 52, 255), outline=(180, 140, 30, 180), width=1)

    # Scottish Saltire cross motif inside shield/box
    draw.line([(50, 40), (230, 230)], fill=(255, 255, 255, 40), width=8)
    draw.line([(230, 40), (50, 230)], fill=(255, 255, 255, 40), width=8)

    # Lion Rampant / Crown motif
    try:
        title_font = ImageFont.truetype("georgia.ttf", 20)
        bold_font = ImageFont.truetype("georgia.ttf", 24)
        sub_font = ImageFont.truetype("arial.ttf", 11)
    except:
        title_font = ImageFont.load_default()
        bold_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    t1 = "LORDS OF"
    b1 = draw.textbbox((0, 0), t1, font=title_font)
    draw.text((140 - (b1[2]-b1[0])/2, 70), t1, font=title_font, fill=(212, 175, 55))

    t2 = "SCOTLAND"
    b2 = draw.textbbox((0, 0), t2, font=bold_font)
    draw.text((140 - (b2[2]-b2[0])/2, 95), t2, font=bold_font, fill=(255, 230, 140))

    # Crossed broadswords emblem in center
    draw.line([(105, 145), (175, 185)], fill=(220, 220, 230), width=3)
    draw.line([(175, 145), (105, 185)], fill=(220, 220, 230), width=3)
    draw.ellipse((135, 160, 145, 170), fill=(212, 175, 55))

    author = "BY RICHARD SIVÉL"
    b3 = draw.textbbox((0, 0), author, font=sub_font)
    draw.text((140 - (b3[2]-b3[0])/2, 205), author, font=sub_font, fill=(180, 195, 220))

    box_path = os.path.join(OUTPUT_DIR, "box_280x280.png")
    img.save(box_path, "PNG")
    print(f"Generated {box_path}")

def generate_icon():
    for size, filename in [(50, "icon_50x50.png"), (500, "icon_500x500.png")]:
        img = Image.new("RGBA", (size, size), (15, 28, 52, 255))
        draw = ImageDraw.Draw(img)

        # Gold shield outline
        pad = int(size * 0.08)
        draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=max(2, int(size * 0.12)), outline=(212, 175, 55, 255), width=max(1, int(size * 0.05)))

        # Thistle / Crown icon or S
        font_size = int(size * 0.55)
        try:
            font = ImageFont.truetype("georgia.ttf", font_size)
        except:
            font = ImageFont.load_default()
        text = "S"
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((size/2 - w/2, size/2 - h/2 - size*0.05), text, font=font, fill=(245, 220, 110, 255))

        out_path = os.path.join(OUTPUT_DIR, filename)
        img.save(out_path, "PNG")
        print(f"Generated {out_path}")

def generate_banner():
    w, h = 1920, 556
    img = Image.new("RGB", (w, h), (14, 22, 38))
    draw = ImageDraw.Draw(img)

    # Scottish Saltire backdrop
    draw.line([(0, 0), (w, h)], fill=(20, 35, 65), width=45)
    draw.line([(w, 0), (0, h)], fill=(20, 35, 65), width=45)

    # Vignette
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for x in range(0, 400):
        alpha = int((1.0 - x / 400.0) * 190)
        odraw.line([(x, 0), (x, h)], fill=(10, 15, 25, alpha))
        odraw.line([(w - x, 0), (w - x, h)], fill=(10, 15, 25, alpha))
    img.paste(Image.composite(Image.new("RGB", (w, h), (10, 15, 25)), img, overlay.split()[3]))

    # Title Typography
    draw = ImageDraw.Draw(img)
    try:
        main_font = ImageFont.truetype("georgia.ttf", 92)
        sub_font = ImageFont.truetype("georgia.ttf", 26)
    except:
        main_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    title_text = "LORDS OF SCOTLAND"
    t_bbox = draw.textbbox((0, 0), title_text, font=main_font)
    tw = t_bbox[2] - t_bbox[0]
    draw.text((w/2 - tw/2, 175), title_text, font=main_font, fill=(245, 215, 110))

    subtitle = "A GAME OF CLAN RIVALRY AND BATTLEFIELD INTRIGUE BY RICHARD SIVÉL"
    s_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sw = s_bbox[2] - s_bbox[0]
    draw.text((w/2 - sw/2, 290), subtitle, font=sub_font, fill=(190, 205, 225))

    banner_path = os.path.join(OUTPUT_DIR, "banner_1920x556.jpg")
    img.save(banner_path, "JPEG", quality=92)
    print(f"Generated {banner_path}")

def generate_publisher():
    # 280x280 transparent PNG for Z-Man Games
    img = Image.new("RGBA", (280, 280), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Z-Man style shield/disc
    draw.ellipse((35, 35, 245, 245), fill=(240, 240, 245, 255), outline=(30, 30, 40, 255), width=4)
    draw.ellipse((45, 45, 235, 235), outline=(200, 20, 30, 255), width=3)

    try:
        z_font = ImageFont.truetype("arial.ttf", 100)
        sub_font = ImageFont.truetype("arial.ttf", 20)
    except:
        z_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    zb = draw.textbbox((0, 0), "Z-MAN", font=z_font)
    zw = zb[2] - zb[0]
    # Draw stylized Z
    draw.text((140 - zw/2, 70), "Z", font=z_font, fill=(200, 20, 30))

    games_text = "Z-MAN GAMES"
    gb = draw.textbbox((0, 0), games_text, font=sub_font)
    gw = gb[2] - gb[0]
    draw.text((140 - gw/2, 185), games_text, font=sub_font, fill=(20, 20, 30))

    pub_path = os.path.join(OUTPUT_DIR, "publisher_280x280.png")
    img.save(pub_path, "PNG")
    print(f"Generated {pub_path}")

if __name__ == "__main__":
    generate_box()
    generate_icon()
    generate_banner()
    generate_publisher()
    print("All Lords of Scotland metadata assets generated successfully!")
