"""Lossy format copies for the 6 MB submission limit; preserve original captures."""
from pathlib import Path
from PIL import Image
for p in Path('figures').glob('mine-*.png'):
    Image.open(p).convert('RGB').save(p.with_suffix('.jpg'),quality=88,optimize=True,subsampling=0)
