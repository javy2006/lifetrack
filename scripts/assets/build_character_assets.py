"""Builds the web assets for the four LifeTrack characters from the official references.

Source of truth: public/assets/characters/reference/{alex,mei-ling,vikram,aisyah}.jpg (2048x2048; Vikram's internal id is 'daniel').
Outputs (small, committed as plain git blobs (see public/.gitattributes), served from public/):
  portraits/<id>.webp  320x320  face-centred crop with hair and headwear: selection cards, HUD,
                                comparison table, rosters and standings (shown round, object-fit cover)
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
    'meiling': ('mei-ling', (452, 150, 190), (452, 154, 88)),
    'daniel':  ('vikram',   (452, 135, 180), (452, 161, 84)),  # Vikram (internal id 'daniel')
    'aisyah':  ('aisyah',   (452, 145, 185), (452, 158, 86)),
}


def box(cx, cy, size):
    h = size / 2
    return tuple(int(round(v * K)) for v in (cx - h, cy - h, cx + h, cy + h))


def main():
    for sub in ('portraits', 'faces'):
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    for cid, (stem, portrait, face) in CHARACTERS.items():
        im = Image.open(REF / f'{stem}.jpg').convert('RGB')  # references may be RGBA
        im.crop(box(*portrait)).resize((320, 320), Image.LANCZOS).save(ROOT / 'portraits' / f'{cid}.webp', quality=80, method=6)
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
