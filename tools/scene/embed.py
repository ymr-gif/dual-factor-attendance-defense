"""Drops tools/scene/scene.svg into the slide-8 markup in index.html."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX = os.path.join(ROOT, 'index.html')
SVG = os.path.join(ROOT, 'tools', 'scene', 'scene.svg')

svg = open(SVG).read()
svg = "\n".join("        " + line if line.strip() else line for line in svg.split("\n"))

html = open(INDEX).read()
start = html.index('        <svg class="rig-svg"')
end = html.index('        <p class="specs-caption">')
open(INDEX, 'w').write(html[:start] + svg + "\n" + html[end:])
print("embedded scene.svg into index.html")
