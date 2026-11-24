"""Builds the optimised web assets for the Visual & UX overhaul from the owner's source art.

Source (local, untracked, ~140 MB): art-source/  (moved out of public/ so Vite never ships the originals)
  characters/<name>/<name>-{avatar,full}.jpg   2048x2048 (PNG data despite the extension)
  cards/**                                     card illustrations and category icons
  backgrounds/*.png, environment/*.png         1672x941 scene paintings

Outputs (small WebP, committed as plain git blobs; see public/.gitattributes):
  public/assets/characters/portraits/<id>.webp  320x320 head-and-shoulders crop (round avatars)
  public/assets/characters/full/<id>.webp       440x800 full-body crop on the character's own backdrop
  public/assets/art/<slug>.webp                 card artwork, max 512 px (alpha kept where the source has it)
  public/assets/icons/<slug>.webp               category medallions, 160 px, transparent
  public/assets/scenes/<slug>[-sm].webp         homepage / results backdrops, 1920 and 960 wide

Every asset decision (use / modify / recreate / reject) is recorded in docs/ASSET_REVIEW.md.
Requires Pillow (+ numpy):  python -m pip install pillow numpy ;  python scripts/assets/build_overhaul_assets.py
"""
from pathlib import Path
from PIL import Image
import numpy as np

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / 'art-source'
OUT = REPO / 'public' / 'assets'

# Internal id -> source folder. Vikram's internal id stays 'daniel' (save compatibility).
CHARACTERS = {'alex': 'alex', 'meiling': 'mei-ling', 'daniel': 'vikram', 'aisyah': 'aisyah'}

# slug -> (source, crop box as fractions or None, keep alpha)
ART = {
    # Decision cards
    'savings':            ('cards/savings/savings.jpg', (0.0, 0.08, 0.80, 1.0), False),  # drop the dark picture-frame band on the right
    'medical':            ('cards/insurance/medical-insurance.jpg', None, False),
    'accident':           ('cards/insurance/accident-insurance.jpg', None, False),
    'critical':           ('cards/insurance/critical-illness.jpg', None, False),
    # Payday / bills / claims
    'income':             ('cards/income/salary-increase.jpg', (0.185, 0.095, 0.815, 0.94), False),  # crop away the picture-in-picture frame
    'bills':              ('cards/expenses/budget-planning.jpg', None, False),
    'emergency-fund':     ('cards/savings/emergency-fund.jpg', None, False),
    # Life events (transparent pedestal illustrations)
    'event-repair':       ('cards/expenses/unexpected-expense.png', 'trim', True),
    'event-family':       ('cards/events/charity-giving.png', 'trim', True),
    'event-income-shock': ('cards/events/market-crash.png', 'trim', True),
    'event-home':         ('cards/expenses/home-purchase.png', 'trim', True),
    'event-calm':         ('cards/events/bonus-reward.png', 'trim', True),
    'learning':           ('cards/education/education-skills.png', 'trim', True),
}

ICONS = {
    'income': 'cards/icons/income-icon.png',
    'protection': 'cards/icons/insurance-icon.png',
    'growth': 'cards/icons/investment-icon.png',
    'savings': 'cards/icons/savings-icon.png',
    'event': 'cards/icons/events-icon.png',      # baked checkerboard -> removed below
    'expense': 'cards/icons/expenses-icon.png',  # baked checkerboard -> removed below
}

SCENES = {'home-city': 'backgrounds/homepage-city.png', 'results-plaza': 'backgrounds/monthly-results.png'}


def save(im: Image.Image, path: Path, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path.relative_to(REPO)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB')


def fit(im: Image.Image, max_side: int) -> Image.Image:
    im = im.copy()
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    return im


def crop_frac(im, box):
    w, h = im.size
    return im.crop(tuple(int(round(v * (w if i % 2 == 0 else h))) for i, v in enumerate(box)))


def remove_checkerboard(im: Image.Image) -> Image.Image:
    """The two 'transparent' icons have a grey/white checkerboard painted in. Pixels that are near
    neutral and light AND connected to the border become transparent; the object is untouched."""
    rgb = np.asarray(im.convert('RGB')).astype(int)
    neutral = (rgb.max(axis=2) - rgb.min(axis=2) < 14) & (rgb.min(axis=2) > 178)
    # Region grow from the border, constrained to the neutral mask (4-neighbour dilation until stable).
    bg = np.zeros_like(neutral)
    bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1] = neutral[0, :], neutral[-1, :], neutral[:, 0], neutral[:, -1]
    while True:
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]; grown[:-1, :] |= bg[1:, :]; grown[:, 1:] |= bg[:, :-1]; grown[:, :-1] |= bg[:, 1:]
        grown &= neutral
        if (grown == bg).all():
            break
        bg = grown
    # Soften the cut edge by one pixel so the outline is not jagged.
    edge = bg.copy(); edge[1:, :] |= bg[:-1, :]; edge[:-1, :] |= bg[1:, :]; edge[:, 1:] |= bg[:, :-1]; edge[:, :-1] |= bg[:, 1:]
    alpha = np.where(bg, 0, np.where(edge, 140, 255)).astype('uint8')
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alpha))
    return out


def main():
    for cid, name in CHARACTERS.items():
        avatar = Image.open(SRC / 'characters' / name / f'{name}-avatar.jpg').convert('RGB')
        save(crop_frac(avatar, (0.13, 0.02, 0.87, 0.76)).resize((320, 320), Image.LANCZOS), OUT / 'characters' / 'portraits' / f'{cid}.webp', 80)
        full = Image.open(SRC / 'characters' / name / f'{name}-full.jpg').convert('RGB')
        save(crop_frac(full, (0.225, 0.0, 0.775, 1.0)).resize((440, 800), Image.LANCZOS), OUT / 'characters' / 'full' / f'{cid}.webp', 80)

    for slug, (rel, box, alpha) in ART.items():
        im = Image.open(SRC / rel)
        im = im.convert('RGBA' if alpha else 'RGB')
        if box == 'trim':
            im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox())
        elif box:
            im = crop_frac(im, box)
        save(fit(im, 512), OUT / 'art' / f'{slug}.webp', 80)

    for slug, rel in ICONS.items():
        im = Image.open(SRC / rel)
        im = remove_checkerboard(im) if im.mode != 'RGBA' else im
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox())
        save(fit(im, 160), OUT / 'icons' / f'{slug}.webp', 86)

    for slug, rel in SCENES.items():
        im = Image.open(SRC / rel).convert('RGB')
        save(im.resize((1672, 941), Image.LANCZOS), OUT / 'scenes' / f'{slug}.webp', 78)
        save(im.resize((960, 540), Image.LANCZOS), OUT / 'scenes' / f'{slug}-sm.webp', 76)


if __name__ == '__main__':
    main()
