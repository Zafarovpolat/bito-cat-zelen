# Генерация фото товаров — Быстрая шпаргалка

**Модель:** gpt-image-2 (edit mode) | **Качество:** low (по умолчанию)

## 🚀 Самый быстрый старт

```bash
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"
```

Готово! Фото сохранится в `edited/9001-Z-1-green-1.png` с качеством low

---

## 📋 Примеры для разных типов товаров

### Зелень (серия Z-1)
```bash
npm run generate -- --input ~/greenery.jpg --output "9001-Z-1-green-1.png"
npm run generate -- --input ~/greenery2.jpg --output "9001-Z-1-green-2.png"
```

### Плющ/лианы (серия Z-2)
```bash
npm run generate -- --input ~/ivy.jpg --output "9010-Z-2-dark-green-1.png"
```

### Папоротник (серия Z-3)
```bash
npm run generate -- --input ~/fern.jpg --output "9020-Z-3-fern-1.png"
```

### Панели 40×60 (серия Z-8)
```bash
npm run generate -- --input ~/panel.jpg --output "9050-Z-8-panel-1.png"
```

### Панели 100×100 (серия Z-10)
```bash
npm run generate -- --input ~/large-panel.jpg --output "9100-Z-10-large-panel-1.png"
```

---

## ⚙️ Доступные параметры

```bash
npm run generate -- \
  --input <path>              # Путь к исходному фото (обязательно)
  --output <name>             # Имя файла в edited/ (опционально)
  --prompt <text>             # Пользовательский промпт (опционально)
  --size "1024x1024"          # Размер (опционально, по умолчанию 1024x1024)
```

---

## 🎯 Пользовательские промпты

### Убрать только фон (по умолчанию)
```bash
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png"
```

### Убрать фон + добавить тень
```bash
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Remove background. Place product on white background with subtle shadow."
```

### Убрать фон + выровнять свет
```bash
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Remove background and even out lighting. Place on pure white background."
```

### Для панелей (настенные)
```bash
npm run generate -- \
  --input ~/panel.jpg \
  --output "9050-Z-8-panel-1.png" \
  --prompt "Remove background. Keep the 40x60 wall panel exactly as is. Place on white background."
```

---

## 📁 Форматы имён (важно!)

```
{SKU}-Z-{серия}-{вариант}-{номер}.png
```

### Примеры правильных имён:
- ✅ `9001-Z-1-green-1.png` — основное фото
- ✅ `9001-Z-1-green-2.png` — дополнительный ракурс
- ✅ `9010-Z-2-dark-green-1.png` — плющ тёмно-зелёный
- ✅ `9050-Z-8-panel-1.png` — панель 40×60
- ✅ `9100-Z-10-large-panel-1.png` — панель 100×100

### Неправильные имена (не используй!):
- ❌ `photo.png` — нет SKU
- ❌ `9001-green.png` — нет серии
- ❌ `9001_z_1_green_1.png` — неправильный разделитель

---

## 🔄 Полный workflow

```bash
# 1. Генерируем фото
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"

# 2. Проверяем результат
ls -lh edited/9001-Z-1-green-1.png

# 3. Если нужны доработки — генерируем снова с другим промптом
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png" --prompt "Better prompt"

# 4. Когда готово — загружаем в Bito и Supabase
npm run sync
```

---

## 🛠️ Альтернатива: Python версия

Если Node.js версия не работает, попробуй Python:

```bash
# Требует: pip install requests
python3 scripts/generate-product-photo.py --input ~/photo.jpg --output "9001-Z-1-green-1.png"
```

---

## 📊 Проверка результатов

После генерации фото автоматически логируются в `generation-log.jsonl`:

```bash
# Просмотреть последние операции
tail generation-log.jsonl | jq .

# Вывести красиво
cat generation-log.jsonl | jq '.[] | {timestamp, outputFileName, success}'
```

---

## ⚠️ Ошибки и решения

| Ошибка | Что делать |
|--------|-----------|
| `Input file not found` | Проверь путь: `ls ~/photo.jpg` |
| `Missing OPENAI_API_KEY` | Добавь ключ в `.env` |
| `429 rate limit` | Подожди 5-10 минут и повтори |
| Фото получилось плохо | Используй лучшее исходное фото или другой промпт |

---

## 💰 Стоимость

Каждая генерация стоит деньги (OpenAI API):
- ~$0.02-0.05 за одно фото в зависимости от размера
- Все операции логируются для учёта

---

## 🎁 Советы

1. **Исходное фото** — чем лучше качество, тем лучше результат
2. **Несколько вариантов** — можешь генерировать один товар несколько раз
3. **Пользовательские промпты** — экспериментируй с описаниями
4. **Логи** — всегда проверяй `generation-log.jsonl` для отладки

---

## 📞 Нужна помощь?

- Полная документация: `GENERATE.md`
- Общая информация о проекте: `AGENT.md`
- Мой вопрос: поищи в логах `cat generation-log.jsonl | grep error`
