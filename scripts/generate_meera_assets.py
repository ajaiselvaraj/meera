import math
import os
from PIL import Image, ImageDraw, ImageFilter

def create_meera_logo(size=512):
    # High resolution super-sampling for pristine anti-aliasing
    scale = 2
    actual_size = size * scale
    img = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = actual_size * 0.08
    box = [pad, pad, actual_size - pad, actual_size - pad]
    radius = actual_size * 0.22

    # Squircle background with deep obsidian / indigo gradient
    bg = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    bg_draw.rounded_rectangle(box, radius=radius, fill=(13, 17, 28, 255))
    
    # Layer subtle inner gradient
    for i in range(int(actual_size - 2 * pad)):
        t = i / (actual_size - 2 * pad)
        r = int(14 + (28 - 14) * t)
        g = int(18 + (24 - 18) * t)
        b = int(36 + (75 - 36) * t)
        # horizontal gradient slice masked by squircle
    
    # Draw soft back-glow for the ribbon
    glow = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    center_x = actual_size / 2
    center_y = actual_size / 2
    glow_radius = actual_size * 0.28
    glow_draw.ellipse(
        [center_x - glow_radius, center_y - glow_radius * 0.8, center_x + glow_radius, center_y + glow_radius * 0.8],
        fill=(99, 102, 241, 70)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(actual_size * 0.08))
    img.paste(glow, (0, 0), glow)

    # Base squircle
    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)

    # Glass specular border on the squircle
    draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 38), width=int(scale * 1.5))
    inner_box = [box[0] + scale * 2, box[1] + scale * 2, box[2] - scale * 2, box[3] - scale * 2]
    draw.rounded_rectangle(inner_box, radius=radius - scale * 2, outline=(99, 102, 241, 50), width=int(scale))

    # Draw MEERA's signature 'M' ribbon:
    # 2 smooth arches that sweep from bottom left, curve up, plunge into center, curve up to second peak, and flow down.
    # We sample a smooth parametric curve and draw layered gradient discs with glowing trail.
    steps = 400
    points = []
    
    # Parametric curve for modern M ribbon:
    # x goes from 0.28 to 0.72
    # peak 1 at 0.38, valley at 0.50, peak 2 at 0.62
    width_span = actual_size * 0.44
    x_start = actual_size * 0.28
    y_base = actual_size * 0.68
    y_peak = actual_size * 0.33
    y_valley = actual_size * 0.54
    
    ribbon_width = actual_size * 0.075

    # Draw glowing underlayer
    ribbon_layer = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    ribbon_draw = ImageDraw.Draw(ribbon_layer)

    for i in range(steps):
        t = i / (steps - 1)
        x = x_start + t * width_span
        
        # Smooth dual-sine curve
        if t < 0.5:
            # First arch (0.0 to 0.5)
            u = t * 2.0  # 0 to 1
            # sine arch shaped like a bell
            arch = math.sin(u * math.pi)
            y = y_base - (y_base - y_peak) * arch + (y_valley - y_peak) * (u ** 3) * 0.5
            if u > 0.7:
                # descend into valley
                val_t = (u - 0.7) / 0.3
                y = (1 - val_t) * y + val_t * y_valley
        else:
            # Second arch (0.5 to 1.0)
            u = (t - 0.5) * 2.0  # 0 to 1
            arch = math.sin(u * math.pi)
            y = y_base - (y_base - y_peak) * arch + (y_valley - y_peak) * ((1 - u) ** 3) * 0.5
            if u < 0.3:
                val_t = u / 0.3
                y = (1 - val_t) * y_valley + val_t * y

        points.append((x, y))

    # Color gradient across ribbon:
    # cyan (6, 182, 212) -> indigo (99, 102, 241) -> violet (168, 85, 247) -> rose (244, 63, 94)
    def get_color(t, alpha=255):
        if t < 0.33:
            p = t / 0.33
            r = int(6 + (99 - 6) * p)
            g = int(182 + (102 - 182) * p)
            b = int(212 + (241 - 212) * p)
        elif t < 0.66:
            p = (t - 0.33) / 0.33
            r = int(99 + (168 - 99) * p)
            g = int(102 + (85 - 102) * p)
            b = int(241 + (247 - 241) * p)
        else:
            p = (t - 0.66) / 0.34
            r = int(168 + (244 - 168) * p)
            g = int(85 + (63 - 85) * p)
            b = int(247 + (94 - 247) * p)
        return (r, g, b, alpha)

    # Draw soft ribbon glow
    for i, (x, y) in enumerate(points):
        t = i / len(points)
        c = get_color(t, alpha=50)
        r = ribbon_width * 1.4
        ribbon_draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

    ribbon_layer = ribbon_layer.filter(ImageFilter.GaussianBlur(scale * 8))
    img = Image.alpha_composite(img, ribbon_layer)

    # Draw solid sharp ribbon with core highlight
    sharp_layer = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    sharp_draw = ImageDraw.Draw(sharp_layer)
    for i, (x, y) in enumerate(points):
        t = i / len(points)
        c = get_color(t, alpha=255)
        r = ribbon_width * 0.75
        sharp_draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

    # Center core highlight (subtle white gleam along spine)
    for i in range(0, len(points), 2):
        t = i / len(points)
        x, y = points[i]
        c = (255, 255, 255, int(140 * (1 - abs(t - 0.5) * 1.5)))
        r = ribbon_width * 0.22
        sharp_draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

    # Luminous companion orbital dot at top-right
    dot_x = actual_size * 0.69
    dot_y = actual_size * 0.31
    dot_r = actual_size * 0.038
    sharp_draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(255, 255, 255, 250))
    sharp_draw.ellipse([dot_x - dot_r*1.8, dot_y - dot_r*1.8, dot_x + dot_r*1.8, dot_y + dot_r*1.8], outline=(168, 85, 247, 100), width=int(scale * 2))

    img = Image.alpha_composite(img, sharp_layer)

    # Downsample with high-quality Lanczos resampling
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def generate_svg():
    svg_content = '''<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="meera-bg" x1="40" y1="40" x2="472" y2="472" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0d111c" />
      <stop offset="50%" stop-color="#141829" />
      <stop offset="100%" stop-color="#1c1c38" />
    </linearGradient>
    <linearGradient id="meera-ribbon" x1="140" y1="340" x2="370" y2="170" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="35%" stop-color="#6366f1" />
      <stop offset="70%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <filter id="glow" x="100" y="120" width="312" height="260" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="16" result="blur" />
    </filter>
  </defs>
  <!-- Squircle Base -->
  <rect x="40" y="40" width="432" height="432" rx="96" fill="url(#meera-bg)" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <rect x="42" y="42" width="428" height="428" rx="94" stroke="rgba(99,102,241,0.2)" stroke-width="1.5"/>

  <!-- Glow underlayer -->
  <path d="M 145 350 C 145 220, 205 170, 256 270 C 307 170, 367 220, 367 350" 
        stroke="url(#meera-ribbon)" stroke-width="48" stroke-linecap="round" fill="none" opacity="0.35" filter="url(#glow)"/>

  <!-- Fluid MEERA Ribbon 'M' -->
  <path d="M 145 350 C 145 220, 205 170, 256 270 C 307 170, 367 220, 367 350" 
        stroke="url(#meera-ribbon)" stroke-width="36" stroke-linecap="round" fill="none"/>

  <!-- Specular spine -->
  <path d="M 155 330 C 160 230, 215 190, 256 270 C 297 190, 352 230, 357 330" 
        stroke="rgba(255,255,255,0.45)" stroke-width="8" stroke-linecap="round" fill="none"/>

  <!-- Orbital Companion Star -->
  <circle cx="355" cy="160" r="16" fill="white" />
  <circle cx="355" cy="160" r="24" stroke="rgba(168,85,247,0.5)" stroke-width="3" fill="none" />
</svg>'''
    return svg_content

def main():
    print("Generating MEERA brand assets...")
    
    # 1. Generate SVG
    svg_str = generate_svg()
    with open("public/meera.svg", "w", encoding="utf-8") as f:
        f.write(svg_str)
    print("Saved public/meera.svg")

    # 2. Master high-res image
    master_1024 = create_meera_logo(1024)
    master_512 = master_1024.resize((512, 512), Image.Resampling.LANCZOS)
    master_256 = master_1024.resize((256, 256), Image.Resampling.LANCZOS)
    master_128 = master_1024.resize((128, 128), Image.Resampling.LANCZOS)
    master_64 = master_1024.resize((64, 64), Image.Resampling.LANCZOS)
    master_48 = master_1024.resize((48, 48), Image.Resampling.LANCZOS)
    master_32 = master_1024.resize((32, 32), Image.Resampling.LANCZOS)
    master_16 = master_1024.resize((16, 16), Image.Resampling.LANCZOS)

    # Save to public/
    master_512.save("public/meera.png")
    master_128.save("public/meera-128.png")
    master_64.save("public/meera-64.png")
    master_32.save("public/meera-32.png")
    print("Saved public/meera.png and sized assets")

    # Save to src-tauri/icons/
    os.makedirs("src-tauri/icons", exist_ok=True)
    master_1024.save("src-tauri/icons/1024x1024.png")
    master_512.save("src-tauri/icons/512x512.png")
    master_512.save("src-tauri/icons/icon.png")
    master_256.save("src-tauri/icons/256x256.png")
    master_128.save("src-tauri/icons/128x128.png")
    master_256.save("src-tauri/icons/128x128@2x.png")
    master_64.save("src-tauri/icons/64x64.png")
    master_32.save("src-tauri/icons/32x32.png")
    master_64.save("src-tauri/icons/32x32@2x.png")

    # Windows Store & square logos
    master_128.resize((107, 107), Image.Resampling.LANCZOS).save("src-tauri/icons/Square107x107Logo.png")
    master_256.resize((142, 142), Image.Resampling.LANCZOS).save("src-tauri/icons/Square142x142Logo.png")
    master_256.resize((150, 150), Image.Resampling.LANCZOS).save("src-tauri/icons/Square150x150Logo.png")
    master_512.resize((284, 284), Image.Resampling.LANCZOS).save("src-tauri/icons/Square284x284Logo.png")
    master_512.resize((310, 310), Image.Resampling.LANCZOS).save("src-tauri/icons/Square310x310Logo.png")
    master_64.resize((30, 30), Image.Resampling.LANCZOS).save("src-tauri/icons/Square30x30Logo.png")
    master_64.resize((44, 44), Image.Resampling.LANCZOS).save("src-tauri/icons/Square44x44Logo.png")
    master_128.resize((71, 71), Image.Resampling.LANCZOS).save("src-tauri/icons/Square71x71Logo.png")
    master_128.resize((89, 89), Image.Resampling.LANCZOS).save("src-tauri/icons/Square89x89Logo.png")
    master_64.resize((50, 50), Image.Resampling.LANCZOS).save("src-tauri/icons/StoreLogo.png")

    # Save Windows Multi-Resolution .ICO
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master_1024.save("src-tauri/icons/icon.ico", format="ICO", sizes=ico_sizes)
    print("Saved src-tauri/icons/icon.ico with multi-resolution bitmaps")

if __name__ == "__main__":
    main()
