"""Builds LifeTrack's sound set from CC0 Kenney packs and the CC BY music track.

Trims silence, peak-normalises each effect to a level balanced for 100% default volume, adds a short
fade-out and encodes small MP3s. The music loop is level-matched (about -23 dBFS RMS) and cut at a
measured loop point so the player can overlap passes seamlessly.

Usage: python build_audio.py <kenney-extract-root> <music-dir> <project-public-audio-dir>
  kenney root holds x-casino-audio, x-interface-sounds, x-impact-sounds, x-rpg-audio, x-music-jingles
  music dir holds "Cheery Monday.mp3" and "Sunshine.mp3" (Kevin MacLeod, incompetech.com, CC BY 4.0)
"""
import sys, os, json
import numpy as np, soundfile as sf, lameenc

kenney, music_dir, out_dir = sys.argv[1:4]

def find(name):
    for d, _, files in os.walk(kenney):
        if name in files: return os.path.join(d, name)
    raise FileNotFoundError(name)

# output file -> (source clip, peak level). Several outputs per sound give natural variation.
EFFECTS = {
    'dice-shake-1': ('dice-shake-1.ogg', .55), 'dice-shake-2': ('dice-shake-2.ogg', .55), 'dice-shake-3': ('dice-shake-3.ogg', .55),
    'dice-land-1': ('die-throw-1.ogg', .6), 'dice-land-2': ('die-throw-2.ogg', .6), 'dice-land-3': ('die-throw-3.ogg', .6),
    'step-1': ('impactWood_light_000.ogg', .3), 'step-2': ('impactWood_light_001.ogg', .3), 'step-3': ('impactWood_light_002.ogg', .3), 'step-4': ('impactWood_light_003.ogg', .3),
    'land-1': ('impactWood_medium_000.ogg', .45), 'land-2': ('impactWood_medium_001.ogg', .45),
    'land-key': ('bookPlace1.ogg', .5),
    'card-1': ('card-slide-1.ogg', .4), 'card-2': ('card-slide-2.ogg', .4), 'card-3': ('card-slide-3.ogg', .4),
    'select-1': ('card-place-1.ogg', .4), 'select-2': ('card-place-2.ogg', .4), 'select-3': ('card-place-3.ogg', .4),
    'confirm': ('card-shove-1.ogg', .45),
    'event': ('card-fan-1.ogg', .45),
    'coins-1': ('handleCoins.ogg', .5), 'coins-2': ('handleCoins2.ogg', .5),
    'pay': ('handleSmallLeather.ogg', .45),
    'save-1': ('chips-stack-4.ogg', .42), 'save-2': ('chips-stack-5.ogg', .42),
    'purchase': ('bookClose.ogg', .5),
    'warning': ('dropLeather.ogg', .45),
    'claim': ('jingles_PIZZI16.ogg', .4),
    'month': ('jingles_PIZZI15.ogg', .35),
    'winner': ('jingles_PIZZI02.ogg', .45),
    'results': ('jingles_PIZZI10.ogg', .4),
    'quiz-correct': ('jingles_PIZZI04.ogg', .35),
    'quiz-wrong': ('jingles_PIZZI09.ogg', .3),
    'click': ('click_002.ogg', .22),
}

def encode(data, rate, path, kbps, channels=1):
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    enc = lameenc.Encoder(); enc.set_bit_rate(kbps); enc.set_in_sample_rate(rate); enc.set_channels(channels); enc.set_quality(2)
    open(path, 'wb').write(enc.encode(pcm.tobytes()) + enc.flush())

def prepare(data, peak, rate, max_s=1.8):
    if data.ndim > 1: data = data.mean(axis=1)
    data = data.astype(np.float64)
    nz = np.where(np.abs(data) > 0.004)[0]
    if len(nz): data = data[max(0, nz[0] - 32): min(len(data), nz[-1] + 400)]
    data = data[: int(max_s * rate)]
    fade = min(len(data) // 4, int(0.025 * rate))
    if fade > 0: data[-fade:] *= np.linspace(1, 0, fade)
    return data / (np.max(np.abs(data)) or 1) * peak

report = {}
for name, (file, peak) in EFFECTS.items():
    data, rate = sf.read(find(file))
    out = prepare(data, peak, rate)
    path = os.path.join(out_dir, name + '.mp3'); encode(out, rate, path, 96)
    report[name] = {'source': file, 'seconds': round(len(out) / rate, 2), 'bytes': os.path.getsize(path)}

# Music: stereo, level-matched (about -23 dBFS RMS). Each file runs 1.2 s past its loop point, where
# the song returns to its opening material (found by matching the first 6 s against the last 40 s
# by chroma), so the player can overlap the next pass with identical material.
#   Cheery Monday (default): loop at 65.88 s, similarity 0.974 against 0.76 on average.
#   Sunshine (backup, not played by default): loop at 163.63 s, similarity 0.907 against 0.81.
for out_name, src, loop_end in (('music-cheery-monday', 'Cheery Monday.mp3', 65.88), ('music-sunshine', 'Sunshine.mp3', 163.63)):
    x, rate = sf.read(os.path.join(music_dir, src))
    loop = x[: int((loop_end + 1.2) * rate)].astype(np.float64)
    rms_db = 20 * np.log10(np.sqrt(np.mean(loop ** 2)))
    gain = 10 ** ((-23 - rms_db) / 20)
    loop = loop * gain
    peak = np.max(np.abs(loop)); loop = loop / peak * 0.89 if peak > 0.89 else loop
    path = os.path.join(out_dir, out_name + '.mp3'); encode(loop, rate, path, 112, channels=2)
    report[out_name] = {'loop_end': loop_end, 'source': src, 'seconds': round(len(loop) / rate, 2), 'bytes': os.path.getsize(path), 'gain_db': round(20 * np.log10(gain), 1)}
print(json.dumps(report, indent=1))
print('effects bytes', sum(v['bytes'] for k, v in report.items() if not k.startswith('music-')))
