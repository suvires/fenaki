"""Static Archivo instances for the OG images: satori cannot read variable fonts.

Cuts three instances out of the variable Archivo that the site itself uses
(@fontsource-variable/archivo, latin subset) and writes them as WOFF next to its licence:

    PYTHONPATH=<fontTools + brotli> python3 packages/tokens/scripts/og-fonts.py

Run it again only if the variable font is updated.
"""

from pathlib import Path
import shutil

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "packages/tokens/node_modules/@fontsource-variable/archivo"
OUT = ROOT / "packages/tokens/og-fonts"

INSTANCES = {
    "archivo-display-75-800.woff": {"wdth": 75, "wght": 800},  # titles, like the site's display style
    "archivo-text-100-600.woff": {"wdth": 100, "wght": 600},
    "archivo-label-100-500.woff": {"wdth": 100, "wght": 500},
}

OUT.mkdir(parents=True, exist_ok=True)
for name, axes in INSTANCES.items():
    font = TTFont(SOURCE / "files/archivo-latin-wdth-normal.woff2")
    static = instantiateVariableFont(font, axes)
    static.flavor = "woff"
    static.save(OUT / name)
    print(name, (OUT / name).stat().st_size)
shutil.copy(SOURCE / "LICENSE", OUT / "OFL.txt")
