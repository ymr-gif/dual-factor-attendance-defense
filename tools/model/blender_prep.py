#!/usr/bin/env python3
"""Blender headless prep for the Sketchfab Arduino Uno model — turns the raw
62 MB export into a small, deck-ready .glb for tools/model/bake.js.

    python3 tools/model/blender_prep.py <input.glb> <output.glb>

Requires `pip install bpy` (authoring-time only — the deck itself never runs
Blender or Python; see docs/3D_MODEL_PIPELINE.md for why).

What it does, and why:

1. Imports the GLB. The source ships 53 separate mesh objects, generically
   named by Blender's own exporter (Cube, Cube.001, Cylinder, ...) — nothing
   in the file identifies which one is the USB port or the crystal.

2. Classifies each object into the part names the deck's explode animation
   and callout labels look up (see docs/3D_MODEL_PIPELINE.md). NAME_MAP below
   is a hand-built lookup, not a generic classifier — there is no shape
   heuristic that reliably tells a voltage regulator from a crystal can at
   this scale. It was derived once by rendering the textured model top-down
   (the real board silkscreen makes every part identifiable by eye) and
   cross-checking candidate objects' bounding-box dimensions against the
   2.54 mm pin pitch (8-pin header = 19.9-20.3mm, 10-pin = 25.0-25.4mm,
   6-pin = 15.0-15.2mm — unambiguous) and shared bounding-box centers (the
   MCU's DIP body, pin legs and top decal are three objects at the exact same
   center, different heights). Re-running this script against a *different*
   Arduino export will not reclassify correctly — that file's objects will
   have different names — diagnose it the same way and update NAME_MAP.
   Anything not in NAME_MAP still gets exported, grouped under CATCHALL, and
   still animates — the deck lifts unknown parts by a default amount.

3. Decimates the "solder.014" object, a whole-board solder-mask/via detail
   layer that alone accounts for ~68% of the source's triangles (52.8k of
   77.7k) for detail invisible at deck viewing distance.

4. Joins each part's objects into one, so bake.js — which keys parts by
   glTF node name — sees a single node per named part. Two Blender objects
   both named "mcu" would collide in bake.js's part map (last one wins,
   silently dropping geometry); joining avoids that.

5. Downscales every texture over 1024px (the source ships 4096x4096 PNGs —
   44MB for the two diffuse maps alone) and re-exports as JPEG so the
   embedded image data stays small once bake.js base64s it.

6. Exports uncompressed (no Draco — bake.js reads raw accessors) with
   modifiers applied and +Y up, which is the glTF exporter's default and is
   what bake.js and model-loader.js assume.
"""
import sys

import bpy

# Object name (as imported) -> deck part name. See the module docstring for
# how these were derived. Names not listed here fall into CATCHALL.
NAME_MAP = {
    # PCB: the board plate (top/bottom/side textured faces) plus the solder
    # mask/via layer, which shares its footprint and thickness almost
    # exactly (49.4x63.7x1.7mm vs the plate's 53.0x68.0x1.6mm) — it is board
    # surface detail, not a separate physical part, so it explodes with it.
    'Plane': 'pcb',
    'solder.014': 'pcb',

    # USB-B and DC jack sit on the same board edge, full connector height
    # (~11mm) off the board — confirmed visually (top-down render: jack's
    # black barrel + cap top-left, USB's shell top-right, both overhanging
    # the same edge, same as a real Uno).
    'Cube': 'usb',
    'Cube.001': 'jack',

    # Pin headers, identified by length against the 2.54mm pin pitch — this
    # is exact, not approximate: 19.9mm/2.54=7.8 (8-pin), 25.0mm/2.54=9.8
    # (10-pin), 15.0mm/2.54=5.9 (6-pin). Cross-checked against the pin counts
    # hardware-3d.js's own header() calls already use.
    'Cube.002': 'hdr-a1',   # 19.9mm long -> 8-pin power header
    'Cube.003': 'hdr-a2',   # 15.0mm long -> 6-pin analog header
    'Cube.004': 'hdr-d2',   # 25.0mm long -> 10-pin digital header
    'Cube.005': 'hdr-d1',   # 19.9mm long -> 8-pin digital header

    # ATmega328P: three objects share the exact same bounding-box center
    # (-10.2, -12.1mm), differing only in height — DIP body, pin legs, top
    # label decal. One stacked chip.
    'Cube.006': 'mcu',
    'Cube.007': 'mcu',
    'Plane.002': 'mcu',

    # 16MHz crystal: distinctive rounded-can (HC-49 style) shape, confirmed
    # visually next to the MCU.
    'Cube.010': 'xtal',

    # ICSP header for the ATmega328: 6-pin block on the board edge opposite
    # USB/jack, matching a real Uno's layout.
    'Cube.014': 'icsp',

    # Voltage regulator: TO-220-style block between the jack and the
    # crystal, confirmed visually.
    'Cube.017': 'reg',

    # Status LEDs: four objects, identical size and material — matches the
    # Uno's ON/L/TX/RX LED count exactly.
    'Cube.018': 'leds',
    'Cube.019': 'leds',
    'Cube.020': 'leds',
    'Cube.021': 'leds',

    # Reset button cap: red disc on the USB/jack edge, top corner.
    'Cylinder': 'reset',
}

# Sub-2mm SMD passives (resistors, caps, tiny ICs) the deck was never going
# to label individually. Kept as one object so they still exist and explode
# together, rather than silently vanishing.
CATCHALL = 'components'

# Triangle count above which solder.014 gets decimated, and the target ratio.
# 8000 keeps the check meaningful if this script is ever re-run on an
# already-processed file.
SOLDER_DECIMATE_TRIS = 8000
SOLDER_DECIMATE_RATIO = 0.15

TEXTURE_MAX_SIZE = 1024
JPEG_QUALITY = 82


def log(*args):
    print('[blender_prep]', *args)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if len(argv) != 2:
        print('usage: python3 tools/model/blender_prep.py <input.glb> <output.glb>')
        sys.exit(2)
    src, dst = argv

    bpy.ops.wm.read_factory_settings(use_empty=True)

    log('importing', src)
    bpy.ops.import_scene.gltf(filepath=src)

    mesh_objs = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
    log('imported', len(mesh_objs), 'mesh objects')

    # --- decimate the oversized solder-mask layer before joining anything
    solder = mesh_objs.get('solder.014')
    if solder is not None and len(solder.data.polygons) > SOLDER_DECIMATE_TRIS:
        before = len(solder.data.polygons)
        mod = solder.modifiers.new('deck-decimate', 'DECIMATE')
        mod.ratio = SOLDER_DECIMATE_RATIO
        bpy.context.view_layer.objects.active = solder
        bpy.ops.object.modifier_apply(modifier=mod.name)
        log('decimated solder.014:', before, '->', len(solder.data.polygons), 'tris')

    # --- group by target part name, then join each group into one object —
    # bake.js keys parts by node name, so two nodes sharing a name would
    # collide (last one silently wins, dropping geometry)
    groups = {}
    for name, obj in mesh_objs.items():
        target = NAME_MAP.get(name, CATCHALL)
        groups.setdefault(target, []).append(obj)

    for target, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        bpy.context.view_layer.objects.active.name = target
    log('grouped', len(mesh_objs), 'objects into', len(groups), 'parts:', ', '.join(sorted(groups)))

    # --- downscale textures: the source ships 4096x4096 PNGs (44MB for the
    # two diffuse maps alone); nothing at deck viewing size needs more than
    # 1024x1024, and the exporter recompresses as JPEG below
    for img in bpy.data.images:
        if max(img.size) > TEXTURE_MAX_SIZE:
            before = tuple(img.size)
            img.scale(TEXTURE_MAX_SIZE, TEXTURE_MAX_SIZE)
            log('downscaled', img.name, before, '->', tuple(img.size))

    # --- export: uncompressed (no Draco — bake.js reads raw accessors),
    # +Y up (default; leave alone), modifiers applied (decimate above must
    # land in the exported mesh), images recompressed as JPEG so the
    # embedded buffer bake.js reads stays small
    bpy.ops.export_scene.gltf(
        filepath=dst,
        export_format='GLB',
        export_apply=True,
        export_draco_mesh_compression_enable=False,
        export_image_format='JPEG',
        export_jpeg_quality=JPEG_QUALITY,
        export_image_quality=JPEG_QUALITY,
        export_yup=True,
    )
    log('exported', dst)


if __name__ == '__main__':
    main()
