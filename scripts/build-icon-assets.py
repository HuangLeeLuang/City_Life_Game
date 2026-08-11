from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "icons"
SOURCE = ICON_DIR / "icon-master.png"
OUTPUTS = {
    "icon-512.png": 512,
    "icon-maskable-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
    "favicon-32.png": 32,
}


source = Image.open(SOURCE).convert("RGB")
if source.size != (1024, 1024):
    raise SystemExit(f"icon-master.png must be 1024x1024, got {source.size}")

for filename, size in OUTPUTS.items():
    image = source.resize((size, size), Image.Resampling.LANCZOS)
    if size == 32:
        image = ImageEnhance.Contrast(image).enhance(1.12)
        image = image.filter(ImageFilter.UnsharpMask(radius=0.7, percent=135, threshold=2))
    image.save(ICON_DIR / filename, format="PNG", optimize=True)
