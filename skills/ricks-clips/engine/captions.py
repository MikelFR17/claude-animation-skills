#!/usr/bin/env python3
"""Turns word timings into the CAPTIONS list for src/shots.js, in this style: one word at a time,
small words ("a", "the", "of"...) ride with the next word, punctuation stays on ("check.", "a genius,").

    python3 captions.py <voiceover.words.json>          # from kit/words.py: [{"w": "word", "s": start, "e": end}, ...]
    python3 captions.py --estimate script.json [wps]    # no voice yet: even timing at wps words a second (default 2.6)
    python3 captions.py --lines audio/lines.json script.json   # any language: words timed inside each spoken sentence
                                                         # (lines.json comes from tts.py, or write it by hand:
                                                         #  [{"start": s, "dur": d}, ...] one per sentence)

Paste the output over CAPTIONS and DURATION in src/shots.js. With --estimate it also prints where each sentence starts,
so you can line shots up with them.
"""
import json
import re
import sys

SMALL = {'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'and', 'or', 'but', 'for', 'with', 'his', 'her', 'its',
         'my', 'your', 'their', 'our', 'is', 'was', 'be', 'no', 'so', 'if', 'as', 'it',
         # Spanish
         'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'y', 'e', 'o', 'u', 'en', 'con', 'por',
         'para', 'que', 'su', 'sus', 'se', 'lo', 'le', 'mi', 'tu', 'es', 'ni', 'sin', 'si'}


def chunks(words):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        bare = re.sub(r'[^\w\']', '', w['w']).lower()
        ends = re.search(r'[.,?!;:]$', w['w'].replace('*', ''))
        if ends or not (bare in SMALL and i + 1 < len(words) and len(cur) < 2):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def estimate(sentences, wps=2.6):
    words, t, starts = [], 0.25, []
    for s in sentences:
        starts.append((round(t, 2), s[:48]))
        for w in s.split():
            d = max(0.22, (len(re.sub(r'\W', '', w)) * 0.055 + 0.13) * 2.6 / wps)
            words.append({'w': w, 's': round(t, 2), 'e': round(t + d, 2)})
            t += d + (0.28 if re.search(r'[,;:]$', w) else 0)
        t += 0.45
    return words, starts


def from_lines(lines, sentences):
    """Spread each sentence's words over its real start and length, weighted by word length (plus pauses at commas)."""
    words, starts = [], []
    for m, s in zip(lines, sentences):
        toks = s.split()
        weights = [len(re.sub(r'\W', '', w)) * 0.055 + 0.13 + (0.25 if re.search(r'[,;:]$', w) else 0) for w in toks]
        scale = m['dur'] / sum(weights)
        t = m['start']
        starts.append((round(t, 2), s[:48]))
        for w, k in zip(toks, weights):
            d = k * scale
            words.append({'w': w, 's': round(t, 2), 'e': round(t + d * 0.85, 2)})
            t += d
    return words, starts


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    starts = None
    if sys.argv[1] == '--lines':
        words, starts = from_lines(json.load(open(sys.argv[2])), json.load(open(sys.argv[3])))
    elif sys.argv[1] == '--estimate':
        words, starts = estimate(json.load(open(sys.argv[2])), float(sys.argv[3]) if len(sys.argv) > 3 else 2.6)
    else:
        words = json.load(open(sys.argv[1]))
    groups = chunks(words)
    print('export const CAPTIONS = [')
    line = []
    for i, g in enumerate(groups):
        text = ' '.join(x['w'] for x in g).replace("'", "\\'")
        end = f", {g[-1]['e'] + .35:.2f}" if i == len(groups) - 1 else ''
        line.append(f"[{g[0]['s']:.2f}, '{text}'{end}]")
        if len(line) == 5:
            print('  ' + ', '.join(line) + ',')
            line = []
    if line:
        print('  ' + ', '.join(line) + ',')
    print('];')
    print(f'export const DURATION = {words[-1]["e"] + .8:.2f};')
    if starts:
        print('// sentence starts:')
        for t, s in starts:
            print(f'//   {t:6.2f}  {s}')


if __name__ == '__main__':
    main()
