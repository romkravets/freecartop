# FreeCar Top 🚗

**Перевіряй авто без обману. Підбирай по потребах.**

Безкоштовний AI-інструмент для покупців авто на українському ринку. Чотири модулі:

1. **AI Аналізатор** — VIN-декодер, фото AI, перевірка Copart/IAAI, звіти CarVertical/AutoRIA, парсинг посилань auto.ria/OLX. AI видає рейтинг довіри 0–100 і готовий Instagram-пост
2. **AI Підбір авто** — гнучкий конфігуратор: слайдер бюджету, мульти-вибір мети і кузова, пріоритети, фільтр коробки і країни ввезення
3. **Симулятор Життя Авто** — AI моделює 5 років поломок, ТО і витрат для конкретної моделі
4. **Ринок** — live ціни з auto.ria (реальні IDs моделей), новини авторинку UA в реальному часі

---

## Demo

![App screenshot](./docs/screenshot.png)

---

## Стек

- **Next.js 14** (App Router, JSX)
- **Tailwind CSS 3** — темна тема (#080808)
- **Claude AI** (`claude-haiku-4-5-20251001`) — аналіз, підбір, симулятор
- **NHTSA VIN API** — безкоштовний декодер VIN
- **auto.ria scraping** — live ціни з правильними brand/model IDs

---

## Структура

```
freecartop/
├── app/
│   ├── api/
│   │   ├── analyze/        # AI-аналіз оголошення (VIN, фото, аукціони)
│   │   ├── vin-check/      # NHTSA decode + Copart/IAAI scrape
│   │   ├── photo-analyze/  # Claude vision — стан кузова по фото
│   │   ├── listing-parse/  # Парсинг auto.ria / OLX URL
│   │   ├── pick/           # AI підбір 3 авто
│   │   ├── car-events/     # AI симуляція 5 років (з кешем 12h)
│   │   ├── market-prices/  # Live ціни auto.ria (кеш 6h)
│   │   ├── market-news/    # Live новини auto.ria (кеш 2h)
│   │   └── market-insights/# AI-аналіз ринку по моделі
│   ├── layout.jsx
│   ├── globals.css
│   └── page.jsx            # Лендинг + SPA-навігація + mobile bottom nav
├── components/
│   ├── AIAnalyzer.jsx      # Форма з VIN, фото, URL; результат з ScoreRing
│   ├── AICarPicker.jsx     # Гнучкий конфігуратор (4 кроки, мульти-select)
│   ├── CarSimulator.jsx    # 5-річний симулятор з порівнянням двох авто
│   └── MarketDashboard.jsx # Live ціни, новини, перевірка ціни
└── lib/
    ├── carMarket.js        # Статична база цін і слабких місць моделей
    └── pickerData.js       # Дані для picker (fallback без AI)
```

---

## Запуск

```bash
npm install
npm run dev    # → http://localhost:3000
```

### Env змінні

```env
ANTHROPIC_API_KEY=sk-ant-...          # обов'язково для AI-функцій
NEXT_PUBLIC_AI_ENABLED=true           # вмикає AI-версії компонентів
NEXT_PUBLIC_SITE_URL=https://...      # для SEO og:url
```

Без `ANTHROPIC_API_KEY` застосунок працює зі статичними fallback-версіями (без Claude).

---

## Deploy

```bash
npm i -g vercel
vercel
# додай ANTHROPIC_API_KEY і NEXT_PUBLIC_AI_ENABLED=true у Vercel Settings → Environment Variables
```

---

## Як працює аналізатор

**Вхідні дані:**
- Основне: рік, пробіг, кількість власників, ціна, тижнів в оголошенні
- VIN-інспектор: автодекодування NHTSA + перевірка Copart/IAAI
- Фото: Claude vision (іржа, вм'ятини, кузовний ремонт)
- Звіт: вставка тексту з CarVertical/AutoRIA/CarFax
- URL: авто-парсинг посилання з auto.ria або OLX

**Виходить:**
- Рейтинг довіри 0–100 з вердиктом (`safe` / `caution` / `suspicious` / `run`)
- Список прапорців з severity (critical / high / medium / low)
- Прогноз ціни через рік
- Порада по торгу
- Готовий Instagram-пост для шерингу

---

## Live ціни auto.ria

`/api/market-prices` використовує реальні brand/model IDs з auto.ria API (не text-search), тому ціни точні для конкретної моделі:

```
Toyota Camry 2018  → brand.id=79 & model.id=698  → ~$19 800 (69 оголошень)
VW Passat 2016     → brand.id=84 & model.id=39690 → ~$13 700 (72 оголошення)
BMW 5 Series 2015  → brand.id=9  & model.id=2319  → ~$17 100 (72 оголошення)
```

Кеш 6h. 17 марок, ~100 моделей у маппінгу. Fallback → статична база.

---

Made by [@romkravets](https://github.com/romkravets)
