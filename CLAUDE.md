# FreeCar Top — CLAUDE.md

## Що це за проєкт

Інструмент для покупців авто в Україні. Два модулі:
1. **Аналізатор оголошення** — детектор ризиків (скручений пробіг, підозрілі власники, завищена ціна, довге оголошення)
2. **Підбір авто** — 5-кроковий wizard → топ-3 авто під потреби користувача

Натхнення: Instagram-пости стилю "Власник цієї А6 грає по крупному 🚩 що ми маєм? 👇"

---

## Стек

- **Runtime:** Node.js 20+
- **Framework:** Next.js 14 (App Router)
- **Мова:** JavaScript (JSX, без TypeScript)
- **Стилі:** Tailwind CSS 3 + кастомні CSS-змінні
- **Іконки:** Lucide React
- **Деплой:** Vercel
- **БД:** немає — все pure functions на клієнті

---

## Структура проєкту

```
app/
  layout.jsx        # SEO metadata, Google Fonts
  globals.css       # Tailwind base + CSS vars (--bg, --surface, --border...)
  page.jsx          # Лендинг + SPA-навігація: 'landing' | 'analyzer' | 'picker'

components/
  CarAnalyzer.jsx   # Форма + результати: ScoreRing, FlagCard, ShareButton
  CarPicker.jsx     # Wizard 5 кроків: OptionCard, ProgressBar, CarCard

lib/
  analyzer.js       # analyzeRisk() + generateShareText() — вся бізнес-логіка
  pickerData.js     # База авто UA ринку + pickCars()
```

---

## Запуск

```bash
npm install
npm run dev           # http://localhost:3000

# Якщо npm run dev не спрацьовує (термінал не в папці проєкту):
cd /Users/romkravets/Documents/GitHub/freecartop
./node_modules/.bin/next dev --port 3001
```

---

## Аналізатор ризиків (`lib/analyzer.js`)

### `analyzeRisk(input)` → `{ score, flags, positives, verdict, verdictColor, verdictEmoji }`

**Вхідні параметри:**
```js
{
  year: number,           // рік випуску авто
  claimedMileage: number, // заявлений пробіг в км
  prevMileage1?: number,  // попередній пробіг зі старого оголошення
  prevMileage2?: number,  // ще один запис пробігу (необов'язково)
  owners: number,         // кількість власників
  regYear?: number,       // рік першої реєстрації в UA
  importCountry: string,  // 'ua' | 'eu' | 'de' | 'usa' | 'other'
  priceAsked?: number,    // ціна продавця ($)
  marketPrice?: number,   // ринкова ціна аналогів ($)
  weeksOnSale?: number,   // тижнів в оголошенні
  fastReReg?: boolean,    // швидке переоформлення
  vinChecked?: boolean,   // VIN вже перевірено
}
```

**Логіка штрафів (score починається зі 100):**
- Скручений пробіг: −35 до −65 залежно від різниці
- 4+ власників: −25; 3 власники: −15; 2 власники: −3
- Швидке переоформлення: −16
- Авто з США: −15
- Продається 2+ роки: −22; 1–2 роки: −14; 6–12 міс: −6
- Ціна >30% вища: −15; >22% нижча (підозріло!): −20
- VIN не перевірено: −5

**Вердикти:**
- ≥80 → ✅ "Можна дивитись — стандартна перевірка"
- ≥60 → ⚠️ "Обережно — торгуйся і перевіряй ретельно"
- ≥35 → 🔴 "Дуже підозріло — краще пропустити"
- <35 → ☠️ "ТІКАЙ — класична пастка"

### `generateShareText(carInfo, result, marketPrice)` → string

Генерує текст у стилі Instagram-постів:
```
Toyota Camry 2017 — аналіз від freecartop 🚘
що ми маємо? 👇

1. Пробіг скручений на 214k км
...
📊 Рейтинг довіри: 12/100
☠️ Вердикт: ТІКАЙ — класична пастка

Перевірено на freecartop.vercel.app
```

---

## Підбір авто (`lib/pickerData.js`)

### `pickCars({ budget, purpose, body, fuel, priority })` → `Car[]` (max 3)

**Алгоритм:**
1. Кожне авто отримує `_score`: budget+40, purpose+25, body+20, fuel+15, priority×3, avg_scores×1.5
2. Hard filter: тільки авто що відповідають бюджету
3. Сортування за score → топ-3

**Дані авто (кожне авто містить):**
```js
{
  id, make, model, generation,
  budget: string[],   // ['micro', 'mid', 'upper', 'premium']
  purpose: string[],  // ['daily', 'family', 'offroad', 'status', 'economy']
  body: string[],     // ['sedan', 'suv', 'hatch', 'minivan']
  fuel: string[],     // ['gasoline', 'diesel', 'hybrid', 'electric']
  priceRange: string, // "$8 500–14 000"
  scores: { reliability, economy, comfort, dynamics, safety }, // 0-10
  pros: string[],
  cons: string[],
  watchOut: string[], // на що звернути увагу при покупці
  icon: string,       // emoji прапору країни
}
```

**Бюджети:**
- `micro` → до $8 000
- `mid` → $8 000–15 000
- `upper` → $15 000–25 000
- `premium` → $25 000+

---

## UI компоненти

### CarAnalyzer.jsx
- `ScoreRing` — SVG анімоване кільце, колір залежить від score
- `FlagCard` — розкривний прапорець (критичний/серйозний/варто знати/інфо)
- `ShareButton` — `navigator.share()` або fallback до `clipboard.writeText()`
- `Toggle`, `OwnerSelector`, `NumberInput`, `TextInput` — form controls
- Всі перевірки рахуються через `useMemo` — оновлюються моментально

### CarPicker.jsx
- `ProgressBar` — 5 кроків, анімація заповнення
- `OptionCard` — картка вибору (бюджет/ціль/кузов/пальне/пріоритет)
- `CarCard` — розкривна картка авто: ScoreBar×5, pros/cons, watchOut
- `ScoreBar` — 10-сегментна смуга (зелена/жовта/помаранчева/червона)
- Вибір будь-якого кроку → автоматично переходить на наступний (delay 200ms)

---

## Головна сторінка (`app/page.jsx`)

SPA з трьома "view":
- `'landing'` — лендинг з прикладами, "як це працює", CTA кнопки
- `'analyzer'` — CarAnalyzer + sticky nav
- `'picker'` — CarPicker + sticky nav

Обидва компоненти завантажуються через `next/dynamic` з `ssr: false`.

---

## Стилі і теми

```css
/* CSS змінні в globals.css */
--bg: #080808          /* фон сторінки */
--surface: #111111     /* картки */
--surface-2: #1a1a1a   /* підрівень */
--border: #252525      /* межі */
--accent: #f59e0b      /* amber — основний акцент */
```

Severity кольори:
- `critical` → red-950 border-red-700
- `high` → orange-950 border-orange-700
- `medium` → amber-950 border-amber-700
- `low` → zinc-900 border-zinc-700

Verdicts:
- `green` → ≥80
- `yellow` → ≥60
- `orange` → ≥35
- `red` → <35

---

## Критичні правила

### Логіка аналізатора — незмінювані правила
- `prevMileage > claimedMileage` → ЗАВЖДИ critical severity, незалежно від суми різниці
- Ціна підозріло низька (< −22%) → critical, НЕ medium — дешево теж небезпечно
- Score `Math.max(0, Math.min(100, score))` — завжди в межах 0–100
- `generateShareText` — НЕ включай особисті дані (телефони, імена) у share-текст

### Підбір авто
- `pickCars()` завжди повертає ≤3 результати (`.slice(0, 3)`)
- Hard filter по бюджету — якщо немає авто в бюджеті, повертаємо порожній масив (показуємо "не знайдено")
- Scores в базі: `reliability` від 1 до 10, ніколи не залишай 0 — це не "немає даних", краще вилучи авто

### Додавання авто в базу
```js
// Мінімальна структура нового авто:
{
  id: 'unique-id',          // lowercase, через дефіс
  make: 'Honda',
  model: 'CR-V',
  generation: '2017–2022',
  budget: ['mid', 'upper'], // може бути кілька бюджетів
  purpose: ['family', 'daily'],
  body: ['suv'],
  fuel: ['gasoline', 'diesel'],
  priceRange: '$13 000–19 000',
  scores: { reliability: 8, economy: 7, comfort: 8, dynamics: 5, safety: 8 },
  pros: ['Відмінна якість збірки', '...'],
  cons: ['Дорогі запчастини', '...'],
  watchOut: ['Перевір CVT автомат', '...'],
  icon: '🇯🇵',
}
```

---

## Env змінні

```env
# Опційно — тільки для SEO meta
NEXT_PUBLIC_SITE_URL=https://freecartop.vercel.app
```

Проєкт НЕ потребує жодних API ключів. Вся логіка на клієнті.

---

## Деплой

```bash
# Vercel (рекомендовано)
npm i -g vercel
vercel

# Build перевірка
npm run build    # має завершитись без помилок
```

---

## Що НЕ робити

- Не додавати серверний код (API routes) без потреби — проєкт навмисно static
- Не імпортувати Lucide компоненти яких немає у встановленій версії — перевіряй наявність
- Не захардкоджувати ціни без позначки року — ринок змінюється, вказуй `priceRange` як рядок
- Не видаляти `'use client'` з компонентів — вони всі клієнтські (useState, useMemo)
- Не логувати персональні дані користувача
- Не "покращувати" алгоритм штрафів без тестування — зміни балансу ламають UX
