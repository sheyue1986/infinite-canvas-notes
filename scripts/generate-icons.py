from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LAUNCHER = ROOT / "portable-launcher"


def cubic(p0, p1, p2, p3, steps=60):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
        ))
    return points


def make_icon(size=512):
    scale = size / 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    box = tuple(round(value * scale) for value in (4, 4, 60, 60))
    draw.rounded_rectangle(box, radius=round(14 * scale), fill="#6965DB")

    points = []
    segments = [
        ((14, 32), (19, 21), (25, 21), (32, 32)),
        ((32, 32), (39, 43), (45, 43), (50, 32)),
        ((50, 32), (45, 21), (39, 21), (32, 32)),
        ((32, 32), (25, 43), (19, 43), (14, 32)),
    ]
    for segment in segments:
        points.extend(cubic(*segment))
    scaled = [(round(x * scale), round(y * scale)) for x, y in points]
    draw.line(scaled, fill="white", width=max(2, round(5 * scale)), joint="curve")

    node = tuple(round(value * scale) for value in (46, 14, 55, 23))
    draw.rounded_rectangle(node, radius=max(1, round(2.5 * scale)), fill="white")
    inset = max(1, round(2 * scale))
    inner = (node[0] + inset, node[1] + inset, node[2] - inset, node[3] - inset)
    draw.rounded_rectangle(inner, radius=max(1, round(scale)), fill="#FF826F")
    return image


PUBLIC.mkdir(parents=True, exist_ok=True)
LAUNCHER.mkdir(parents=True, exist_ok=True)
icon = make_icon()
icon.resize((512, 512), Image.Resampling.LANCZOS).save(PUBLIC / "icon-512.png")
icon.resize((192, 192), Image.Resampling.LANCZOS).save(PUBLIC / "icon-192.png")
icon.resize((32, 32), Image.Resampling.LANCZOS).save(PUBLIC / "icon-32.png")
icon.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
icon.save(LAUNCHER / "app-icon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
