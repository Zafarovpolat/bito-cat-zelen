# Все команды проекта

## 🎨 ГЕНЕРАЦИЯ ФОТ (новое!)

### Базовая генерация
```bash
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"
```

### С пользовательским промптом
```bash
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Remove background and place on white"
```

### Альтернатива на Python
```bash
python3 scripts/generate-product-photo.py --input ~/photo.jpg --output "9001-Z-1-green-1.png"
```

### Просмотр логов генераций
```bash
cat generation-log.jsonl | jq .
tail -5 generation-log.jsonl | jq '.[] | {timestamp, outputFileName, success}'
```

---

## 📦 ОБРАБОТКА ФОТ (существующие)

### Привести к квадрату (1:1)
```bash
npm run square
```
Берёт все PNG из `edited/` и приводит их к 1:1 с белыми полями.

### Загрузить в Bito
```bash
npm run bito
```
Загружает все фото из `edited/` на Bito (обложки товаров).

### Обновить Supabase
```bash
npm run supabase
```
Обновляет ссылки на фото в базе данных Supabase.

### Полный цикл (всё сразу)
```bash
npm run sync
```
Запускает: `square` → `bito` → `supabase`

---

## 🔧 РЕКОМЕНДУЕМЫЕ WORKFLOW'Ы

### Workflow 1: Генерация одного фото
```bash
# 1. Генерируем
npm run generate -- --input ~/product.jpg --output "9001-Z-1-green-1.png"

# 2. Проверяем результат в edited/9001-Z-1-green-1.png

# 3. Если нужно переделать
npm run generate -- --input ~/product.jpg --output "9001-Z-1-green-1.png" --force

# 4. Загружаем в Bito/Supabase
npm run sync
```

### Workflow 2: Пакетная генерация нескольких товаров
```bash
# Товар 1
npm run generate -- --input ~/photo1.jpg --output "9001-Z-1-green-1.png"

# Товар 2
npm run generate -- --input ~/photo2.jpg --output "9010-Z-2-dark-1.png"

# Товар 3
npm run generate -- --input ~/photo3.jpg --output "9020-Z-3-fern-1.png"

# После генерации всех — загружаем сразу
npm run sync
```

### Workflow 3: Несколько ракурсов одного товара
```bash
# Ракурс 1 (основной)
npm run generate -- --input ~/main.jpg --output "9001-Z-1-green-1.png"

# Ракурс 2 (боковой)
npm run generate -- --input ~/side.jpg --output "9001-Z-1-green-2.png"

# Ракурс 3 (сверху)
npm run generate -- --input ~/top.jpg --output "9001-Z-1-green-3.png"

# Загружаем
npm run sync
```

---

## 📊 ДИАГНОСТИКА

### Проверить статус генераций
```bash
# Все генерации
wc -l generation-log.jsonl

# Успешные
cat generation-log.jsonl | jq 'select(.success == true)' | wc -l

# Ошибки
cat generation-log.jsonl | jq 'select(.success == false)'

# Последние 10 операций
tail -10 generation-log.jsonl | jq .
```

### Проверить файлы в edited/
```bash
# Список с размерами
ls -lh edited/ | head -20

# Количество фото
ls edited/*.png | wc -l

# Самые новые
ls -lt edited/*.png | head -10
```

### Проверить переменные окружения
```bash
# Есть ли OPENAI_API_KEY
echo "OpenAI API Key: ${OPENAI_API_KEY:0:20}..."

# Все переменные
cat .env | grep -E "OPENAI|BITO|SUPABASE"
```

---

## 🐛 РЕШЕНИЕ ПРОБЛЕМ

### "Missing OPENAI_API_KEY"
```bash
# 1. Проверить .env файл
cat .env | grep OPENAI

# 2. Если пусто — добавить ключ
echo "OPENAI_API_KEY=sk-..." >> .env

# 3. Перезагрузить переменные
source .env
```

### "Input file not found"
```bash
# 1. Проверить путь
ls ~/photo.jpg

# 2. Использовать абсолютный путь
npm run generate -- --input /Users/name/Documents/photo.jpg --output "9001-Z-1-green-1.png"
```

### "Response did not include image data"
```bash
# 1. Проверить API ключ (возможно истёк)
# 2. Проверить баланс в OpenAI
# 3. Попробовать другое фото
npm run generate -- --input ~/better-photo.jpg --output "9001-Z-1-green-1.png"
```

### Фото генерируется плохо
```bash
# 1. Использовать лучшее исходное фото
# 2. Попробовать другой промпт
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Remove background carefully. Keep all details of the product. Place on pure white."

# 3. Попробовать размер побольше
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --size "1024x1024"
```

---

## 📖 ПОМОЩЬ

### Документация
- **Генерация**: `GENERATE.md`
- **Быстрый старт**: `QUICK_START.md`
- **Общая информация**: `AGENT.md`
- **Этот файл**: `COMMANDS.md`

### Примеры команд
```bash
# Получить помощь по скрипту
npm run generate -- --help

# Читать логи в реальном времени
tail -f generation-log.jsonl | jq .

# Ищи ошибки
grep "error" generation-log.jsonl | jq .
```

---

## ✅ ЧЕКЛИСТ ДО ПЕРВОГО ЗАПУСКА

- [ ] Скопирован `.env.example` → `.env`
- [ ] Добавлен `OPENAI_API_KEY` в `.env`
- [ ] Добавлены остальные переменные (BITO, SUPABASE)
- [ ] Запущена команда `npm install`
- [ ] Проверена папка `edited/` (должна существовать)
- [ ] Тестовая генерация: `npm run generate -- --input ~/test.jpg --output "test.png"`

---

## 🎯 ТИПИЧНЫЕ СЦЕНАРИИ

### Сценарий 1: Первый товар
```bash
# Подготовка
cp .env.example .env
# ← заполни OPENAI_API_KEY в .env

# Генерируем
npm run generate -- --input ~/greenery.jpg --output "9001-Z-1-green-1.png"

# Проверяем результат
ls -lh edited/9001-Z-1-green-1.png

# Загружаем
npm run sync
```

### Сценарий 2: Быстрая пакетная загрузка
```bash
# Быстро генерируем несколько товаров
npm run generate -- --input ~/p1.jpg --output "9001-Z-1-green-1.png"
npm run generate -- --input ~/p2.jpg --output "9010-Z-2-dark-1.png"
npm run generate -- --input ~/p3.jpg --output "9020-Z-3-fern-1.png"

# Один раз загружаем всё
npm run sync
```

### Сценарий 3: Регенерация одного фото
```bash
# Первый раз (создаёт файл)
npm run generate -- --input ~/photo.jpg --output "9001-Z-1-green-1.png"

# Не нравится результат? Генерируем снова с другим промптом
npm run generate -- \
  --input ~/photo.jpg \
  --output "9001-Z-1-green-1.png" \
  --prompt "Better background removal"

# Загружаем обновленную версию
npm run sync
```

---

## 💡 СОВЕТЫ И ТРЮКИ

```bash
# Алиас для быстрого генерирования
alias gen='npm run generate --'

# Использование:
gen --input ~/photo.jpg --output "9001-Z-1-green-1.png"

# Или добавь в ~/.bashrc или ~/.zshrc:
# echo "alias gen='npm run generate --'" >> ~/.bashrc
```

```bash
# Скрипт для пакетной генерации (save as batch-generate.sh)
#!/bin/bash
for file in ~/photos/*.jpg; do
  name=$(basename "$file" .jpg)
  npm run generate -- --input "$file" --output "$name.png"
done
```

```bash
# Просмотр всех успешных генераций за день
cat generation-log.jsonl | jq "select(.timestamp > \"$(date -u +%Y-%m-%d)\")"
```
