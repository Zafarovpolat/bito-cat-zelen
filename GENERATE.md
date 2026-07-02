# Генерация фото товаров - GENERATE.md

## Что делает скрипт
Берёт фото товара (декоративной зелени) → использует **gpt-image-2** (режим edit) для обработки → убирает фон, выравнивает свет → сохраняет в `edited/` с правильным именем. Качество по умолчанию: **low** (быстро и экономно).

## Требования
- OPENAI_API_KEY в `.env` файле
- Оригинальное фото товара (JPG, PNG, WebP)

## Быстрый старт

### 1️⃣ Единичная генерация
```bash
npm run generate -- --input /path/to/photo.jpg --output "9001-Z-1-green-1.png"
```

Примеры:
```bash
# Фото в текущей папке
npm run generate -- --input ./my-photo.jpg --output "9001-Z-1-green-1.png"

# Фото в Downloads
npm run generate -- --input ~/Downloads/product.jpg --output "9010-Z-2-dark-green-1.png"
```

## Параметры скрипта

| Параметр | Обязательный | Описание |
|----------|:------:|---------|
| `--input` | ✅ | Путь к фото товара (абсолютный или относительный) |
| `--output` | ❌ | Имя выходного файла в `edited/` (по умолчанию: автогенерируемое имя) |
| `--prompt` | ❌ | Пользовательский промпт для GPT (см. ниже) |
| `--size` | ❌ | Размер выходного изображения (по умолчанию: `1024x1024`) |
| `--quality` | ❌ | Качество: `low` или `high` (по умолчанию: `low`) |

## Форматы имён файлов

Следуй формату из `AGENT.md`:
```
{SKU}-Z-{серия}-{вариант}-{номер}.png
```

Примеры:
```
9001-Z-1-green-1.png           ← основное фото
9001-Z-1-green-2.png           ← доп ракурс
9010-Z-2-dark-green-1.png      ← зелень серии Z-2
9050-Z-8-panel-1.png           ← панель серии Z-8
```

## Встроенные промпты

### Убрать фон (по умолчанию)
```
Remove the background. Place this exact decorative greenery product on a pure white background. 
Do not change any colors, texture or shape. Just replace background with clean white.
```

### Свой промпт
```bash
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Remove background and place on white. Add slight shadow beneath."
```

## Примеры использования

### Основное фото товара
```bash
npm run generate -- \
  --input ~/Downloads/greenery-product.jpg \
  --output "9001-Z-1-green-1.png"
```

### Дополнительный ракурс
```bash
npm run generate -- \
  --input ~/Downloads/side-view.jpg \
  --output "9001-Z-1-green-2.png"
```

### Панель 40×60 с кастомным промптом
```bash
npm run generate -- \
  --input ~/product-photo.jpg \
  --output "9050-Z-8-panel-1.png" \
  --prompt "Remove background. Place this 40x60 wall panel on white background. Keep colors exact."
```

### Большой размер для панели 100×100
```bash
npm run generate -- \
  --input ~/large-panel.jpg \
  --output "9100-Z-10-large-panel-1.png" \
  --size "1024x1024"
```

## Результаты

✅ После успешной генерации:
- Фото сохраняется в `edited/{outputFileName}`
- Логируется в `generation-log.jsonl` с временем и параметрами
- Готово к использованию в Bito и Supabase

❌ При ошибке:
- Проверь путь к исходному файлу
- Проверь OPENAI_API_KEY в `.env`
- Посмотри логи в `generation-log.jsonl`

## Логирование

Каждое поколение логируется в `generation-log.jsonl`:
```json
{
  "timestamp": "2025-07-03T12:34:56.789Z",
  "inputPath": "/Users/name/Downloads/photo.jpg",
  "outputFileName": "9001-Z-1-green-1.png",
  "outputPath": "/vercel/share/v0-project/edited/9001-Z-1-green-1.png",
  "size": "1024x1024",
  "prompt": "Remove the background...",
  "success": true
}
```

## Полный workflow

```bash
# 1. Генерируем фото
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"

# 2. Проверяем результат в edited/9001-Z-1-green-1.png

# 3. Если нужны правки — генерируем снова с другим промптом

# 4. Когда готово — пушим в гит и загружаем в Bito
npm run sync
```

## Полезные команды

```bash
# Только генерация (без загрузки)
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"

# Полный цикл: квадрат → Bito → Supabase (после генерации)
npm run sync

# Проверить логи генераций
cat generation-log.jsonl | jq .
```

## Требования к исходному фото

- ✅ Хорошее качество
- ✅ Четко видна зелень/товар
- ✅ Хороший свет
- ✅ Не обязательно белый фон (скрипт его заменит)
- ✅ JPG, PNG, WebP

## Ошибки и решения

| Ошибка | Решение |
|--------|---------|
| `Input file not found` | Проверь правильность пути к фото |
| `Missing OPENAI_API_KEY` | Добавь ключ в `.env` |
| `Response did not include image data` | Попробуй другое фото или промпт |
| API rate limit | Подожди несколько минут и повтори |

## Заметки

- **Не меняй форму/цвет зелени!** Скрипт меняет только фон
- **Размер по умолчанию 1024×1024** — хватает для каталога
- **Каждый запуск стоит денег** (OpenAI usage) — планируй заранее
- **Логи сохраняются всегда** — удобно для отслеживания
