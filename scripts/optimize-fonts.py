"""Rebuild checked-in WOFF2s with fonttools[woff]==4.61.1 from pinned Fontsource packages."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
for family, styles in [('fraunces', ['normal', 'italic']), ('inter', ['normal'])]:
    for style in styles:
        source = Path(f'node_modules/@fontsource-variable/{family}/files/{family}-latin-wght-{style}.woff2')
        font = instantiateVariableFont(TTFont(source), {'wght': 450 if family == 'fraunces' else (400, 700)}, inplace=False)
        font.flavor = 'woff2'
        target = f'fraunces-450-{style}' if family == 'fraunces' else 'inter-400-700'
        font.save(f'src/app/fonts/{target}.woff2')
