"""Builds LifeTrack's sound set: trims, normalises and encodes chosen CC0 clips to small mono MP3s.
Usage: python build_audio.py <kenney-extract-root> <project-public-audio-dir>"""
import sys, os, json
import numpy as np, soundfile as sf, lameenc

src_root, out_dir = sys.argv[1], sys.argv[2]
K = {
  'casino': os.path.join(src_root, 'x-casino-audio'),
  'ui': os.path.join(src_root, 'x-interface-sounds'),
}
def find(pack, name):
    for d, _, files in os.walk(K[pack]):
        if name in files: return os.path.join(d, name)
    raise FileNotFoundError(name)

# output name -> (pack, source file, peak gain)
MAP = {
  'dice-shake':   ('casino', 'dice-shake-1.ogg', 0.75),
  'dice-land':    ('casino', 'die-throw-1.ogg', 0.8),
  'step-1':       ('casino', 'chip-lay-1.ogg', 0.5),
  'step-2':       ('casino', 'chip-lay-2.ogg', 0.5),
  'step-3':       ('casino', 'chip-lay-3.ogg', 0.5),
  'land':         ('casino', 'chips-collide-1.ogg', 0.75),
  'coins':        ('casino', 'chips-handle-3.ogg', 0.75),
  'pay':          ('casino', 'chips-stack-2.ogg', 0.7),
  'save':         ('casino', 'chips-stack-4.ogg', 0.7),
  'card':         ('casino', 'card-place-1.ogg', 0.7),
  'event':        ('casino', 'card-slide-3.ogg', 0.75),
  'month':        ('casino', 'card-fan-1.ogg', 0.7),
  'click':        ('ui', 'click_002.ogg', 0.55),
  'select':       ('ui', 'select_002.ogg', 0.6),
  'purchase':     ('ui', 'confirmation_002.ogg', 0.6),
  'confirm':      ('ui', 'confirmation_001.ogg', 0.6),
  'claim':        ('ui', 'confirmation_004.ogg', 0.65),
  'warning':      ('ui', 'error_004.ogg', 0.55),
  'quiz-correct': ('ui', 'confirmation_003.ogg', 0.6),
  'quiz-wrong':   ('ui', 'error_006.ogg', 0.5),
}

def encode(data, rate, path, kbps=96):
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    enc = lameenc.Encoder(); enc.set_bit_rate(kbps); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
    open(path, 'wb').write(enc.encode(pcm.tobytes()) + enc.flush())

def prepare(data, gain, max_s=None, rate=44100):
    if data.ndim > 1: data = data.mean(axis=1)
    data = data.astype(np.float64)
    nz = np.where(np.abs(data) > 0.004)[0]
    if len(nz): data = data[max(0, nz[0] - 32): min(len(data), nz[-1] + 400)]
    if max_s: data = data[: int(max_s * rate)]
    fade = min(len(data) // 4, int(0.02 * rate))
    if fade > 0: data[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(data)) or 1
    return data / peak * gain

report = {}
for name, (pack, file, gain) in MAP.items():
    data, rate = sf.read(find(pack, file))
    out = prepare(data, gain, max_s=1.6, rate=rate)
    path = os.path.join(out_dir, name + '.mp3'); encode(out, rate, path)
    report[name] = {'source': f'{pack}/{file}', 'seconds': round(len(out) / rate, 2), 'bytes': os.path.getsize(path)}

# Our own generated cues (no third-party licence): results fanfare and the optional ambience loop.
for name, kbps, gain in (('winner', 96, 0.8), ('lifetrack-ambience', 64, 0.6)):
    wav = os.path.join(out_dir, name + '.wav')
    if os.path.exists(wav):
        data, rate = sf.read(wav)
        if data.ndim > 1: data = data.mean(axis=1)
        data = data / (np.max(np.abs(data)) or 1) * gain
        path = os.path.join(out_dir, name + '.mp3'); encode(data, rate, path, kbps)
        report[name] = {'source': 'generated (LifeTrack)', 'seconds': round(len(data) / rate, 2), 'bytes': os.path.getsize(path)}
print(json.dumps(report, indent=1))
print('total bytes', sum(v['bytes'] for v in report.values()))
