"""
Приводит все PNG из edited/ к квадратному формату 1:1.
Добавляет белые поля, продукт по центру, без обрезки, без AI.
Сохраняет поверх оригинала (или в отдельную папку если задать OUTPUT_DIR).
"""
import os
import sys
from pathlib import Path
from PIL import Image

EDITED_DIR = Path('/Users/sarvaribrokhimov/Documents/Codex/2026-05-09/files-mentioned-by-the-user-image/output/vetka-batch/edited')
OUTPUT_DIR = EDITED_DIR  # сохранять поверх (или задай другую папку)
BG_COLOR = (255, 255, 255)  # белый фон

files = sorted(EDITED_DIR.glob('*.png'))
print(f'Found {len(files)} PNG files')

ok = skipped = 0
for f in files:
    try:
        img = Image.open(f).convert('RGBA')
        w, h = img.size

        if w == h:
            skipped += 1
            continue  # уже квадрат

        size = max(w, h)
        canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        x = (size - w) // 2
        y = (size - h) // 2
        canvas.paste(img, (x, y), img)  # сохраняет прозрачность

        # Конвертируем в RGB (белый фон под прозрачными пикселями)
        result = Image.new('RGB', (size, size), BG_COLOR)
        result.paste(canvas, mask=canvas.split()[3])  # alpha channel as mask

        out_path = OUTPUT_DIR / f.name
        result.save(out_path, 'PNG', optimize=True)
        print(f'  {f.name}: {w}x{h} -> {size}x{size}')
        ok += 1
    except Exception as e:
        print(f'  ERR {f.name}: {e}')

print(f'\nDone: {ok} converted, {skipped} already square')
