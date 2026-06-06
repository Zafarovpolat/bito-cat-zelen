# Bito + Supabase Photo Toolkit — Зелень

Набор инструментов для загрузки фото декоративной зелени в Bito ERP и Supabase.

## Быстрый старт

```bash
cp .env.example .env   # заполни ключи
npm install
```

## Команды

| Команда | Что делает |
|---------|-----------|
| `npm run square` | Приводит все PNG в `edited/` к квадрату 1:1 |
| `npm run bito` | Загружает все фото на Bito (обложка товара) |
| `npm run supabase` | Обновляет ссылки на фото в Supabase |
| `npm run sync` | Всё сразу: square → bito → supabase |

## Структура папок

```
edited/          ← PNG файлы с именем {SKU}-Z-{серия}-{вариант}-{N}.png
originals/       ← оригинальные фото до обработки
lib/
  bito.mjs       ← Bito API: upload, updateProduct, getProducts
  supabase.mjs   ← Supabase: updateImage, createProduct
scripts/
  make-square.py ← добавляет белые поля для 1:1
  upload-bito.mjs
  update-supabase.mjs
```

## Формат имён файлов

```
{SKU}-Z-{серия}-{вариант}-{номер}.png
Пример: 9001-Z-1-green-1.png
         ^    ^     ^      ^
         SKU  серия вариант номер фото (1=главное)
```

## Переменные окружения (.env)

```
BITO_API_KEY=dekor-house:...    ← из Bito → Настройки → Интеграции
BITO_JWT=Bearer eyJ...          ← из браузера DevTools (истекает через 30 дней)
BITO_ORG_ID=6701170d...         ← ID организации в Bito
BITO_PRICE_ID=6706187e...       ← ID прайса в Bito
SUPABASE_DSN=postgresql://...   ← строка подключения к БД
GITHUB_BASE=https://zafarovpolat.github.io/bito-cat-zelen/edited
```

## Обновление JWT токена Bito

JWT истекает через 30 дней. Чтобы получить новый:
1. Открой https://dekor-house.bito.uz
2. DevTools → Network → любой запрос к api.bito.uz
3. Headers → Authorization → скопировать Bearer eyJ...
4. Обновить в `.env`
