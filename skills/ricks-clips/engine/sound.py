#!/usr/bin/env python3
"""Score, ambience and sound effects for a short, synthesised in code from a cue sheet. Needs only numpy.

    python3 sound.py [sound.json] [audio/sound.wav]

sound.json (times in seconds, on the voiceover's clock):
{
  "duration": 31.5,
  "bpm": 96, "key": "D",                       # key of the score: any note name; the score is minor unless a block says "warm"
  "music": [ {"start": 0, "end": 6.6, "style": "mystery", "gain": 0.6}, ... ],
      # styles: mystery (pad + sparse piano + shimmer), tension (pad + low ostinato + ticks),
      #         drive (ostinato + taiko on the beat, for the escalation), dark (low drone + heartbeat),
      #         warm (major pad + piano, for a soft turn), reveal (one big swell into a held chord), none
  "ambience": [ {"start": 0, "end": 7.7, "type": "sea", "gain": 0.5}, ... ],
      # types: sea, wind, rain, storm (wind+rain+rumble), room (quiet tone + creaks), hold (wood creaks + drips),
      #        crowd, fire, machine, night (crickets)
  "sfx": [ {"t": 6.6, "type": "whoosh", "gain": 1}, ... ],
      # types: whoosh, swish, impact, boom, hit, riser (ends at t), click, tick, thunder, splash, stamp, creak,
      #        squeak, meow, purr, pop, bell, coins, glass
  "silence": [ [23.5, 24.0] ]                  # music + ambience dip to nothing (use before a reveal)
}
The voice is NOT mixed here: mix it in the final ffmpeg step, where the score ducks under it (see SKILL.md).
"""
import json
import math
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(11)


# ---------- basics ----------
def T(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def band(x, lo=None, hi=None, soft=0.15):
    """FFT band-pass with soft edges (lo/hi in Hz, None = open)."""
    n = len(x)
    if n == 0:
        return x
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + np.exp(np.clip(-(f - lo) / (lo * soft), -60, 60)))
    if hi:
        g *= 1 / (1 + np.exp(np.clip((f - hi) / (hi * soft), -60, 60)))
    return np.fft.irfft(X * g, n)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def adsr(n, a=0.01, r=0.2, curve=2.0):
    t = T(n)
    dur = n / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.clip((dur - t) / max(r, 1e-4), 0, 1) ** curve
    return e


def decay(n, rate=8, a=0.004):
    t = T(n)
    return np.minimum(1, t / a) * np.exp(-t * rate)


NOTES = {'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11}


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def place(buf, x, at, g=1.0):
    i = int(round(at * SR))
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    if i < len(buf) and j > i:
        buf[i:j] += x[: j - i] * g


# ---------- instruments ----------
def pad(freqs, dur, bright=1800, detune=0.004):
    n = int(dur * SR)
    t = T(n)
    x = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = rng.uniform(0, 6.28)
            # saw-ish: a few harmonics
            for k in range(1, 7):
                x += np.sin(2 * np.pi * f * (1 + d) * k * t + ph * k) / k
    x = band(x, 60, bright)
    return norm(x, 0.35) * adsr(n, a=min(1.2, dur / 3), r=min(1.5, dur / 3), curve=1)


def piano(m, dur=1.6, g=1.0):
    n = int(dur * SR)
    t = T(n)
    f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * t * (1 + 0.0007 * k * k)) * np.exp(-t * (2.2 + k * 1.1)) for k, a in enumerate([1, 0.55, 0.3, 0.18, 0.1], 1))
    x += band(noise(n), 1500, 6000) * np.exp(-t * 90) * 0.05
    return x * np.minimum(1, t / 0.003) * 0.45 * g


def shimmer(dur, f=2093):
    n = int(dur * SR)
    t = T(n)
    x = sum(np.sin(2 * np.pi * f * r * t + r) * (0.5 + 0.5 * np.sin(t * (0.7 + r))) for r in (1, 1.5, 2, 3))
    return x * adsr(n, a=dur / 3, r=dur / 3, curve=1) * 0.03


def ostinato_note(m, dur, g=1.0):
    n = int(dur * SR)
    t = T(n)
    f = midi(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 9))
    x = band(x, 40, 900)
    return x * decay(n, 7) * 0.35 * g


def taiko(g=1.0, f0=62):
    n = int(0.9 * SR)
    t = T(n)
    f = f0 * (1 + 0.8 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    x += band(noise(n), 80, 900) * np.exp(-t * 30) * 0.5
    return x * 0.8 * g


def heartbeat(g=1.0):
    out = np.zeros(int(0.7 * SR))
    for at, a in ((0, 1), (0.22, 0.7)):
        n = int(0.3 * SR)
        t = T(n)
        place(out, np.sin(2 * np.pi * 48 * t) * np.exp(-t * 18) * a, at)
    return out * 0.9 * g


def tick_sfx(g=1.0):
    n = int(0.03 * SR)
    t = T(n)
    return (band(noise(n), 3000) * np.exp(-t * 250) + np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180) * 0.5) * 0.4 * g


# ---------- music styles ----------
def chords(root, minor=True):
    r = 50 + NOTES[root.upper()]
    if r > 55:
        r -= 12
    if minor:   # i  VI  iv  V
        return [(r, (r + 12, r + 15, r + 19)), (r - 4, (r + 8, r + 12, r + 15)), (r + 5, (r + 17, r + 20, r + 24)), (r + 7, (r + 19, r + 23, r + 26))]
    return [(r, (r + 12, r + 16, r + 19)), (r + 5, (r + 17, r + 21, r + 24)), (r - 3, (r + 9, r + 12, r + 16)), (r + 7, (r + 19, r + 23, r + 26))]


def music_block(buf, b, bpm, key):
    s, e, style, g = b['start'], b['end'], b.get('style', 'mystery'), b.get('gain', 0.6)
    if style == 'none' or e <= s:
        return
    beat = 60 / bpm
    bar = beat * 4
    prog = chords(key, minor=style != 'warm')
    seg = np.zeros(int((e - s + 2) * SR))
    t, i = 0.0, 0
    while t < e - s:
        bass, tri = prog[i % 4]
        d = min(bar, e - s - t) + 0.6
        if style in ('mystery', 'tension', 'warm', 'drive'):
            place(seg, pad([midi(m) for m in tri] + [midi(bass)], d, bright=1400 if style != 'warm' else 2200), t, 0.8)
        if style == 'dark':
            place(seg, pad([midi(bass - 12), midi(bass - 5)], d, bright=500), t, 1.0)
            for k in range(4):
                if t + k * beat * 2 < e - s:
                    place(seg, heartbeat(), t + k * beat * 2, 0.8)
        if style in ('mystery', 'warm'):
            mel = [tri[2] + 12, tri[1] + 12, tri[0] + 12, tri[1] + 12] if style == 'warm' else [tri[2] + 12, None, tri[1] + 12, None]
            for k, m in enumerate(mel):
                if m is not None and t + k * beat < e - s:
                    place(seg, piano(m, 2.2), t + k * beat, 0.7)
            if style == 'mystery':
                place(seg, shimmer(d), t, 1)
        if style in ('tension', 'drive'):
            for k in range(8):
                tt = t + k * beat / 2
                if tt < e - s:
                    place(seg, ostinato_note(bass + (12 if k % 4 == 3 else 0), beat / 2 + 0.1), tt, 0.9)
                    if style == 'tension':
                        place(seg, tick_sfx(), tt, 0.5 if k % 2 else 0.25)
        if style == 'drive':
            for k in range(4):
                if t + k * beat < e - s:
                    place(seg, taiko(1.0 if k % 2 == 0 else 0.6), t + k * beat, 0.9)
        t += bar
        i += 1
    if style == 'reveal':
        bass, tri = prog[0]
        d = e - s + 0.8
        place(seg, pad([midi(m) for m in tri] + [midi(m + 12) for m in tri] + [midi(bass - 12)], d, bright=3000), 0, 1.3)
        place(seg, taiko(1.4, 50), 0, 1)
    n = len(seg)
    seg *= np.clip(np.minimum(T(n) / 0.15, (e - s + 0.6 - T(n)) / 0.6), 0, 1)
    place(buf, seg, s, g)


# ---------- ambience ----------
def amb(kind, dur):
    n = int(dur * SR)
    t = T(n)
    if kind == 'sea':
        x = band(noise(n), 80, 900) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 5.5) ** 2) + band(noise(n), 1500, 5000) * 0.12 * np.sin(2 * np.pi * t / 5.5 + 1) ** 4
    elif kind == 'wind':
        x = band(noise(n), 200, 1200) * (0.5 + 0.5 * np.sin(t * 0.7) * np.sin(t * 0.23 + 1))
    elif kind == 'rain':
        x = band(noise(n), 2000, 9000) * 0.5
        for at in rng.uniform(0, dur, int(dur * 40)):
            m = int(0.01 * SR)
            place(x, band(noise(m), 3000) * np.exp(-T(m) * 400) * rng.uniform(0.3, 1), at)
    elif kind == 'storm':
        x = amb('rain', dur) * 0.8 + amb('wind', dur) * 1.2 + band(noise(n), 20, 120) * 0.8
    elif kind == 'room':
        x = band(noise(n), 40, 300) * 0.25
    elif kind == 'hold':
        x = band(noise(n), 40, 250) * 0.3
        for at in np.arange(rng.uniform(0, 2), dur, 2.7):
            place(x, creak(rng.uniform(0.6, 1.2)), at, 0.6)
        for at in np.arange(0.8, dur, 1.9):
            place(x, drip(), at, 0.4)
    elif kind == 'crowd':
        x = sum(band(noise(n), f, f * 1.4) * (0.5 + 0.5 * np.sin(t * rng.uniform(2, 5) + k)) for k, f in enumerate((300, 500, 800, 1200)))
    elif kind == 'fire':
        x = band(noise(n), 100, 800) * 0.4
        for at in rng.uniform(0, dur, int(dur * 12)):
            m = int(0.006 * SR)
            place(x, band(noise(m), 1500) * rng.uniform(0.4, 1.2), at)
    elif kind == 'machine':
        x = sum(np.sin(2 * np.pi * 50 * k * t) / k for k in range(1, 6)) * 0.3 + band(noise(n), 200, 2000) * 0.15 * (np.sin(2 * np.pi * 6 * t) > 0)
    elif kind == 'night':
        x = band(noise(n), 60, 400) * 0.15
        chirp = np.sin(2 * np.pi * 4400 * t) * (np.sin(2 * np.pi * 30 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > 0.6)
        x += chirp * 0.06
    else:
        x = np.zeros(n)
    return norm(x, 0.5) * np.clip(np.minimum(t / 0.4, (dur - t) / 0.4), 0, 1)


# ---------- sound effects ----------
def whoosh(dur=0.45, up=True):
    n = int(dur * SR)
    t = T(n)
    k = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    x = band(noise(n), 300, 1500) * (1 - k) + band(noise(n), 1500, 7000) * k
    return x * np.sin(np.pi * t / dur) ** 2 * 1.4


def impact(big=False):
    n = int((1.8 if big else 0.9) * SR)
    t = T(n)
    f = (38 if big else 55) * (1 + 1.2 * np.exp(-t * 18))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.5 if big else 6))
    x += band(noise(n), 60, 2500) * np.exp(-t * (8 if big else 25)) * 0.8
    return x


def riser(dur=2.0):
    n = int(dur * SR)
    t = T(n)
    k = (t / dur) ** 2
    x = band(noise(n), 400, 9000) * k * 0.7
    f = 180 + 900 * k
    x += np.sin(2 * np.pi * np.cumsum(f) / SR) * k * 0.25
    return x


def thunder(dur=3.5):
    n = int(dur * SR)
    t = T(n)
    x = band(noise(n), 20, 260) * (np.exp(-t * 1.2) * (0.6 + 0.4 * np.abs(np.sin(t * 7)))) * 1.6
    x += band(noise(n), 600, 5000) * np.exp(-t * 25) * 0.8
    return x


def splash():
    n = int(1.0 * SR)
    t = T(n)
    return band(noise(n), 400, 6000) * np.exp(-t * 6) * (1 - np.exp(-t * 80)) + band(noise(n), 80, 400) * np.exp(-t * 12) * 0.6


def creak(dur=0.8):
    n = int(dur * SR)
    t = T(n)
    f = 140 + 60 * np.sin(t * 3)
    pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.95).astype(float)
    return band(pulses, 200, 3000) * np.sin(np.pi * t / dur) * 0.8


def drip():
    n = int(0.15 * SR)
    t = T(n)
    return np.sin(2 * np.pi * (900 + 1200 * t) * t) * np.exp(-t * 40) * 0.5


def squeak():
    n = int(0.18 * SR)
    t = T(n)
    f = 3200 + 900 * np.sin(t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18) * 0.35


def meow():
    n = int(0.6 * SR)
    t = T(n)
    f0 = 520 + 260 * np.sin(np.pi * t / 0.6)
    x = sum(np.sin(2 * np.pi * np.cumsum(f0 * k) / SR) / k for k in range(1, 8))
    x = band(x, 400, 2600)
    return x * np.sin(np.pi * t / 0.6) ** 1.5 * 0.5


def purr(dur=1.5):
    n = int(dur * SR)
    t = T(n)
    return band(noise(n), 40, 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 1.2)) * adsr(n, 0.2, 0.3) * 0.9


def stamp():
    return impact(False) * 0.7 + np.pad(band(noise(int(0.05 * SR)), 1500) * 0.4, (0, int(0.85 * SR)))


def bell(f=420):
    n = int(2.5 * SR)
    t = T(n)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 1.2), (2.4, 0.6, 2), (3.0, 0.4, 2.6), (4.2, 0.3, 3.5), (0.5, 0.5, 0.9))) * 0.35


def coins():
    out = np.zeros(int(0.9 * SR))
    for at in sorted(rng.uniform(0, 0.6, 9)):
        f = rng.uniform(3000, 6000)
        m = int(0.25 * SR)
        place(out, np.sin(2 * np.pi * f * T(m)) * np.exp(-T(m) * 20) * 0.3, at)
    return out


def glass():
    out = band(noise(int(0.8 * SR)), 2500, 10000) * np.exp(-T(int(0.8 * SR)) * 7)
    for at in rng.uniform(0, 0.4, 7):
        m = int(0.3 * SR)
        place(out, np.sin(2 * np.pi * rng.uniform(2500, 6000) * T(m)) * np.exp(-T(m) * 15) * 0.3, at)
    return out


def pop():
    n = int(0.12 * SR)
    t = T(n)
    return np.sin(2 * np.pi * (300 + 1500 * np.exp(-t * 40)) * t) * np.exp(-t * 35) * 0.6


SFX = {
    'whoosh': lambda: whoosh(), 'swish': lambda: whoosh(0.25, False) * 0.7, 'impact': lambda: impact(), 'boom': lambda: impact(True) * 1.3,
    'hit': lambda: taiko(1.2, 70), 'riser': riser, 'click': lambda: tick_sfx(2), 'tick': lambda: tick_sfx(1.2), 'thunder': thunder, 'splash': splash,
    'stamp': stamp, 'creak': creak, 'squeak': squeak, 'meow': meow, 'purr': purr, 'pop': pop, 'bell': bell, 'coins': coins, 'glass': glass,
}


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())


def main():
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else 'sound.json'
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'audio/sound.wav'
    cfg = json.load(open(cfg_path))
    dur = cfg['duration'] + 1.0
    N = int(dur * SR)
    mus, am, fx = np.zeros(N), np.zeros(N), np.zeros(N)
    for b in cfg.get('music', []):
        music_block(mus, b, cfg.get('bpm', 96), cfg.get('key', 'D'))
    for a in cfg.get('ambience', []):
        place(am, amb(a['type'], a['end'] - a['start']), a['start'], a.get('gain', 0.4))
    for s in cfg.get('sfx', []):
        x = SFX[s['type']]()
        at = s['t'] - (len(x) / SR if s['type'] == 'riser' else 0)
        place(fx, x, at, s.get('gain', 1.0))
    # silences: music + ambience dip to nothing, with short ramps
    g = np.ones(N)
    t = T(N)
    for a, b in cfg.get('silence', []):
        g *= 1 - np.clip(np.minimum((t - (a - 0.12)) / 0.12, ((b + 0.08) - t) / 0.08), 0, 1)
    mix = (mus * 0.55 + am * 0.6) * g + fx * 0.8
    # gentle bus compression + limit
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix = norm(mix, 0.89)
    write_wav(out_path, mix)
    print(f'wrote {out_path} ({dur:.1f} s)')


if __name__ == '__main__':
    main()
