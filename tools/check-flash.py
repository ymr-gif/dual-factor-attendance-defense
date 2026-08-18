#!/usr/bin/env python3
"""Fails when a slide would paint its finished content before animating.

Every element an animation brings in from `opacity: 0` (or a scale) must carry
that same resting state in CSS — otherwise it renders at full strength until
anime.js applies the from-value on its first frame, and the slide looks like it
loads and then animates.

Reading the stylesheet is not enough: resting states often come from a base
class, so this loads the real deck in headless Chrome and measures computed
styles on slides that have not played yet.

    python3 tools/check-flash.py          # exits non-zero on a finding
"""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
ANIMATIONS = os.path.join(ROOT, 'src', 'js', 'animations.js')
TEMP = os.path.join(ROOT, '.flash-check.html')

CHROME_CANDIDATES = ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser')


def find_chrome():
    if os.environ.get('CHROME'):
        return os.environ['CHROME']
    for name in CHROME_CANDIDATES:
        found = shutil.which(name)
        if found:
            return found
    return None


def animated_targets():
    """Selectors an animation starts from a hidden or scaled state."""
    js = open(ANIMATIONS).read()
    blocks = re.findall(r"add\(\s*q\w*\(el,\s*'([^']+)'\)\s*,\s*\{(.*?)\}\s*,?\s*'?[^)]*\)", js, re.S)
    targets = []
    for selector, body in blocks:
        froms = {}
        for prop, values in re.findall(r"(\w+):\s*\[\s*([^\]]+)\]", body):
            froms[prop] = values.split(',')[0].strip()
        keep = {p: v for p, v in froms.items() if p in ('opacity', 'scale', 'scaleX', 'scaleY')}
        if keep:
            targets.append({'sel': selector, 'from': keep})
    return targets


AUDIT = """
<script>
  window.addEventListener('load', function () {
    var targets = %s;
    var findings = [];
    targets.forEach(function (t) {
      // only slides that have not played yet still show their resting state
      var el = document.querySelector('.slide:not(.active) ' + t.sel);
      if (!el) return;
      var cs = getComputedStyle(el);
      var problems = [];
      if (String(t.from.opacity || '').indexOf('0') === 0 && parseFloat(cs.opacity) > 0.01) {
        problems.push('renders at opacity ' + cs.opacity);
      }
      ['scale', 'scaleX', 'scaleY'].forEach(function (p) {
        if (t.from[p] !== undefined && parseFloat(t.from[p]) !== 1 && cs.transform === 'none') {
          problems.push(p + ' animates from ' + t.from[p] + ' but no transform is set');
        }
      });
      if (problems.length) findings.push(t.sel + ' — ' + problems.join('; '));
    });
    document.title = 'FLASHCHECK ' + JSON.stringify(findings);
  });
</script>
"""


def main():
    chrome = find_chrome()
    if not chrome:
        print('no Chrome found — set CHROME=/path/to/chrome', file=sys.stderr)
        return 2

    targets = animated_targets()
    html = open(INDEX).read().replace('</body>', AUDIT % json.dumps(targets) + '\n</body>')
    open(TEMP, 'w').write(html)

    try:
        out = subprocess.run(
            [chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
             '--virtual-time-budget=2000', '--dump-dom', 'file://' + TEMP],
            capture_output=True, text=True, timeout=120).stdout
    finally:
        os.remove(TEMP)

    match = re.search(r'FLASHCHECK (\[.*?\])</title>', out, re.S)
    if not match:
        print('could not read the audit result — did the deck fail to load?', file=sys.stderr)
        return 2

    findings = json.loads(match.group(1))
    print('checked %d animated targets' % len(targets))
    if not findings:
        print('all of them rest hidden — no flash')
        return 0

    print('\n%d will paint before animating:\n' % len(findings))
    for finding in findings:
        print('  ' + finding)
    print('\nGive each one its resting state in src/css/layout.css.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
