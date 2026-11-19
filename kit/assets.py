#!/usr/bin/env python3
"""Free CC0 3D assets for the engines: Poly Haven (models, HDRI skies, textures) and Kenney (stylised kits).
Downloads once into kit/assets/ (not committed) and prints the path to use in a shot.

    python3 kit/assets.py search <words>                 # Poly Haven models + HDRIs + textures matching the words
    python3 kit/assets.py model <polyhaven_id> [1k|2k]   # glTF + textures   -> kit/assets/polyhaven/<id>/<id>_1k.gltf
    python3 kit/assets.py hdri <polyhaven_id> [1k|2k]    # .hdr sky          -> kit/assets/polyhaven/hdri/<id>_1k.hdr
    python3 kit/assets.py texture <polyhaven_id> [1k]    # diffuse/normal/rough jpgs -> kit/assets/polyhaven/tex/<id>/
    python3 kit/assets.py kenney <kit-slug>              # e.g. car-kit, city-kit-suburban -> kit/assets/kenney/<slug>/ (GLB files)
    python3 kit/assets.py kenney-list                    # the Kenney 3D kits known to work, with what is in them

Everything is CC0 (public domain): free to use in videos, no credit required (credit is welcome).
In a project folder, the engine reaches these files through the `assets` link: ln -s "$KIT/assets" <project>/assets
"""
import io
import json
import os
import re
import sys
import urllib.request
import zipfile

KIT = os.path.dirname(os.path.realpath(__file__))
OUT = os.path.join(KIT, 'assets')
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}

KENNEY_KITS = {
    'car-kit': 'cars, trucks, vans, police, taxi, ambulance, wheels',
    'city-kit-suburban': 'suburban houses, garages, fences, driveways, trees',
    'city-kit-commercial': 'shops, offices, skyscrapers',
    'city-kit-roads': 'road pieces, crossings, bridges, lights, signs',
    'city-kit-industrial': 'factories, warehouses, chimneys, tanks',
    'nature-kit': 'trees, rocks, grass, flowers, cliffs, logs, mushrooms, tents',
    'pirate-kit': 'pirate ships, cannons, barrels, chests, palms, docks',
    'train-kit': 'trains, wagons, rails, stations',
    'furniture-kit': 'chairs, tables, beds, kitchen, bathroom, lamps, TV',
    'castle-kit': 'walls, towers, gates, bridges, siege weapons',
    'survival-kit': 'tools, barrels, crates, campfire, tents, fences',
    'graveyard-kit': 'graves, crypts, fences, lanterns, dead trees',
    'watercraft-kit': 'boats, ships, buoys, docks',
    'space-kit': 'rockets, space station pieces, craters',
    'food-kit': 'food and drinks',
    'holiday-kit': 'decorations, presents, snowmen',
    'mini-market': 'shop shelves, fridges, products',
    'racing-kit': 'race tracks, barriers, flags, tyres',
    'fantasy-town-kit': 'medieval houses, roofs, market stalls',
    'tower-defense-kit': 'paths, towers, small props',
}


def get(url, binary=False, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    return data if binary else data.decode('utf-8', 'replace')


def save(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = get(url, binary=True)
    with open(path, 'wb') as f:
        f.write(data)
    return path


def ph_files(pid):
    return json.loads(get(f'https://api.polyhaven.com/files/{pid}'))


def model(pid, res='1k'):
    files = ph_files(pid)
    if 'gltf' not in files:
        sys.exit(f'{pid}: no glTF on Poly Haven (is it an HDRI or a texture?)')
    g = files['gltf'].get(res) or next(iter(files['gltf'].values()))
    entry = g['gltf']
    base = os.path.join(OUT, 'polyhaven', pid)
    main = save(entry['url'], os.path.join(base, os.path.basename(entry['url'])))
    for rel, inc in (entry.get('include') or {}).items():
        save(inc['url'], os.path.join(base, rel))
    return main


def hdri(pid, res='1k'):
    files = ph_files(pid)
    if 'hdri' not in files:
        sys.exit(f'{pid}: not an HDRI')
    h = files['hdri'].get(res) or files['hdri'].get('1k')
    entry = h.get('hdr') or next(iter(h.values()))
    return save(entry['url'], os.path.join(OUT, 'polyhaven', 'hdri', os.path.basename(entry['url'])))


def texture(pid, res='1k'):
    files = ph_files(pid)
    out = {}
    for key in ('Diffuse', 'nor_gl', 'Rough', 'AO'):
        if key in files:
            e = files[key].get(res) or next(iter(files[key].values()))
            e = e.get('jpg') or next(iter(e.values()))
            out[key] = save(e['url'], os.path.join(OUT, 'polyhaven', 'tex', pid, os.path.basename(e['url'])))
    return out


def search(words):
    words = [w.lower() for w in words]
    for kind, label in (('models', 'model'), ('hdris', 'hdri'), ('textures', 'texture')):
        d = json.loads(get(f'https://api.polyhaven.com/assets?t={kind}'))
        hits = []
        for pid, a in d.items():
            hay = ' '.join([pid, a.get('name', ''), ' '.join(a.get('tags', [])), ' '.join(a.get('categories', []))]).lower()
            if all(w in hay for w in words):
                hits.append((a.get('download_count', 0), pid, a.get('name', '')))
        for _, pid, name in sorted(hits, reverse=True)[:15]:
            print(f'  {label:8s} {pid:36s} {name}')


def kenney(slug):
    dest = os.path.join(OUT, 'kenney', slug)
    if os.path.isdir(dest) and any(f.endswith(('.glb', '.gltf')) for _, _, fs in os.walk(dest) for f in fs):
        return dest
    page = get(f'https://kenney.nl/assets/{slug}')
    m = re.search(r"data-download-id='([0-9a-f]+)'", page)
    if not m:
        sys.exit(f'kenney: no download found for "{slug}" (see kenney-list, or the slug in kenney.nl/assets/<slug>)')
    link = json.loads(get(f'https://kenney.nl/download-link/{m.group(1)}', headers={'Referer': f'https://kenney.nl/assets/{slug}'}))['url']
    z = zipfile.ZipFile(io.BytesIO(get(link, binary=True)))
    names = z.namelist()
    # keep the GLB folder (its models + the Textures/ they point to) if the kit has GLBs, else the glTF folder
    glb = [n for n in names if n.lower().endswith('.glb')]
    pick = glb or [n for n in names if n.lower().endswith('.gltf')]
    if not pick:
        sys.exit(f'kenney: "{slug}" has no glTF/GLB models')
    root = os.path.dirname(pick[0])
    os.makedirs(dest, exist_ok=True)
    for n in names:
        if n.endswith('/') or not n.startswith(root + '/') or 'preview' in n.lower():
            continue
        rel = n[len(root) + 1:]
        if '..' in rel or not rel.lower().endswith(('.glb', '.gltf', '.bin', '.png', '.jpg')):
            continue
        target = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as f:
            f.write(z.read(n))
    lic = [n for n in names if 'license' in n.lower()]
    if lic:
        with open(os.path.join(dest, 'License.txt'), 'wb') as f:
            f.write(z.read(lic[0]))
    return dest


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == 'search':
        search(a[1:])
    elif cmd == 'model':
        print(os.path.relpath(model(a[1], a[2] if len(a) > 2 else '1k'), KIT))
    elif cmd == 'hdri':
        print(os.path.relpath(hdri(a[1], a[2] if len(a) > 2 else '1k'), KIT))
    elif cmd == 'texture':
        for k, v in texture(a[1], a[2] if len(a) > 2 else '1k').items():
            print(k, os.path.relpath(v, KIT))
    elif cmd == 'kenney':
        d = kenney(a[1])
        files = sorted(f for f in os.listdir(d) if f.endswith(('.glb', '.gltf')))
        print(os.path.relpath(d, KIT), f'({len(files)} models)')
        try:
            print('  ' + '  '.join(os.path.splitext(f)[0] for f in files))
        except BrokenPipeError:
            pass
    elif cmd == 'kenney-list':
        for k, v in KENNEY_KITS.items():
            print(f'  {k:22s} {v}')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
