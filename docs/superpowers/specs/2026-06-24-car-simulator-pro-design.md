# CarSimulator Pro — Design Spec
**Date:** 2026-06-24  
**Project:** freecartop  
**Status:** Approved

---

## Overview

Повна переробка `CarSimulator` у "Car Life Game Pro" — інтерактивний симулятор що дозволяє запустити дуель між двома авто та порівняти реальну вартість їх використання за 5 років. Включає виправлення критичних багів, нові game-механіки, анімований WOW-ефект і share-картку.

---

## Bug Fixes (обов'язкові)

### 1. Health не накопичується між роками
**Проблема:** `liveMetrics` кожного року рахує стан з чистого `base.engine` з проєкції, ігноруючи `engineDelta` попередніх років.  
**Фікс:** Тримати `engineOffset / transOffset / bodyOffset` — акумулятори дельт з усіх пройдених років. При переході до нового року — додавати до `base.engine + engineOffset`.

### 2. Вердикт не враховує вартість ремонтів
**Проблема:** `buildVerdict` рахує `totalSpent = price + lastYear.totalMaint`, де `totalMaint` — тільки фіксовані витрати (масло, страховка). Event costs (ремонти) не включені.  
**Фікс:** В `startSim` після завершення — підсумувати всі `event.cost` зі всіх років і передавати `totalEventCost` окремо у вердикт.

### 3. `body` shadowing в `liveMetrics`
**Фікс:** Перейменувати `let body = base.body` → `let bodyHealth = base.body` в `useMemo`.

### 4. Фінальний стан у вердикті не враховує events
**Фікс:** Вердикт читає `finalEngine` з `liveMetrics` (що вже включає дельти), а не з `simData.years[SIM_YEARS].engine`.

---

## Architecture

### Нові файли
- `lib/carSimChart.js` — SVG-chart builder: будує `<polyline>` points з масиву `{ year, price, hasEvent }[]`
- `components/CarSimShare.jsx` — share-картка: текстовий share + стилізована HTML-картка

### Змінені файли
- `components/CarSimulator.jsx` — повна переробка (головний компонент)
- `lib/carSim.js` — bug fixes + нова функція `calcStressDelta(event)`
- `app/page.jsx` — додати таб `'simulator'`

---

## Data Structures

### CarProfile (без змін)
```js
{ make, model, year, mileage, price, importCountry, transmission, fuel, body, knownIssues }
```

### CarState (новий — per-car simulation state)
```js
{
  profile: CarProfile,
  simData: null,          // buildProjection result
  aiEvents: null,         // AI events array | null (fallback)
  engineOffset: 0,        // акумулятор дельт з попередніх років
  transOffset: 0,
  bodyOffset: 0,
  stress: 0,              // 0–100, зростає від дорогих ремонтів
  totalEventCost: 0,      // сума всіх event.cost за всі роки
  log: [],                // [{ year, icon, title, cost, carId, type }]
  gameOver: null,         // null | 'stress' | 'engine' | 'scrap'
  gameOverYear: null,
}
```

### SimState (глобальний)
```js
{
  phase: 'setup' | 'loading' | 'playing' | 'done',
  yearIndex: 0,           // 0–5, спільний для обох авто
  car1: CarState,
  car2: CarState | null,  // null якщо дуель не обрана
  isAutoPlay: false,
  speed: 1,               // 1 | 2 | 4
}
```

---

## Setup Flow

1. Юзер бачить форму "Моє авто" (існуюча форма CarSimulator)
2. Після заповнення — кнопка "⚔️ Порівняти з іншим авто" (optional, dashed border)
3. Якщо натиснув — з'являється друга форма "Суперник" під першою
4. Кнопка запуску:
   - 1 авто: `🔮 Симулювати`  
   - 2 авто: `⚔️ Симулювати дуель`

---

## Simulation Phase

### Завантаження
- `Promise.all([fetchAIEvents(car1), car2 ? fetchAIEvents(car2) : null, minDelay(2000)])`
- Loading messages враховують дуель: "AI генерує події для обох авто…"

### Екран симуляції (1 авто)
- Існуючий лейаут з bug fixes + stress meter + running log

### Екран симуляції (2 авто) — Split-screen
```
┌─────────────────────────────────────┐
│  Year 3 of 5    [Progress bar]      │
├────────────────┬────────────────────┤
│ 🚗 Car 1       │ 🚙 Car 2 (rival)   │
│ $10,640        │ $9,200             │
│ [Engine bar]   │ [Engine bar]       │
│ [Trans bar]    │ [Trans bar]        │
│ [Body bar]     │ [Body bar]         │
│ [😤 Stress]    │ [😤 Stress PULSE]  │
│ −$1,280/рік    │ −$3,940/рік        │
└────────────────┴────────────────────┘
│  💸 Race Bar: Camry $2,980 ▓▓▓░░░ BMW $7,840 │
├────────────────────────────────────────────────┤
│ [Наступний рік →]  [▶ Авто]  [2×]  [⏸]      │
├────────────────────────────────────────────────┤
│ [0][1р][2р][3р][4р][5р]  ← timeline dots      │
└────────────────────────────────────────────────┘
```

### Race Bar
- Горизонтальний бар розбитий навпіл: ліворуч `car1`, праворуч `car2`
- Ширина кожної половини = `totalSpent1 / (totalSpent1 + totalSpent2) * 100%`
- Анімація ширини при переході між роками (`transition: width 0.7s ease`)
- Переможець підсвічений amber, програє — блакитним

### Event Reveal (дорогий ремонт cost > $400)
- Slide-in картка з `translateX(-20px) → (0)` анімацією
- Показує: title, detail, cost (animate count), engineDelta/transDelta badges, `😤 Нерви +N`
- Стандартні дрібні події — compact view без анімації

### Stress Mechanics
- `calcStressDelta(event)`:
  - `cost > 1000` → `+25`
  - `cost > 400` → `+15`
  - `cost > 0` → `+5`
  - `engineDelta < -5` → `+10` додатково
- Stress знижується `−5` за рік якщо не було великих ремонтів
- При `stress > 80`: label стає "💀 НЕРВИ НА МЕЖІ", бар пульсує (CSS animation)

### Game-over умови (перевіряються після кожного року)
| Умова | Тип | Повідомлення |
|-------|-----|--------------|
| `stress >= 100` | `'stress'` | Власник не витримав — продав від нервів |
| `engine < 15` | `'engine'` | Двигун помер — тоталь |
| `totalEventCost > price * 0.7` | `'scrap'` | Ремонти з'їли авто — здав на металобрухт |

При game-over одного авто:
- Його колонка замінюється на cinematic game-over панель (dark radial gradient, анімація shake emoji)
- Друге авто продовжує симуляцію самостійно
- У running log з'являється запис `💀 [CarName] — вийшов з гри на році N`

### Health Accumulation
```js
// При кожному yearIndex change:
engineOffset += sum(currentYearEvents.map(e => e.engineDelta ?? 0))
transOffset  += sum(currentYearEvents.map(e => e.transDelta  ?? 0))
bodyOffset   += sum(currentYearEvents.map(e => e.bodyDelta   ?? 0))

// liveMetrics:
engine = clamp(base.engine + engineOffset, 5, 100)
trans  = clamp(base.trans  + transOffset,  5, 100)
body   = clamp(base.body   + bodyOffset,   5, 100)
```

### SVG Chart (`lib/carSimChart.js`)
- Функція `buildChartPoints(years, width, height)` → `{ points: string, eventDots: [{cx,cy,cost}] }`
- Chart малює тільки до `yearIndex` — далі пунктирна лінія прогнозу
- `stroke-dashoffset` анімація при появі нового відрізку
- Event dots: червоні кола, розмір пропорційний `cost` (min 4px, max 8px)
- 2 авто = 2 лінії: amber `#f59e0b` і indigo `#818cf8`

### Running Log
- Загальний для обох авто (якщо дуель)
- Кожен запис: `{ year, icon, title, cost, carId: 'car1'|'car2', type }`
- Badge `[Camry]` (amber) або `[BMW]` (indigo) для розрізнення
- Прокручуваний div, `scrollTop = scrollHeight` при кожному новому записі
- Max 100 записів в пам'яті (зрізати старі)

---

## Verdict Phase

### 1 авто — існуючий вердикт з bug fixes
- `totalSpent = price + totalFixedCost + totalEventCost`
- `realCost = totalSpent - resaleVal`
- `perMonth = realCost / (SIM_YEARS * 12)`

### 2 авто — Comparison Verdict
```
┌──────────────────┬──────────────────┐
│ 🏆 ПЕРЕМОЖЕЦЬ    │ 💸 ДОРОЖЧЕ       │
│ Toyota Camry     │ BMW 530d         │
│ $187/міс         │ $541/міс         │
│ Двигун 58        │ Продав р.4 💀    │
└──────────────────┴──────────────────┘
│    $21,360 — на стільки BMW дорожче  │
│    за 5 років                        │
└──────────────────────────────────────┘
```
- Переможець = менший `perMonth`
- Якщо авто вибуло достроково: рахувати `perMonth` тільки за роки до game-over
- Якщо обидва вибули: переможець той хто протримався довше

### Share Card (`components/CarSimShare.jsx`)
- HTML картка з даними (render в DOM)
- Кнопка "📱 Поділитись": `navigator.share({ text })` → fallback clipboard
- Share текст для 1 авто:
  ```
  🚗 Toyota Camry 2017 — 5 років симуляції
  💰 Реальна вартість: $187/міс
  🔧 Двигун після 5р: 58/100
  freecartop.vercel.app
  ```
- Share текст для дуелі:
  ```
  ⚔️ Toyota Camry vs BMW 530d — дуель на 5 років
  🏆 Toyota: $187/міс
  💸 BMW: $541/міс (+$21,360 за 5р)
  BMW продали на 4-му році від нервів 😅
  freecartop.vercel.app
  ```

---

## Page Integration (`app/page.jsx`)

Додати третій таб:
```js
const [view, setView] = useState('landing'); // + 'simulator'
```

- Навігація: `🔍 Аналізатор | 🎯 Підбір | 🔮 Симулятор`
- `dynamic(() => import('../components/CarSimulator'), { ssr: false })`
- Заголовок секції: `🔮 Симулятор Життя Авто`

---

## WOW Animations (CSS/inline styles)

| Елемент | Анімація |
|---------|----------|
| Stress > 80 | `@keyframes pulse` на бар + `text-shadow` glow на label |
| Event reveal (cost > 400) | `translateX(-20px → 0) + opacity 0→1`, 400ms |
| Cost number | `translateY(8px → 0) + opacity`, 600ms |
| Price change | `@keyframes countDown` — CSS counter або JS requestAnimationFrame |
| Game-over panel | `scale(0.95→1) + opacity`, radial gradient background |
| Game-over emoji | `@keyframes shake` — rotate ±5deg |
| Race bar | `transition: width 0.7s ease` |
| Chart line segment | `stroke-dashoffset` animation, 700ms per segment |
| Winner card | `radial-gradient glow` pulse на corner |

---

## Rate Limit Note

In-memory `rateLimitMap` в `/api/car-events` не працює на Vercel (скидається при cold start). Для цього проєкту — залишити as-is з коментарем TODO. Реальний фікс потребує Vercel KV або Edge Middleware, що виходить за scope цієї задачі.

---

## Out of Scope

- localStorage для збереження результатів (складніше, залишити на потім)
- звукові ефекти
- TypeScript міграція
- серверний рендеринг симулятора

---

## Success Criteria

1. CarSimulator доступний як таб на головній сторінці
2. Дуель: два авто симулюються паралельно у split-screen
3. Health коректно накопичується між роками
4. Вердикт включає event costs у підрахунку
5. Race bar оновлюється кожного року
6. Game-over спрацьовує при stress≥100, engine<15, або repairs>70% вартості
7. Running log показує всі події обох авто з бейджами
8. SVG chart малюється по роках з event dots
9. Share картка генерує текст для 1 авто і для дуелі
10. Всі WOW анімації плавні (60fps), не блокують UI
