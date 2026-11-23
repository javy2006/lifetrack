"""Builds the web assets for the four LifeTrack characters from the official references.

Source of truth: public/assets/characters/reference/{alex,mei-ling,daniel,aisyah}.jpg (2048x2048).
Outputs (small, committed, served by Vite from public/):
  portraits/<id>.webp  192x192  face + hair + headwear, for the HUD and the comparison table
  busts/<id>.webp      360x480  head to waist (no display pedestal), for character selection
  faces/<id>.jpg       256x256  face oval only, edges faded to the sampled skin tone; the
                                texture for the 3D board heads (Figure3D)
Prints each character's sampled skin tone so the 3D head material can match the texture.

Requires Pillow:  python -m pip install pillow ;  python scripts/assets/build_character_assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2] / 'public' / 'assets' / 'characters'
REF = ROOT / 'reference'
K = 2048 / 900  # crop boxes below were measured on 900 px previews

# id -> (file stem, portrait centre/size, face centre/size), all in 900 px units
CHARACTERS = {
    'alex':    ('alex',     (452, 140, 175), (452, 157, 86)),
    'meiling': ('mei-ling', (452, 150, 190), (452, 160, 88)),
    'daniel':  ('daniel',   (452, 135, 180), (452, 161, 84)),
    'aisyah':  ('aisyah',   (452, 145, 185), (452, 158, 86)),
}
BUST = (300, 50, 600, 450)  # x0, y0, x1, y1 (head to waist; the pedestal is far below)


def box(cx, cy, size):
    h = size / 2
    return tuple(int(round(v * K)) for v in (cx - h, cy - h, cx + h, cy + h))


def is_backdrop(p):
    """The studio backdrop is light and nearly grey/cream (low saturation)."""
    return min(p) > 170 and max(p) - min(p) < 40


def cutout(img):
    """Transparent background: grow the backdrop from light border pixels into similar light
    neighbours only, so the figure (including cream blouses enclosed by a jacket) is kept, then
    feather the edge slightly."""
    w, h = img.size
    px = img.load()
    bg = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    stack = [(x, y) for x, y in stack if is_backdrop(px[x, y])]
    for x, y in stack: bg[y * w + x] = 1
    while stack:
        x, y = stack.pop()
        p = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                q = px[nx, ny]
                if is_backdrop(q) and sum(abs(a - b) for a, b in zip(p, q)) < 18:
                    bg[ny * w + nx] = 1
                    stack.append((nx, ny))
    mask = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in bg))
    out = img.convert('RGBA')
    out.putalpha(mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0)))
    return out


def main():
    for sub in ('portraits', 'busts', 'faces'):
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    for cid, (stem, portrait, face) in CHARACTERS.items():
        im = Image.open(REF / f'{stem}.jpg').convert('RGB')
        im.crop(box(*portrait)).resize((192, 192), Image.LANCZOS).save(ROOT / 'portraits' / f'{cid}.webp', quality=82, method=6)
        cutout(im.crop(tuple(int(round(v * K)) for v in BUST)).resize((360, 480), Image.LANCZOS)).save(ROOT / 'busts' / f'{cid}.webp', quality=82, method=6)
        # Face texture: the face crop blended into flat skin outside a soft oval.
        tex = im.crop(box(*face)).resize((256, 256), Image.LANCZOS)
        # Skin tone: 60th-percentile brightness over both cheeks (avoids shadow and highlight).
        pixels = sorted(list(tex.crop((52, 128, 84, 164)).getdata()) + list(tex.crop((172, 128, 204, 164)).getdata()), key=sum)
        skin = pixels[int(len(pixels) * 0.6)]
        mask = Image.new('L', (256, 256), 0)
        ImageDraw.Draw(mask).ellipse((46, 18, 210, 244), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(22))
        Image.composite(tex, Image.new('RGB', (256, 256), skin), mask).save(ROOT / 'faces' / f'{cid}.jpg', quality=84)
        print(f"{cid}: skin #{skin[0]:02x}{skin[1]:02x}{skin[2]:02x}")


if __name__ == '__main__':
    main()
