#!/usr/bin/env python3
"""
Photosensitivity check for animated GIF assets (WCAG 2.x SC 2.3.1, simplified).

For every GIF: decode frames with their delays, compute per-block mean relative
luminance (sRGB -> linear, WCAG formula) on a 4x4 grid plus the whole frame,
and count "flashes" = pairs of opposing luminance changes >= 0.10 where the
darker state is < 0.80, inside any sliding 1-second window. Also counts
saturated-red transitions (WCAG "red flash", simplified: R/(R+G+B) >= 0.8).

This is a conservative screening tool, not a certified analyser (PEAT/Harding).
Output: JSON on stdout. Exit code 1 if any asset exceeds 3 flashes/second.
Requires Pillow + numpy.
"""
import json, sys, glob, os
import numpy as np
from PIL import Image

def rel_lum(rgb):
    c = rgb.astype(np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]

def red_ratio(rgb):
    s = rgb.astype(np.float64).sum(axis=-1) + 1e-9
    return rgb[..., 0] / s

def frames_of(path):
    im = Image.open(path)
    out = []
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i)
        out.append((np.array(im.convert('RGB')), int(im.info.get('duration', 100) or 100)))
    return out

def block_means(arr, fn, grid=4):
    h, w = arr.shape[:2]
    v = fn(arr)
    res = [float(v.mean())]
    for gy in range(grid):
        for gx in range(grid):
            blk = v[gy * h // grid:(gy + 1) * h // grid, gx * w // grid:(gx + 1) * w // grid]
            res.append(float(blk.mean()))
    return res

def count_flashes(series, times_ms, loops=3):
    """series: luminance per frame for one region; repeat the loop to catch wrap-around."""
    s = series * loops
    t = []
    acc = 0
    period = times_ms[-1] + 0  # placeholder
    for k in range(loops):
        for i, d in enumerate(times_ms):
            t.append(acc)
            acc += d
    changes = []  # (time, sign)
    last_extreme = s[0]
    direction = 0
    for i in range(1, len(s)):
        delta = s[i] - last_extreme
        darker = min(s[i], last_extreme)
        if abs(delta) >= 0.10 and darker < 0.80:
            sign = 1 if delta > 0 else -1
            changes.append((t[i], sign))
            last_extreme = s[i]
            direction = sign
        else:
            # track running extreme in the current direction
            if direction >= 0 and s[i] > last_extreme and direction == 1:
                last_extreme = s[i]
            elif direction <= 0 and s[i] < last_extreme and direction == -1:
                last_extreme = s[i]
    # a flash = pair of opposing consecutive changes
    flashes = []
    for i in range(1, len(changes)):
        if changes[i][1] != changes[i - 1][1]:
            flashes.append(changes[i][0])
    worst = 0
    for i, ft in enumerate(flashes):
        n = sum(1 for x in flashes if ft <= x < ft + 1000)
        worst = max(worst, n)
    return worst, len(changes)

def analyse(path):
    fr = frames_of(path)
    delays = [d for _, d in fr]
    lum = [block_means(a, rel_lum) for a, _ in fr]
    red = [block_means(a, red_ratio) for a, _ in fr]
    worst_general = 0
    max_delta = 0.0
    for r in range(len(lum[0])):
        series = [x[r] for x in lum]
        w, _ = count_flashes(series, delays)
        worst_general = max(worst_general, w)
        for i in range(1, len(series)):
            max_delta = max(max_delta, abs(series[i] - series[i - 1]))
        max_delta = max(max_delta, abs(series[0] - series[-1]))
    red_transitions = 0
    for r in range(len(red[0])):
        series = [x[r] for x in red]
        for i in range(1, len(series)):
            if (series[i] >= 0.8) != (series[i - 1] >= 0.8):
                red_transitions += 1
    total = sum(delays)
    return {
        'file': os.path.relpath(path),
        'frames': len(fr),
        'minDelayMs': min(delays),
        'effectiveFps': round(len(fr) / (total / 1000.0), 2) if total else None,
        'maxBlockLuminanceStep': round(max_delta, 4),
        'worstFlashesPerSecond': worst_general,
        'redStateTransitions': red_transitions,
        'pass': worst_general <= 3 and red_transitions == 0,
    }

def main(argv):
    roots = argv[1:] or ['assets']
    files = []
    for r in roots:
        files += sorted(glob.glob(os.path.join(r, '**', '*.gif'), recursive=True))
    results = [analyse(f) for f in files]
    ok = all(x['pass'] for x in results)
    print(json.dumps({'tool': 'photosensitivity_check.py', 'threshold': 'WCAG 2.3.1 (3 flashes/s, simplified)',
                      'assets': results, 'allPass': ok}, indent=2))
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main(sys.argv))
