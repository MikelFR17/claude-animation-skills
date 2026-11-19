#!/usr/bin/env python3
"""Free voiceover with Kokoro, in English or Spanish. Run from the project folder with the kit's Python
(needs: bash kit/setup.sh --voice):

    "$PY" tts.py [voice] [speed] [lang]

    English (default):  am_michael 1.1 en-us     (also af_heart, am_adam, bm_george, bf_emma)
    Spanish (neutral):  em_alex 1.05 es          (also ef_dora, em_santa)

Reads script.json (a list of sentences) and writes audio/vo_kokoro.wav plus audio/lines.json
(the start and length of every sentence). For English, kit/words.py gives exact word timings; for any language,
`python3 captions.py --lines audio/lines.json script.json` times the words inside each spoken sentence.
"""
import json
import os
import shutil
import sys
import tempfile

import numpy as np
import soundfile as sf

KIT = os.path.realpath(os.path.join(os.path.realpath('node_modules'), '..'))   # the project's node_modules links into kit/
if not os.path.isdir(os.path.join(KIT, 'models')):
    sys.exit(f'voice models not found under {KIT}/models: run  bash <repo>/kit/setup.sh --voice  (and link node_modules to kit/node_modules)')

from kokoro_onnx import Kokoro, EspeakConfig   # noqa: E402
import espeakng_loader                          # noqa: E402

data = espeakng_loader.get_data_path()
if len(data) > 100:   # espeak-ng fails on long data paths
    short = os.path.join(tempfile.gettempdir(), 'kokoro-espeak-ng-data')
    if not os.path.exists(os.path.join(short, 'phontab')):
        shutil.rmtree(short, ignore_errors=True)
        shutil.copytree(data, short)
    data = short
espeak = EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=data)

lang = sys.argv[3] if len(sys.argv) > 3 else 'en-us'
voice = sys.argv[1] if len(sys.argv) > 1 else ('em_alex' if lang.startswith('es') else 'am_michael')
speed = float(sys.argv[2]) if len(sys.argv) > 2 else (1.05 if lang.startswith('es') else 1.1)
k = Kokoro(os.path.join(KIT, 'models/kokoro-v1.0.onnx'), os.path.join(KIT, 'models/voices-v1.0.bin'), espeak_config=espeak)
os.makedirs('audio', exist_ok=True)
lines = json.load(open('script.json'))
out, t, meta, sr = [], 0.0, [], 24000
for i, line in enumerate(lines):
    samples, sr = k.create(line, voice=voice, speed=speed, lang=lang)
    idx = np.where(np.abs(samples) > 0.01)[0]
    samples = samples[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.05 * sr)]
    meta.append({'i': i, 'text': line, 'start': round(t, 3), 'dur': round(len(samples) / sr, 3)})
    out.append(samples)
    gap = 0.14 + (0.18 if i == 0 or line.rstrip().endswith(('?', '!')) else 0)   # a beat after the hook and after questions
    out.append(np.zeros(int(gap * sr), dtype=samples.dtype))
    t += len(samples) / sr + gap
vo = np.concatenate(out)
sf.write('audio/vo_kokoro.wav', vo, sr)
json.dump(meta, open('audio/lines.json', 'w'), indent=1, ensure_ascii=False)
print(f'{voice} ({lang}) total {len(vo) / sr:.2f}s')
for m in meta:
    print(f"  {m['start']:6.2f}  {m['dur']:5.2f}s  {m['text']}")
