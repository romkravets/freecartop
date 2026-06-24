# FreeCar Top 🚗

**Перевіряй авто без обману. Підбирай по потребах.**

Інструмент для покупців авто на українському ринку. Два модулі:

1. **Аналізатор оголошення** — вводиш дані з auto.ria/OLX і отримуєш рейтинг довіри з червоними прапорцями
2. **Підбір авто** — 5-кроковий wizard, підбирає топ-3 авто під бюджет і потреби

Натхнення: Instagram-пости типу "Власник цієї А6 грає по крупному 🚩".

---

## Стек

- **Next.js 14** (App Router, JSX, без TypeScript для простоти)
- **Tailwind CSS 3** — темна тема, кастомні кольори
- **Lucide React** — іконки
- Нема бекенду, нема БД — все pure functions на клієнті

---

## Структура

```
freecartop/
├── app/
│   ├── layout.jsx       # SEO metadata, шрифти Google Fonts
│   ├── globals.css      # Tailwind base + кастомні CSS-змінні
│   └── page.jsx         # Лендинг + SPA-навігація (landing | analyzer | picker)
├── components/
│   ├── CarAnalyzer.jsx  # Форма аналізу + результати (ScoreRing, FlagCard, ShareButton)
│   └── CarPicker.jsx    # Wizard 5 кроків + CarCard з результатами
└── lib/
    ├── analyzer.js      # analyzeRisk() + generateShareText() — вся логіка перевірок
    └── pickerData.js    # База авто UA ринку + pickCars() — алгоритм підбору
```

---

## Запуск

```bash
npm install
./node_modules/.bin/next dev --port 3001
# або
npm run dev    # → http://localhost:3000
```

---

## Логіка аналізатора (`lib/analyzer.js`)

`analyzeRisk(input)` — повертає `{ score, flags, positives, verdict, verdictColor, verdictEmoji }`.

Починаємо зі 100, кожен ризик знімає бали:

| Перевірка                                | Severity | Штраф |
| ---------------------------------------- | -------- | ----- |
| Скручений пробіг (diff > 100k)           | critical | −65   |
| Скручений пробіг (diff 50–100k)          | critical | −55   |
| Скручений пробіг (diff 20–50k)           | critical | −45   |
| Скручений пробіг (diff < 20k)            | critical | −35   |
| Підозріло малий пробіг без підтвердження | high     | −15   |
| 4+ власників                             | high     | −25   |
| 3 власники                               | medium   | −15   |
| Швидке переоформлення                    | high     | −16   |
| Авто з США                               | high     | −15   |
| Продається 2+ роки                       | critical | −22   |
| Продається 1–2 роки                      | high     | −14   |
| Ціна завищена > 30%                      | high     | −15   |
| Ціна нижча > 22% (підозріло дешево)      | critical | −20   |
| VIN не перевірено                        | low      | −5    |

**Рейтинг довіри:**

- 80–100 → ✅ Можна дивитись
- 60–79 → ⚠️ Обережно — торгуйся
- 35–59 → 🔴 Дуже підозріло
- 0–34 → ☠️ ТІКАЙ

`generateShareText()` — генерує текст у стилі Instagram-постів для шерингу.

---

## Алгоритм підбору (`lib/pickerData.js`)

`pickCars({ budget, purpose, body, fuel, priority })`:

1. Кожне авто з бази отримує `_score`:
   - budget match → +40
   - purpose match → +25
   - body match → +20
   - fuel match → +15
   - priority score × 3 (з `car.scores[priority]`)
   - avg total scores × 1.5
2. Фільтруємо тільки ті що відповідають бюджету (hard filter)
3. Сортуємо за `_score` → перші 3

### База авто (15 моделей)

| Бюджет  | Авто                                                                  |
| ------- | --------------------------------------------------------------------- |
| до $8k  | Toyota Corolla '06, Skoda Octavia A5, Mazda 3 '08                     |
| $8–15k  | Toyota Camry '06, Kia Sportage '12, Skoda Octavia A7, Toyota RAV4 '05 |
| $15–25k | Toyota Camry '17, Toyota RAV4 '13, Skoda Kodiaq '17, VW Passat B8     |
| $25k+   | Toyota RAV4 '19, Toyota Camry '21, Kia Sportage '22                   |

Кожне авто має: `scores` (reliability, economy, comfort, dynamics, safety — 0–10), `pros[]`, `cons[]`, `watchOut[]`.

---

## Deploy

### Vercel (рекомендовано)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
# publish: out/  (додай `output: 'export'` в next.config.js для static export)
```

---

## Env змінні

Проєкт не потребує жодних env змінних — все static, без API.

Опційно для SEO:

```env
NEXT_PUBLIC_SITE_URL=https://freecartop.vercel.app
```

---

## Плани розвитку

- [ ] Додати більше авто в базу (Mercedes, Honda, Hyundai)
- [ ] AI-summary через Claude API (опційно, з ключем)
- [ ] Парсер URL auto.ria — вставив посилання, бот витягає дані сам
- [ ] Порівняння двох оголошень
- [ ] Шерінг через Telegram-бота
- [ ] PWA для мобільного
