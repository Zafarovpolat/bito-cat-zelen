# AGENT.md — ZELEN CATALOG WORKFLOW

## ОДНА СТРОКА: что делаем
Берём фото декоративной зелени (панели, листья, лианы, вьющиеся растения) → делаем каталожные (белый фон, ровный свет) → пушим в этот репо → загружаем в Bito + Supabase.

## ГЛАВНОЕ ПРАВИЛО
**Меняем ТОЛЬКО фон. Форму, текстуру, цвет зелени — НИКОГДА не меняем.**

## ПУТИ
```
Оригиналы:  originals/
Edited:     edited/
Этот репо:  ~/Documents/bito-cat-zelen/
Каталог:    https://zafarovpolat.github.io/bito-cat-zelen/
```

## ФОРМАТ ИМЁН ФАЙЛОВ
```
{SKU}-Z-{серия}-{вариант}-{номер}.png
Примеры:
  9001-Z-1-green-1.png        ← основное фото
  9001-Z-1-green-2.png        ← дополнительный ракурс
  9010-Z-2-dark-green-1.png
  9015-Z-3-mixed-1.png
       ^   ^   ^        ^
       SKU серия вариант номер фото (1=главное)
```

### Серии зелени (примерные):
```
Z-1   Декоративная трава         (газонные панели)
Z-2   Плющ / лианы               (вьющиеся растения)
Z-3   Папоротник                 (листья папоротника)
Z-4   Эвкалипт                   (ветки эвкалипта)
Z-5   Бамбук                     (стебли/листья бамбука)
Z-6   Суккуленты                 (мини-суккуленты)
Z-7   Микс зелени                (композиции)
Z-8   Зелёные панели 40×60       (настенные панели)
Z-9   Зелёные панели 50×50       (настенные панели)
Z-10  Зелёные панели 100×100     (большие панели)
```
> ⚠️ Серии — черновые! Обновить по мере поступления товаров из Bito.

## ПРОМПТЫ

### Убрать фон (с оригинала):
```
Remove the background. Place this exact decorative greenery product on a pure white background. Do not change any colors, texture or shape. Just replace background with clean white.
```

### Выровнять свет:
```
Even out the lighting. Make the white background uniformly bright. Keep all colors and textures of the greenery exactly the same.
```

### Обрезать по краям:
```
Crop the image tightly around the product with equal padding on all sides. Keep white background. Do not resize or change the product.
```

## ПОСЛЕ ПРАВКИ → ПУШ В GIT
```bash
cp EDITED_FILE.png ~/Documents/bito-cat-zelen/edited/
cd ~/Documents/bito-cat-zelen
git add edited/ && git commit -m "add: описание" && git push
```

## BITO / SUPABASE UPLOAD
```bash
cd ~/Documents/bito-cat-zelen
npm run sync   # square → bito → supabase (всё сразу)
```

## ОЖИДАЕТ ФОТО
> Пока фото нет — оболочка готова. Как появятся сгенерированные фото, кладём в `edited/` с правильным именем и пушим.
