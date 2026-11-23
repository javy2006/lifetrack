"""Builds the web assets for the four LifeTrack characters from the official references.

Source of truth: public/assets/characters/reference/{alex,mei-ling,vikram,aisyah}.jpg (2048x2048; Vikram's internal id is 'daniel').
Outputs (small, committed as plain git blobs (see public/.gitattributes), served from public/):
  portraits/<id>.webp  320x320  face-centred crop with hair and headwear: selection cards, HUD,
                                comparison table, rosters and standings (shown round, object-fit cover)
(The board uses profession tokens, so no face textures are generated any more.)

Requires Pillow:  python -m pip install pillow ;  python scripts/assets/build_character_assets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / 'public' / 'assets' / 'characters'
REF = ROOT / 'reference'
K = 2048 / 900  # crop boxes below were measured on 900 px previews

# id -> (file stem, portrait centre/size, unused face box kept for reference), all in 900 px units
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
    for sub in ('portraits',):
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    for cid, (stem, portrait, face) in CHARACTERS.items():
        im = Image.open(REF / f'{stem}.jpg').convert('RGB')  # references may be RGBA
        im.crop(box(*portrait)).resize((320, 320), Image.LANCZOS).save(ROOT / 'portraits' / f'{cid}.webp', quality=80, method=6)
        print(f'{cid}: portrait written')


if __name__ == '__main__':
    main()
