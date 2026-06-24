# CarSimulator Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переписати CarSimulator у повноцінну "Car Life Game Pro" — дуель двох авто за 5 років з накопиченням здоров'я, стресом, race bar, game-over механіками, анімованим SVG-графіком та share-карткою. Інтегрувати як 3-й таб у page.jsx.

**Architecture:** Мінімальна серверна логіка без змін. Вся game-логіка — в клієнтському CarSimulator.jsx. Чиста функція `carStateAt()` деривує весь стан кожного авто з `simData + yearIndex` — жодного стейту-накопичувача, лише yearIndex рухається вперед. Два нові файли: `lib/carSimChart.js` (SVG-точки) і `components/CarSimShare.jsx` (share картка).

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS 3, Anthropic Claude Haiku API (existing), JavaScript/JSX (no TypeScript)

---

## File Map

| Файл | Дія | Відповідальність |
|------|-----|-----------------|
| `lib/carSim.js` | Modify | Bug fixes: `buildVerdict(+totalEventCost)`, нова `calcStressDelta()` |
| `lib/carSimChart.js` | Create | Чиста функція SVG-points з масиву years |
| `components/CarSimulator.jsx` | Rewrite | Весь game UI: setup dual-car, split-screen, log, chart, verdict |
| `components/CarSimShare.jsx` | Create | Share картка + кнопка |
| `app/page.jsx` | Modify | Додати таб `'simulator'` |

---

## Task 1: Fix `lib/carSim.js` — buildVerdict + calcStressDelta

**Files:**
- Modify: `lib/carSim.js`

- [ ] **Step 1: Додати `calcStressDelta` і виправити `buildVerdict`**

Відкрий `lib/carSim.js`. Знайди рядок `export function buildVerdict(profile, years) {` (~311) і замінь сигнатуру. Потім додай нову функцію перед нею:

```js
// Додати ПЕРЕД buildVerdict (після FALLBACK_EVENTS):
export function calcStressDelta(event) {
  const cost = event.cost ?? 0;
  let delta = 0;
  if (cost > 1000) delta += 25;
  else if (cost > 400) delta += 15;
  else if (cost > 0) delta += 5;
  if ((event.engineDelta ?? 0) < -5) delta += 10;
  return delta;
}

// Змінити сигнатуру buildVerdict:
export function buildVerdict(profile, years, totalEventCost = 0) {
  const lastYear = years[years.length - 1];
  const totalSpent = profile.price + lastYear.totalMaint + totalEventCost; // FIX: was missing totalEventCost
  const resaleVal  = lastYear.price;
  const realCost   = totalSpent - resaleVal;
  const perYear    = Math.round(realCost / SIM_YEARS);
  const perMonth   = Math.round(realCost / (SIM_YEARS * 12));
  // ... решта без змін
```

Повний виправлений `buildVerdict`:

```js
export function buildVerdict(profile, years, totalEventCost = 0) {
  const lastYear = years[years.length - 1];
  const totalSpent = profile.price + lastYear.totalMaint + totalEventCost;
  const resaleVal  = lastYear.price;
  const realCost   = totalSpent - resaleVal;
  const perYear    = Math.round(realCost / SIM_YEARS);
  const perMonth   = Math.round(realCost / (SIM_YEARS * 12));

  const finalEngine = lastYear.engine;
  const makeData    = getMakeData(profile.make);

  let emoji, title, text;

  if (finalEngine >= 70 && perMonth < 250) {
    emoji = '🏆'; title = 'Відмінна покупка';
    text = `${makeData.label} тримає ціну і надійний. За 5 років реальна вартість використання — $${perMonth}/місяць. Менше за оренду авто.`;
  } else if (finalEngine >= 55 && perMonth < 400) {
    emoji = '✅'; title = 'Хороша інвестиція';
    text = `Нормальне авто за свої гроші. $${perMonth}/міс — прийнятно для UA ринку. Слідкуй за двигуном.`;
  } else if (finalEngine >= 40 && perMonth < 600) {
    emoji = '⚠️'; title = 'Прийнятно, але з ризиками';
    text = `Авто ще їздить, але витрати зростають. $${perMonth}/міс. На горизонті — капремонт або продаж.`;
  } else {
    emoji = '💀'; title = 'Грошова яма';
    text = `За 5 років витратиш більше, ніж коштує авто. Двигун на межі. $${perMonth}/міс — дорого. Краще продати зараз.`;
  }

  return {
    emoji, title, text,
    buyPrice:    profile.price,
    resaleVal,
    totalMaint:  lastYear.totalMaint,
    totalEventCost,
    totalSpent,
    realCost,
    perYear,
    perMonth,
    finalEngine,
    finalTrans:  lastYear.trans,
    finalBody:   lastYear.body,
  };
}
```

- [ ] **Step 2: Перевір що файл компілюється**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && node -e "
const { calcStressDelta, buildVerdict, buildProjection } = require('./lib/carSim.js');
const prof = { make:'Toyota', model:'Camry', year:2017, mileage:95000, price:14000, importCountry:'ua', transmission:'auto', fuel:'gasoline', body:'sedan', knownIssues:'' };
const proj = buildProjection(prof);
const v = buildVerdict(prof, proj.years, 1500);
console.log('totalSpent:', v.totalSpent, '(має бути price + maint + 1500)');
console.log('calcStressDelta repair 500:', calcStressDelta({cost:500, engineDelta:0}));
console.log('calcStressDelta engine kill:', calcStressDelta({cost:1200, engineDelta:-8}));
"
```

Очікуваний вивід:
```
totalSpent: [price + ~2600 + 1500]
calcStressDelta repair 500: 15
calcStressDelta engine kill: 35
```

- [ ] **Step 3: Commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add lib/carSim.js && git commit -m "fix(carSim): include event costs in verdict, add calcStressDelta"
```

---

## Task 2: Create `lib/carSimChart.js`

**Files:**
- Create: `lib/carSimChart.js`

- [ ] **Step 1: Написати файл**

```js
// lib/carSimChart.js
// Pure functions for SVG chart generation — no React deps

/**
 * Converts array of year prices into SVG polyline points string.
 * @param {number[]} prices  — array length SIM_YEARS+1 (index 0 = purchase price)
 * @param {number}   upTo    — draw solid line only up to this year index (inclusive)
 * @param {number}   W       — SVG viewBox width
 * @param {number}   H       — SVG viewBox height
 * @param {number}   maxP    — max price for Y-axis scaling
 * @returns {{ solid: string, dashed: string }} — two polyline points strings
 */
export function buildChartPoints(prices, upTo, W, H, maxP) {
  const PAD = { top: 10, bottom: 10, left: 8, right: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;
  const n      = prices.length - 1; // number of intervals

  const toX = i  => PAD.left + (i / n) * innerW;
  const toY = p  => PAD.top  + (1 - (p / maxP)) * innerH;

  const pts = prices.map((p, i) => `${toX(i)},${toY(p)}`);

  return {
    solid:  pts.slice(0, upTo + 1).join(' '),
    dashed: pts.slice(upTo).join(' '),   // starts at upTo so lines connect
    points: pts,
    toX,
    toY,
  };
}

/**
 * Returns event dot positions for years that have expensive events (cost > 400).
 * @param {object[]} years  — simData.years array
 * @param {number[]} prices — same prices array used in buildChartPoints
 * @param {Function} toX    — x-coordinate function from buildChartPoints
 * @param {Function} toY    — y-coordinate function from buildChartPoints
 */
export function buildEventDots(years, prices, toX, toY) {
  const dots = [];
  for (let i = 1; i < years.length; i++) {
    const expensiveEvents = (years[i].events ?? []).filter(e => (e.cost ?? 0) > 400);
    if (expensiveEvents.length > 0) {
      const totalCost = expensiveEvents.reduce((s, e) => s + e.cost, 0);
      const r = Math.min(8, Math.max(4, 4 + totalCost / 800));
      dots.push({ cx: toX(i), cy: toY(prices[i]), r, cost: totalCost, year: i });
    }
  }
  return dots;
}
```

- [ ] **Step 2: Перевір що імпортується без помилок**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && node -e "
const { buildChartPoints } = require('./lib/carSimChart.js');
const prices = [14000, 12880, 11850, 10900, 10040, 9240];
const r = buildChartPoints(prices, 3, 300, 80, 14000);
console.log('solid points (0-3):', r.solid);
console.log('dashed points (3-5):', r.dashed);
"
```

Очікуваний вивід: два рядки з SVG координатами, solid від 0 до 3-го року, dashed від 3 до 5.

- [ ] **Step 3: Commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add lib/carSimChart.js && git commit -m "feat: add carSimChart pure SVG point generator"
```

---

## Task 3: `components/CarSimShare.jsx` — Share картка

**Files:**
- Create: `components/CarSimShare.jsx`

- [ ] **Step 1: Написати компонент**

```jsx
'use client';
// components/CarSimShare.jsx
import { useState } from 'react';

function fmt(n) { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }

export default function CarSimShare({ car1Result, car2Result, car1Profile, car2Profile }) {
  const [copied, setCopied] = useState(false);

  const isRace = Boolean(car2Result);
  const winner = isRace
    ? (car1Result.perMonth <= car2Result.perMonth ? 'car1' : 'car2')
    : null;

  function buildShareText() {
    if (!isRace) {
      const r = car1Result;
      return [
        `🚗 ${car1Profile.make} ${car1Profile.model} ${car1Profile.year} — 5 років симуляції`,
        `💰 Реальна вартість: ${fmtD(r.perMonth)}/міс`,
        `🔧 Двигун після 5р: ${r.finalEngine}/100`,
        `📦 Залишкова ціна: ${fmtD(r.resaleVal)}`,
        ``,
        `freecartop.vercel.app`,
      ].join('\n');
    }

    const r1 = car1Result, r2 = car2Result;
    const win = winner === 'car1' ? car1Profile : car2Profile;
    const los = winner === 'car1' ? car2Profile : car1Profile;
    const winR = winner === 'car1' ? r1 : r2;
    const losR = winner === 'car1' ? r2 : r1;
    const diff = Math.abs(r1.realCost - r2.realCost);

    const gameOverLine = losR.gameOver
      ? `${los.make} продали на ${losR.gameOver.year}-му році — ${losR.gameOver.type === 'stress' ? 'нерви не витримали 😅' : losR.gameOver.type === 'engine' ? 'двигун помер 💀' : 'ремонти з\'їли авто 🔩'}`
      : '';

    return [
      `⚔️ ${win.make} ${win.model} vs ${los.make} ${los.model} — дуель на 5 років`,
      `🏆 ${win.make}: ${fmtD(winR.perMonth)}/міс`,
      `💸 ${los.make}: ${fmtD(losR.perMonth)}/міс (+${fmtD(diff)} за 5р)`,
      gameOverLine,
      ``,
      `freecartop.vercel.app`,
    ].filter(Boolean).join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!car1Result) return null;

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-800/30 rounded-2xl p-5 space-y-4">
      <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">
        🚗 FreeCar Top · {isRace ? '5-річна дуель' : '5-річна симуляція'}
      </div>

      {isRace ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { profile: car1Profile, result: car1Result, isWinner: winner === 'car1' },
            { profile: car2Profile, result: car2Result, isWinner: winner === 'car2' },
          ].map(({ profile, result, isWinner }) => (
            <div
              key={profile.make}
              className={`rounded-xl p-3 text-center ${isWinner ? 'bg-green-950/50 border border-green-800' : 'bg-red-950/30 border border-red-900'}`}
            >
              <div className={`text-xs font-bold mb-1 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? '🏆 ПЕРЕМОЖЕЦЬ' : '💸 ДОРОЖЧЕ'}
              </div>
              <div className="text-sm font-bold text-white">{profile.make} {profile.model}</div>
              <div className={`text-xl font-black font-mono mt-1 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {fmtD(result.perMonth)}/міс
              </div>
              {result.gameOver && (
                <div className="text-xs text-red-500 mt-1">
                  вийшов р.{result.gameOver.year}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <div className="text-xs text-zinc-500 mb-1">Реальна вартість</div>
          <div className="text-3xl font-black font-mono text-amber-400">{fmtD(car1Result.perMonth)}/міс</div>
          <div className="text-xs text-zinc-500 mt-1">{car1Profile.make} {car1Profile.model} {car1Profile.year}</div>
        </div>
      )}

      {isRace && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-amber-400 font-black font-mono text-lg">
            {fmtD(Math.abs(car1Result.realCost - car2Result.realCost))}
          </div>
          <div className="text-xs text-zinc-500">
            різниця в реальних витратах за 5 років
          </div>
        </div>
      )}

      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm"
      >
        {copied ? '✅ Скопійовано!' : '📱 Поділитись результатом'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add components/CarSimShare.jsx && git commit -m "feat: add CarSimShare component with dual-car share text"
```

---

## Task 4: `components/CarSimulator.jsx` — Core rewrite (setup + carStateAt)

**Files:**
- Rewrite: `components/CarSimulator.jsx`

Це найбільший таск. Пишемо нову версію файлу повністю.

- [ ] **Step 1: Написати нову версію CarSimulator.jsx**

Замінити весь вміст файлу на наступний код:

```jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProjection, buildVerdict, calcStressDelta, calcYearPrice,
  FALLBACK_EVENTS, getMakeData, IMPORT_MODIFIER, SIM_YEARS, TRANS_MOD,
} from '../lib/carSim';
import { buildChartPoints, buildEventDots } from '../lib/carSimChart';
import CarSimShare from './CarSimShare';

// ── Helpers ────────────────────────────────────────────────
function fmt(n)  { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

const EMPTY_PROFILE = {
  make: '', model: '', year: '', mileage: '', price: '',
  importCountry: 'ua', transmission: 'auto', fuel: 'gasoline',
  body: 'sedan', knownIssues: '',
};

// ── Pure: derive all per-car state at a given yearIndex ────
function carStateAt(simData, yearIndex, profile) {
  if (!simData) return null;
  const safeYear = Math.min(yearIndex, SIM_YEARS);

  let engOff = 0, trOff = 0, bodyOff = 0;
  let stress = 0, totalEventCost = 0;
  let gameOver = null;

  for (let y = 1; y <= safeYear; y++) {
    const evs = simData.years[y]?.events ?? [];
    for (const e of evs) {
      engOff        += (e.engineDelta ?? 0);
      trOff         += (e.transDelta  ?? 0);
      bodyOff       += (e.bodyDelta   ?? 0);
      totalEventCost += (e.cost ?? 0);
      stress = Math.min(100, stress + calcStressDelta(e));
    }
    const hasExpensive = evs.some(e => (e.cost ?? 0) > 400);
    if (!hasExpensive) stress = Math.max(0, stress - 5);

    if (!gameOver) {
      const base = simData.years[y];
      const eng  = clamp(base.engine + engOff, 5, 100);
      const buyPrice = parseInt(profile.price) || 0;
      if (stress >= 100)                    gameOver = { type: 'stress', year: y };
      else if (eng < 15)                    gameOver = { type: 'engine', year: y };
      else if (totalEventCost > buyPrice * 0.7) gameOver = { type: 'scrap',  year: y };
    }
  }

  const base = simData.years[safeYear];
  const curEvs = base?.events ?? [];
  const yearEventCost = curEvs.reduce((s, e) => s + (e.cost ?? 0), 0);

  return {
    engine:        clamp((base?.engine ?? 50) + engOff, 5, 100),
    trans:         clamp((base?.trans  ?? 50) + trOff,  5, 100),
    bodyHealth:    clamp((base?.body   ?? 50) + bodyOff, 5, 100),
    price:         base?.price ?? 0,
    stress,
    totalEventCost,
    yearEventCost,
    fixedCost:     base?.yearCosts ?? 0,
    gameOver,
    events:        curEvs,
    headline:      base?.headline,
    totalMaint:    base?.totalMaint ?? 0,
  };
}

// ── Sub-components ─────────────────────────────────────────

function HealthBar({ value }) {
  const segs   = 10;
  const filled = Math.round((value / 100) * segs);
  const color  = value >= 70 ? '#22c55e' : value >= 45 ? '#f59e0b' : value >= 25 ? '#f97316' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: segs }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: i < filled ? color : '#27272a' }} />
        ))}
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

function StressBar({ value }) {
  const critical = value >= 80;
  return (
    <div className={`rounded-lg p-2.5 ${critical ? 'bg-red-950/40' : 'bg-zinc-900/60'}`}>
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-xs font-semibold ${critical ? 'text-red-400' : 'text-zinc-400'}`}
          style={critical ? { animation: 'stressPulse 0.8s ease-in-out infinite alternate' } : {}}>
          {critical ? '💀 НЕРВИ НА МЕЖІ' : '😤 Нерви власника'}
        </span>
        <span className={`text-xs font-mono ${critical ? 'text-red-400' : 'text-zinc-500'}`}>{value}/100</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            transition: 'width 0.5s ease',
            ...(critical ? { animation: 'stressGlow 0.8s ease-in-out infinite alternate' } : {}),
          }}
        />
      </div>
      {critical && (
        <div className="text-xs text-red-500/70 mt-1 italic">Ще 1 дорогий ремонт — і власник продасть авто</div>
      )}
    </div>
  );
}

function EventCard({ ev, isExpensive }) {
  const typeColor = {
    repair:    'border-red-800/50 bg-red-950/20',
    scheduled: 'border-zinc-700 bg-zinc-900/60',
    surprise:  'border-amber-800/50 bg-amber-950/20',
    external:  'border-blue-800/50 bg-blue-950/20',
  };
  const cls = typeColor[ev.type] ?? typeColor.scheduled;
  return (
    <div
      className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${cls}`}
      style={isExpensive ? { animation: 'eventReveal 0.4s ease-out' } : {}}
    >
      <span className="text-xl mt-0.5">{ev.icon ?? '🔧'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-white">{ev.title}</div>
        {ev.detail && <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{ev.detail}</div>}
        <div className="flex gap-2 mt-1.5 flex-wrap text-xs font-mono">
          {ev.cost > 0 && (
            <span
              className="text-red-400"
              style={isExpensive ? { animation: 'costReveal 0.6s ease-out' } : {}}
            >
              −{fmtD(ev.cost)}
            </span>
          )}
          {ev.engineDelta !== 0 && <span className={ev.engineDelta > 0 ? 'text-green-400' : 'text-red-400'}>🔧 {ev.engineDelta > 0 ? '+' : ''}{ev.engineDelta}</span>}
          {ev.transDelta  !== 0 && <span className={ev.transDelta  > 0 ? 'text-green-400' : 'text-red-400'}>⚙️ {ev.transDelta  > 0 ? '+' : ''}{ev.transDelta}</span>}
          {ev.bodyDelta   !== 0 && <span className={ev.bodyDelta   > 0 ? 'text-green-400' : 'text-red-400'}>🚗 {ev.bodyDelta   > 0 ? '+' : ''}{ev.bodyDelta}</span>}
          {isExpensive && <span className="text-red-500/70">😤 Нерви +{calcStressDelta(ev)}</span>}
        </div>
      </div>
    </div>
  );
}

function RaceBar({ label1, cost1, label2, cost2 }) {
  const total = cost1 + cost2 || 1;
  const pct1  = (cost1 / total) * 100;
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
      <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">💸 Загальні витрати — хто менше?</div>
      <div className="relative h-7 bg-zinc-800 rounded-full overflow-hidden flex">
        <div
          className="flex items-center pl-3 text-xs font-bold text-black rounded-l-full transition-all duration-700"
          style={{ width: `${pct1}%`, background: 'linear-gradient(90deg, #f59e0b, #f59e0b99)', minWidth: 60 }}
        >
          {label1} {fmtD(cost1)}
        </div>
        <div
          className="flex items-center justify-end pr-3 text-xs font-bold text-white ml-auto transition-all duration-700"
          style={{ width: `${100 - pct1}%`, background: 'linear-gradient(270deg, #818cf8, #818cf855)', minWidth: 60 }}
        >
          {fmtD(cost2)} {label2}
        </div>
      </div>
      <div className="flex justify-between text-xs mt-1.5">
        <span style={{ color: '#f59e0b' }}>{cost1 < cost2 ? '🏆 Виграє' : ''}</span>
        <span className="text-zinc-600">різниця {fmtD(Math.abs(cost1 - cost2))}</span>
        <span style={{ color: '#818cf8' }}>{cost2 < cost1 ? 'Виграє 🏆' : ''}</span>
      </div>
    </div>
  );
}

function LogPanel({ log }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);

  const carColor = { car1: '#f59e0b', car2: '#818cf8' };

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">📋 Журнал подій</div>
      <div ref={ref} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 h-40 overflow-y-auto space-y-1">
        {log.length === 0 && <div className="text-zinc-600 text-xs italic text-center pt-4">Ще немає подій — натисни "Наступний рік"</div>}
        {log.map((entry, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs">
            <span className="text-zinc-600 font-mono w-5 flex-shrink-0">{entry.year}р</span>
            <span>{entry.icon}</span>
            <span className="text-zinc-400 flex-1 truncate">{entry.title}</span>
            {entry.carId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ background: carColor[entry.carId] + '22', color: carColor[entry.carId] }}>
                {entry.carLabel}
              </span>
            )}
            {entry.cost > 0 && <span className="text-red-400 font-mono flex-shrink-0">−{fmtD(entry.cost)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceChart({ simData1, simData2, yearIndex }) {
  if (!simData1) return null;
  const W = 300, H = 80;
  const prices1 = simData1.years.map(y => y.price);
  const prices2 = simData2?.years.map(y => y.price) ?? null;
  const maxP    = Math.max(...prices1, ...(prices2 ?? [0])) * 1.05;

  const c1 = buildChartPoints(prices1, yearIndex, W, H, maxP);
  const c2 = prices2 ? buildChartPoints(prices2, yearIndex, W, H, maxP) : null;
  const dots1 = buildEventDots(simData1.years, prices1, c1.toX, c1.toY);
  const dots2 = c2 ? buildEventDots(simData2.years, prices2, c2.toX, c2.toY) : [];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">📈 Вартість авто по роках</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90 }}>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={0} y1={10 + (1 - t) * 60} x2={W} y2={10 + (1 - t) * 60}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}
        {/* Car 1 solid */}
        {c1.solid && <polyline points={c1.solid} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />}
        {/* Car 1 dashed forecast */}
        {c1.dashed && <polyline points={c1.dashed} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" opacity={0.4} />}
        {/* Car 2 */}
        {c2?.solid  && <polyline points={c2.solid}  fill="none" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" />}
        {c2?.dashed && <polyline points={c2.dashed} fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" opacity={0.4} />}
        {/* Event dots */}
        {[...dots1, ...dots2].map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#ef4444" opacity={0.85} />
        ))}
        {/* Year marker */}
        {yearIndex > 0 && yearIndex <= SIM_YEARS && (
          <line x1={c1.toX(yearIndex)} y1={0} x2={c1.toX(yearIndex)} y2={H}
            stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
        )}
      </svg>
      <div className="flex gap-4 text-xs mt-1 text-zinc-500">
        <span style={{ color: '#f59e0b' }}>— Авто 1</span>
        {simData2 && <span style={{ color: '#818cf8' }}>— Суперник</span>}
        <span style={{ color: '#ef4444' }}>● ремонт</span>
        <span style={{ color: '#52525b' }}>--- прогноз</span>
      </div>
    </div>
  );
}

function GameOverPanel({ carName, gameOver, accent }) {
  const messages = {
    stress: { emoji: '💀', title: 'Власник не витримав — продав від нервів', sub: 'Постійні поломки вичерпали терпіння' },
    engine: { emoji: '🔥', title: 'Двигун помер — тоталь', sub: 'Ремонт двигуна коштує більше ніж авто' },
    scrap:  { emoji: '🔩', title: 'Здав на металобрухт', sub: 'Ремонти з\'їли 70%+ вартості авто' },
  };
  const m = messages[gameOver.type] ?? messages.stress;
  return (
    <div
      className="rounded-xl p-5 text-center border"
      style={{
        background: 'radial-gradient(ellipse at center, #2a0808 0%, #0a0808 70%)',
        borderColor: '#ef444466',
        animation: 'gameOverIn 0.5s ease-out',
      }}
    >
      <div className="text-4xl mb-3" style={{ animation: 'shakeEmoji 0.5s ease-in-out' }}>{m.emoji}</div>
      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>
        {carName} — ВИЙШОВ З ГРИ
      </div>
      <div className="text-white font-bold text-sm mb-1">{m.title}</div>
      <div className="text-red-400 text-xs">{m.sub}</div>
      <div className="text-zinc-600 text-xs mt-2">На {gameOver.year}-му році</div>
    </div>
  );
}

// ── Setup Form ─────────────────────────────────────────────
function ProfileForm({ value, onChange, title, accent }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const transData = TRANS_MOD[value.transmission];
  const makeData  = getMakeData(value.make);

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Марка</label>
          <input value={value.make} onChange={e => set('make', e.target.value)} placeholder="Toyota"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Модель</label>
          <input value={value.model} onChange={e => set('model', e.target.value)} placeholder="Camry"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Рік</label>
          <input type="number" value={value.year} onChange={e => set('year', e.target.value)} placeholder="2017" min="1990" max={new Date().getFullYear()}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Пробіг (км)</label>
          <input type="number" value={value.mileage} onChange={e => set('mileage', e.target.value)} placeholder="95000" min="0"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Ціна ($)</label>
          <input type="number" value={value.price} onChange={e => set('price', e.target.value)} placeholder="14000" min="100"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
          {parseInt(value.price) > 0 && makeData.dep > 0.13 && (
            <p className="text-xs text-amber-500/80">⚠️ {value.make} — висока амортизація {Math.round(makeData.dep * 100)}%/рік</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Країна ввезення</label>
          <select value={value.importCountry} onChange={e => set('importCountry', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors">
            {Object.entries(IMPORT_MODIFIER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Коробка</label>
          <select value={value.transmission} onChange={e => set('transmission', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors">
            {Object.entries(TRANS_MOD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {transData?.riskNote && <p className="text-xs text-amber-500/80">{transData.riskNote}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Пальне</label>
          <select value={value.fuel} onChange={e => set('fuel', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors">
            <option value="gasoline">⛽ Бензин</option>
            <option value="diesel">🛢 Дизель</option>
            <option value="hybrid">⚡🛢 Гібрид</option>
            <option value="electric">⚡ Електро</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Відомі проблеми (необов'язково)</label>
        <input value={value.knownIssues} onChange={e => set('knownIssues', e.target.value.slice(0, 200))}
          placeholder="напр. шум з двигуна, куплено після ДТП..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
      </div>
    </div>
  );
}

// ── CSS keyframes (injected once) ─────────────────────────
const KEYFRAMES = `
@keyframes stressPulse { from { opacity:1; } to { opacity:0.6; } }
@keyframes stressGlow  { from { box-shadow:none; } to { box-shadow:0 0 8px #ef4444; } }
@keyframes eventReveal { from { transform:translateX(-16px); opacity:0; } to { transform:translateX(0); opacity:1; } }
@keyframes costReveal  { from { transform:translateY(6px); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes gameOverIn  { from { transform:scale(0.95); opacity:0; } to { transform:scale(1); opacity:1; } }
@keyframes shakeEmoji  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }
`;

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function CarSimulator() {
  // Setup
  const [car1, setCar1] = useState({ ...EMPTY_PROFILE, make:'Toyota', model:'Camry', year:'2017', mileage:'95000', price:'14000' });
  const [car2, setCar2] = useState(EMPTY_PROFILE);
  const [showRival, setShowRival] = useState(false);

  // Simulation
  const [phase,      setPhase]      = useState('setup');
  const [yearIndex,  setYearIndex]  = useState(0);
  const [simData1,   setSimData1]   = useState(null);
  const [simData2,   setSimData2]   = useState(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [speed,      setSpeed]      = useState(1);
  const [loadMsg,    setLoadMsg]    = useState('');
  const [eventLog,   setEventLog]   = useState([]);

  const autoRef = useRef(null);

  // Derived per-car state
  const state1 = useMemo(() => carStateAt(simData1, yearIndex, car1), [simData1, yearIndex, car1]);
  const state2 = useMemo(() => showRival && simData2 ? carStateAt(simData2, yearIndex, car2) : null, [simData2, yearIndex, car2, showRival]);

  const isRace = showRival && Boolean(state2);

  // Profiles as objects for API
  const profile1 = useMemo(() => ({
    make: car1.make, model: car1.model,
    year: parseInt(car1.year) || 2015, mileage: parseInt(car1.mileage) || 0,
    price: parseInt(car1.price) || 0,
    importCountry: car1.importCountry, transmission: car1.transmission,
    fuel: car1.fuel, body: car1.body, knownIssues: car1.knownIssues,
  }), [car1]);

  const profile2 = useMemo(() => ({
    make: car2.make, model: car2.model,
    year: parseInt(car2.year) || 2015, mileage: parseInt(car2.mileage) || 0,
    price: parseInt(car2.price) || 0,
    importCountry: car2.importCountry, transmission: car2.transmission,
    fuel: car2.fuel, body: car2.body, knownIssues: car2.knownIssues,
  }), [car2]);

  async function fetchAIEvents(profile) {
    try {
      const res = await fetch('/api/car-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('ai_fail');
      const json = await res.json();
      if (json.ok && Array.isArray(json.years)) return json.years;
    } catch { /* use fallback */ }
    return null;
  }

  function attachEvents(proj, aiYears) {
    return {
      ...proj,
      years: proj.years.map((y, idx) => {
        if (idx === 0) return y;
        if (aiYears) {
          const aiYear = aiYears.find(e => e.yearIndex === idx);
          return { ...y, headline: aiYear?.headline, events: aiYear?.events ?? [] };
        }
        return { ...y, events: FALLBACK_EVENTS[idx - 1] ?? [] };
      }),
    };
  }

  async function startSim() {
    setPhase('loading');
    const msgs = [
      'AI вивчає біографії авто…',
      `Шукаю слабкі місця ${car1.make || 'авто'}…`,
      isRace ? `Готую сценарій для ${car2.make || 'суперника'}…` : 'Прораховую 5 років ремонтів…',
      'Готую прогноз цін UA ринку…',
    ];
    let i = 0;
    setLoadMsg(msgs[0]);
    const msgInt = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]); }, 1400);

    const [ev1, ev2] = await Promise.all([
      fetchAIEvents(profile1),
      showRival && car2.make ? fetchAIEvents(profile2) : Promise.resolve(null),
      new Promise(r => setTimeout(r, 2000)),
    ]);

    clearInterval(msgInt);

    const proj1 = buildProjection(profile1);
    const proj2 = showRival && car2.make ? buildProjection(profile2) : null;

    setSimData1(attachEvents(proj1, ev1));
    if (proj2) setSimData2(attachEvents(proj2, ev2));

    setYearIndex(0);
    setEventLog([]);
    setPhase('playing');
  }

  // Advance year + build log
  function advanceYear() {
    if (yearIndex >= SIM_YEARS) return;
    const next = yearIndex + 1;

    // Build log entries for new year
    const newLog = [];
    function addEntries(sim, carId, carLabel, state) {
      if (!sim || !state) return;
      (sim.years[next]?.events ?? []).forEach(ev => {
        newLog.push({ year: next, icon: ev.icon ?? '🔧', title: ev.title, cost: ev.cost ?? 0, carId, carLabel });
      });
    }
    addEntries(simData1, 'car1', car1.make || 'Авто 1', state1);
    if (isRace) addEntries(simData2, 'car2', car2.make || 'Суперник', state2);
    if (newLog.length) setEventLog(prev => [...prev.slice(-90), ...newLog]);

    setYearIndex(next);
  }

  // Auto-play
  useEffect(() => {
    if (!isAutoPlay || phase !== 'playing') return;
    const ms = 3000 / speed;
    autoRef.current = setInterval(() => {
      setYearIndex(prev => {
        if (prev >= SIM_YEARS) { setIsAutoPlay(false); return prev; }
        const next = prev + 1;
        // Log in effect — but we can't call advanceYear here due to stale closures
        // Log is rebuilt on re-render via useEffect below
        return next;
      });
    }, ms);
    return () => clearInterval(autoRef.current);
  }, [isAutoPlay, speed, phase]);

  // Log entries during auto-play (derive from yearIndex changes)
  const prevYearRef = useRef(0);
  useEffect(() => {
    if (phase !== 'playing' || yearIndex === 0) { prevYearRef.current = 0; return; }
    if (yearIndex <= prevYearRef.current) return;
    prevYearRef.current = yearIndex;

    const newLog = [];
    const addEntries = (sim, carId, carLabel) => {
      if (!sim) return;
      (sim.years[yearIndex]?.events ?? []).forEach(ev => {
        newLog.push({ year: yearIndex, icon: ev.icon ?? '🔧', title: ev.title, cost: ev.cost ?? 0, carId, carLabel });
      });
    };
    addEntries(simData1, 'car1', car1.make || 'Авто 1');
    if (isRace) addEntries(simData2, 'car2', car2.make || 'Суперник');
    if (newLog.length) setEventLog(prev => [...prev.slice(-90), ...newLog]);
  }, [yearIndex, phase]);

  // Done check
  useEffect(() => {
    if (phase === 'playing' && yearIndex >= SIM_YEARS) {
      setIsAutoPlay(false);
      setTimeout(() => setPhase('done'), 400);
    }
  }, [yearIndex, phase]);

  // Verdict
  const verdict1 = useMemo(() => {
    if (phase !== 'done' || !simData1 || !state1) return null;
    return buildVerdict(profile1, simData1.years, state1.totalEventCost);
  }, [phase, simData1, profile1, state1]);

  const verdict2 = useMemo(() => {
    if (phase !== 'done' || !simData2 || !state2) return null;
    return buildVerdict(profile2, simData2.years, state2.totalEventCost);
  }, [phase, simData2, profile2, state2]);

  // ── RENDER ──────────────────────────────────────────────

  // Inject keyframes once
  useEffect(() => {
    if (document.getElementById('carsim-kf')) return;
    const s = document.createElement('style');
    s.id = 'carsim-kf'; s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }, []);

  // SETUP
  if (phase === 'setup') {
    const canStart = parseInt(car1.price) > 0 && parseInt(car1.year) > 1990 && car1.make.trim();
    const car2Valid = !showRival || (car2.make.trim() && parseInt(car2.price) > 0 && parseInt(car2.year) > 1990);

    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔮</div>
          <h2 className="text-2xl font-bold text-white">Симулятор Життя Авто</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Введи дані — AI прорахує 5 років: ціну, стан, витрати і несподівані поломки
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <ProfileForm value={car1} onChange={setCar1} title="🚗 Моє авто" accent="#f59e0b" />
        </div>

        {!showRival ? (
          <button
            onClick={() => setShowRival(true)}
            className="w-full py-4 border-2 border-dashed border-indigo-800/50 rounded-2xl text-indigo-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors text-sm font-semibold"
          >
            ⚔️ Порівняти з іншим авто — дуель
            <span className="block text-xs text-indigo-600 mt-0.5">необов'язково</span>
          </button>
        ) : (
          <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-400">⚔️ Суперник</span>
              <button onClick={() => { setShowRival(false); setCar2(EMPTY_PROFILE); }} className="text-xs text-zinc-600 hover:text-zinc-400">✕ Прибрати</button>
            </div>
            <ProfileForm value={car2} onChange={setCar2} title="🚙 Суперник" accent="#818cf8" />
          </div>
        )}

        <div className="text-center">
          <button
            onClick={startSim}
            disabled={!canStart || !car2Valid}
            className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRace ? '⚔️ Симулювати дуель' : '🔮 Симулювати'}
          </button>
          {!canStart && <p className="text-zinc-500 text-xs mt-2">Вкажи ціну, рік і марку</p>}
        </div>
      </div>
    );
  }

  // LOADING
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="text-5xl animate-bounce">🔮</div>
        <div className="text-white font-medium">{loadMsg}</div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
        <div className="text-zinc-600 text-xs">
          {isRace ? 'Claude генерує події для обох авто…' : 'Claude генерує 5 років реалістичних подій…'}
        </div>
      </div>
    );
  }

  // PLAYING
  if (phase === 'playing' && simData1 && state1) {
    const progress = yearIndex / SIM_YEARS;
    const totalSpent1 = state1.totalEventCost + (state1.totalMaint ?? 0);
    const totalSpent2 = state2 ? state2.totalEventCost + (state2.totalMaint ?? 0) : 0;

    // Single-car column
    function CarColumn({ s, profile, sim, accentColor, carId, isGameOver }) {
      const makeData = getMakeData(profile.make);
      const transData = TRANS_MOD[profile.transmission];
      if (isGameOver) {
        return <GameOverPanel carName={`${profile.make} ${profile.model}`} gameOver={s.gameOver} accent={accentColor} />;
      }
      return (
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>
              {makeData.origin} {profile.make} {profile.model} {profile.year}
            </div>
            <div className="text-2xl font-black font-mono text-white">{fmtD(s.price)}</div>
            {yearIndex > 0 && s.headline && (
              <p className="text-xs italic mt-0.5" style={{ color: accentColor }}>"{s.headline}"</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">🔧 Двигун</span>
              <HealthBar value={s.engine} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">⚙️ {transData?.label ?? 'Коробка'}</span>
              <HealthBar value={s.trans} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">🚗 Кузов</span>
              <HealthBar value={s.bodyHealth} />
            </div>
          </div>

          <StressBar value={s.stress} />

          {yearIndex > 0 && (
            <div className="text-xs font-mono text-red-400">
              −{fmtD(s.fixedCost + s.yearEventCost)} цього року
            </div>
          )}

          {yearIndex > 0 && s.events.length > 0 && (
            <div className="space-y-1.5">
              {s.events.map((ev, i) => (
                <EventCard key={i} ev={ev} isExpensive={(ev.cost ?? 0) > 400} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-xs uppercase tracking-wide">
              {isRace ? '⚔️ Дуель авто' : '🔮 Симуляція'}
            </div>
            <h2 className="text-white font-bold text-lg">
              {yearIndex === 0 ? 'Рік купівлі' : `Рік ${yearIndex} з ${SIM_YEARS}`}
            </h2>
          </div>
          <button
            onClick={() => { setPhase('setup'); setSimData1(null); setSimData2(null); setYearIndex(0); setEventLog([]); }}
            className="text-xs text-zinc-600 hover:text-zinc-400"
          >
            ↩ Новий
          </button>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${progress * 100}%` }} />
        </div>

        {/* Cars */}
        {isRace ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <CarColumn s={state1} profile={profile1} sim={simData1} accentColor="#f59e0b" carId="car1" isGameOver={Boolean(state1.gameOver)} />
            </div>
            <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-4">
              <CarColumn s={state2} profile={profile2} sim={simData2} accentColor="#818cf8" carId="car2" isGameOver={Boolean(state2?.gameOver)} />
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
            <CarColumn s={state1} profile={profile1} sim={simData1} accentColor="#f59e0b" carId="car1" isGameOver={false} />
          </div>
        )}

        {/* Race bar */}
        {isRace && yearIndex > 0 && (
          <RaceBar
            label1={car1.make || 'Авто 1'} cost1={totalSpent1}
            label2={car2.make || 'Суперник'} cost2={totalSpent2}
          />
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {yearIndex < SIM_YEARS ? (
            <>
              <button
                onClick={advanceYear}
                disabled={isAutoPlay}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Рік {yearIndex + 1} →
              </button>
              <button onClick={() => setIsAutoPlay(p => !p)} className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm">
                {isAutoPlay ? '⏸ Пауза' : '▶ Авто'}
              </button>
              {isAutoPlay && [1, 2, 4].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${speed === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {s}×
                </button>
              ))}
            </>
          ) : (
            <button onClick={() => setPhase('done')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors">
              🏁 Дивитись вердикт
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: SIM_YEARS + 1 }).map((_, i) => (
            <button key={i} onClick={() => { setIsAutoPlay(false); setYearIndex(i); }}
              className={`py-2 rounded-lg text-xs font-mono transition-colors ${i === yearIndex ? 'bg-amber-500 text-black font-bold' : i < yearIndex ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-600'}`}>
              {i === 0 ? '🛒' : `${i}р`}
            </button>
          ))}
        </div>

        {/* Chart + Log */}
        <PriceChart simData1={simData1} simData2={isRace ? simData2 : null} yearIndex={yearIndex} />
        <LogPanel log={eventLog} />
      </div>
    );
  }

  // DONE — Verdict
  if (phase === 'done' && verdict1) {
    function VerdictCard({ v, profile, accent, state }) {
      const verdictColor = {
        '🏆': 'border-green-700 bg-green-950/30',
        '✅': 'border-green-800 bg-zinc-900',
        '⚠️': 'border-amber-700 bg-amber-950/20',
        '💀': 'border-red-800 bg-red-950/20',
      }[v.emoji] ?? 'border-zinc-700 bg-zinc-900';

      return (
        <div className={`border rounded-2xl p-5 space-y-4 ${verdictColor}`}>
          <div className="text-center">
            <div className="text-4xl">{v.emoji}</div>
            <h3 className="text-lg font-bold text-white mt-1">{v.title}</h3>
            <p className="text-zinc-500 text-xs">{getMakeData(profile.make).origin} {profile.make} {profile.model} {profile.year}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div><div className="text-zinc-500 text-xs mb-0.5">Куплено</div><div className="font-bold font-mono text-white">{fmtD(v.buyPrice)}</div></div>
            <div><div className="text-zinc-500 text-xs mb-0.5">Всі витрати</div><div className="font-bold font-mono text-white">{fmtD(v.totalSpent)}</div></div>
            <div><div className="text-zinc-500 text-xs mb-0.5">Ціна зараз</div><div className="font-bold font-mono text-white">{fmtD(v.resaleVal)}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-zinc-500 text-xs mb-0.5">На рік</div>
              <div className="text-white font-bold font-mono">{fmtD(v.perYear)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-zinc-500 text-xs mb-0.5">На місяць</div>
              <div className="text-white font-bold font-mono">{fmtD(v.perMonth)}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">🔧 Двигун</span><HealthBar value={clamp(state?.engine ?? v.finalEngine, 5, 100)} /></div>
            <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">⚙️ Коробка</span><HealthBar value={clamp(state?.trans  ?? v.finalTrans,  5, 100)} /></div>
            <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">🚗 Кузов</span><HealthBar value={clamp(state?.bodyHealth ?? v.finalBody, 5, 100)} /></div>
          </div>
          <p className="text-zinc-300 text-xs leading-relaxed">{v.text}</p>
          {state?.gameOver && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 text-xs text-red-400">
              💀 Вийшов з гри на {state.gameOver.year}-му році — {state.gameOver.type === 'stress' ? 'нерви закінчились' : state.gameOver.type === 'engine' ? 'двигун помер' : 'ремонти з\'їли авто'}
            </div>
          )}
        </div>
      );
    }

    // Race comparison summary
    const isRaceDone = Boolean(verdict2);
    const winner     = isRaceDone ? (verdict1.perMonth <= verdict2.perMonth ? 1 : 2) : null;
    const diffCost   = isRaceDone ? Math.abs(verdict1.realCost - verdict2.realCost) : 0;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <div className="text-4xl">{isRaceDone ? '⚔️' : verdict1.emoji}</div>
          <h2 className="text-2xl font-bold text-white">{isRaceDone ? 'Підсумок дуелі' : verdict1.title}</h2>
          <p className="text-zinc-500 text-sm">5-річна симуляція завершена</p>
        </div>

        {isRaceDone ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VerdictCard v={verdict1} profile={profile1} accent="#f59e0b" state={state1} />
              <VerdictCard v={verdict2} profile={profile2} accent="#818cf8" state={state2} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-2">
              <div className="text-3xl font-black font-mono text-amber-400">{fmtD(diffCost)}</div>
              <div className="text-zinc-400 text-sm">
                {winner === 1 ? car1.make : car2.make} обійшовся дешевше за 5 років
              </div>
              <div className="text-xs text-zinc-600">
                {winner === 1 ? car1.make : car2.make} — {fmtD(winner === 1 ? verdict1.perMonth : verdict2.perMonth)}/міс vs {fmtD(winner === 1 ? verdict2.perMonth : verdict1.perMonth)}/міс
              </div>
            </div>
          </>
        ) : (
          <VerdictCard v={verdict1} profile={profile1} accent="#f59e0b" state={state1} />
        )}

        <PriceChart simData1={simData1} simData2={isRaceDone ? simData2 : null} yearIndex={SIM_YEARS} />

        <CarSimShare
          car1Result={{ ...verdict1, gameOver: state1?.gameOver }}
          car2Result={verdict2 ? { ...verdict2, gameOver: state2?.gameOver } : null}
          car1Profile={profile1}
          car2Profile={profile2}
        />

        <LogPanel log={eventLog} />

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase('setup'); setSimData1(null); setSimData2(null); setYearIndex(0); setEventLog([]); }}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium"
          >
            ↩ Новий симулятор
          </button>
          <button
            onClick={() => { setYearIndex(0); setPhase('playing'); setIsAutoPlay(false); }}
            className="flex-1 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-700/40 rounded-xl font-medium"
          >
            🔁 Переглянути знову
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Перевір що Next.js не видає помилок компіляції**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && npm run build 2>&1 | tail -30
```

Якщо є помилки — виправ їх (найчастіше: missing import, лапки, дужки).

- [ ] **Step 3: Commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add components/CarSimulator.jsx && git commit -m "feat: rewrite CarSimulator as Car Life Game Pro with dual-car support"
```

---

## Task 5: Інтегрувати CarSimulator у `app/page.jsx`

**Files:**
- Modify: `app/page.jsx`

- [ ] **Step 1: Додати import і таб**

Відкрий `app/page.jsx`. Знайди рядок з `AICarPicker` і додай:

```js
// Після рядка з AICarPicker (рядок ~8):
const CarSimulator = dynamic(() => import('../components/CarSimulator'), { ssr: false });
```

Знайди `const [view, setView] = useState('landing');` і залиш як є — `'simulator'` — новий валідний рядок.

Знайди блок `if (view === 'analyzer' || view === 'picker') {` (~рядок 119) і замінь умову:

```js
if (view === 'analyzer' || view === 'picker' || view === 'simulator') {
```

У навігації (sticky header, `<div className="flex gap-2">`), додай третю кнопку після `picker`:

```jsx
<TabBtn id="simulator" active={view === 'simulator'} onClick={setView} emoji="🔮" label="Симулятор" />
```

Після блоку `{view === 'picker' && (` додай:

```jsx
{view === 'simulator' && (
  <div>
    <div className="mb-6">
      <h1 className="text-2xl font-black text-white">🔮 Симулятор Життя Авто</h1>
      <p className="text-gray-500 text-sm mt-1">
        AI прорахує 5 років — ціна, стан двигуна, витрати на ТО і несподівані поломки
      </p>
    </div>
    <CarSimulator />
  </div>
)}
```

На лендингу, у розділі Final CTA (`section className="border-t ..."`), додай третю кнопку:

```jsx
<button
  onClick={() => setView('simulator')}
  className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-amber-700/40 font-bold text-base rounded-xl transition-all text-amber-400"
>
  🔮 Симулятор авто
</button>
```

- [ ] **Step 2: Перевір що всі три таби рендеряться без помилок**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && npm run build 2>&1 | grep -E "error|Error|✓|✗" | head -20
```

Очікуваний вивід: `✓ Compiled successfully` або аналог без `error`.

- [ ] **Step 3: Запустити dev сервер і перевірити**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && npm run dev -- --port 3001
```

Відкрий http://localhost:3001 — перевір:
1. Таб "Симулятор" з'явився в навігації
2. Клік → рендериться форма CarSimulator
3. "Порівняти з іншим авто" — з'являється друга форма
4. Кнопка запуску активується після заповнення полів

- [ ] **Step 4: Commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add app/page.jsx && git commit -m "feat: add Simulator tab to main navigation"
```

---

## Task 6: Фінальна перевірка і smoke test

**Files:** (жодного нового файлу)

- [ ] **Step 1: Запустити і пройти сценарій "1 авто"**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && npm run dev -- --port 3001
```

Відкрий http://localhost:3001 → Симулятор. Заповни:
- Toyota Camry 2017, 95000 км, $14000, Україна, АКПП, Бензин

Натисни "Симулювати". Перевір:
- [ ] Loading screen показується з повідомленнями
- [ ] Playing phase: здоров'я, ціна, нерви відображаються
- [ ] "Рік 1 →" → з'являються events, лог заповнюється
- [ ] Stress bar оновлюється після дорогого ремонту
- [ ] Графік малює лінію по роках
- [ ] Після рік 5 → вердикт показує `totalSpent` з ремонтами
- [ ] Share кнопка → копіює текст

- [ ] **Step 2: Запустити сценарій "дуель"**

Новий симулятор → натисни "⚔️ Порівняти з іншим авто". Додай:
- BMW 530d 2016, 140000 км, $15500, Україна, DSG

Натисни "⚔️ Симулювати дуель". Перевір:
- [ ] Loading: "генерує події для обох авто"
- [ ] Playing: split-screen з двома колонками
- [ ] Race bar між колонками
- [ ] BMW з DSG отримує більший stress від поломок
- [ ] Log показує події з бейджами [Toyota] і [BMW]
- [ ] Вердикт: два блоки + "різниця $X за 5 років"
- [ ] Share текст включає обидва авто

- [ ] **Step 3: Перевір game-over умову (stress)**

Для тесту game-over, тимчасово зменши threshold в `carStateAt`:
```js
// Тимчасово для тесту:
if (stress >= 30) gameOver = { type: 'stress', year: y };
```
Перевір що BMW колонка замінюється на cinematic game-over панель, Toyota продовжує. Поверни threshold назад (`>= 100`).

- [ ] **Step 4: Build перевірка**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && npm run build 2>&1 | tail -10
```

Очікуваний вивід: успішний build без помилок.

- [ ] **Step 5: Фінальний commit**

```bash
cd /Users/romkravets/Documents/GitHub/freecartop && git add -A && git commit -m "feat: Car Life Game Pro — dual-car simulation with stress, race bar, chart, share"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Bug fixes: `buildVerdict(totalEventCost)`, health accumulation (`carStateAt`), body shadowing (renamed `bodyHealth`)
- ✅ `calcStressDelta` в carSim.js (Task 1)
- ✅ `lib/carSimChart.js` pure SVG functions (Task 2)
- ✅ `CarSimShare.jsx` з dual-car share text (Task 3)
- ✅ Setup: single car + optional rival "⚔️" button (Task 4 — ProfileForm)
- ✅ Split-screen playing з amber/indigo колонками (Task 4 — CarColumn)
- ✅ Stress mechanics: `calcStressDelta`, `StressBar` з pulsing анімацією (Task 4)
- ✅ Game-over умови: stress≥100, engine<15, repairs>70% — `carStateAt` + `GameOverPanel` (Task 4)
- ✅ Race bar: `RaceBar` компонент, оновлюється по роках (Task 4)
- ✅ Running log: `LogPanel` з car badges, auto-scroll (Task 4)
- ✅ SVG Chart: `PriceChart` використовує `buildChartPoints`, animated solid vs dashed (Task 4)
- ✅ WOW animations: `KEYFRAMES` constant, `eventReveal`, `stressPulse`, `gameOverIn`, `shakeEmoji`, `costReveal` (Task 4)
- ✅ Verdict comparison: `VerdictCard` + diff summary (Task 4)
- ✅ Page integration: 3-й таб "Симулятор" (Task 5)
- ✅ Smoke tests (Task 6)

**Placeholder scan:** Жодних TBD, TODO, "similar to" в коді.

**Type consistency:** `bodyHealth` послідовно у `carStateAt` і `VerdictCard`. `totalEventCost` передається в `buildVerdict` як 3-й аргумент скрізь. `gameOver: { type, year }` — одна структура в `carStateAt` і `CarSimShare`.
