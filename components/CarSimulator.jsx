'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProjection, buildVerdict, calcStressDelta,
  FALLBACK_EVENTS, getMakeData, IMPORT_MODIFIER, SIM_YEARS, TRANS_MOD,
} from '../lib/carSim';
import { buildChartPoints, buildEventDots } from '../lib/carSimChart';
import CarSimShare from './CarSimShare';

function fmt(n)  { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

const EMPTY_PROFILE = {
  make: '', model: '', year: '', mileage: '', price: '',
  importCountry: 'ua', transmission: 'auto', fuel: 'gasoline',
  body: 'sedan', knownIssues: '',
};

// ── Pure: derive all per-car state at a given yearIndex ────
// Health correctly accumulates event deltas across all years up to yearIndex
function carStateAt(simData, yearIndex, profile) {
  if (!simData) return null;
  const safeYear = Math.min(yearIndex, SIM_YEARS);

  let engOff = 0, trOff = 0, bodyOff = 0;
  let stress = 0, totalEventCost = 0;
  let gameOver = null;

  for (let y = 1; y <= safeYear; y++) {
    const evs = simData.years[y]?.events ?? [];
    for (const e of evs) {
      engOff         += (e.engineDelta ?? 0);
      trOff          += (e.transDelta  ?? 0);
      bodyOff        += (e.bodyDelta   ?? 0);
      totalEventCost += (e.cost        ?? 0);
      stress = Math.min(100, stress + calcStressDelta(e));
    }
    const hasExpensive = evs.some(e => (e.cost ?? 0) > 400);
    if (!hasExpensive) stress = Math.max(0, stress - 5);

    if (!gameOver) {
      const base = simData.years[y];
      const eng  = clamp((base?.engine ?? 50) + engOff, 5, 100);
      const buyPrice = parseInt(profile.price) || 0;
      if (stress >= 100)                          gameOver = { type: 'stress', year: y };
      else if (eng < 15)                          gameOver = { type: 'engine', year: y };
      else if (totalEventCost > buyPrice * 0.7)   gameOver = { type: 'scrap',  year: y };
    }
  }

  const base = simData.years[safeYear];
  const curEvs = base?.events ?? [];
  const yearEventCost = curEvs.reduce((s, e) => s + (e.cost ?? 0), 0);

  return {
    engine:         clamp((base?.engine ?? 50) + engOff, 5, 100),
    trans:          clamp((base?.trans  ?? 50) + trOff,  5, 100),
    bodyHealth:     clamp((base?.body   ?? 50) + bodyOff, 5, 100),
    price:          base?.price ?? 0,
    stress,
    totalEventCost,
    yearEventCost,
    fixedCost:      base?.yearCosts ?? 0,
    gameOver,
    events:         curEvs,
    headline:       base?.headline,
    totalMaint:     base?.totalMaint ?? 0,
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
        <span
          className={`text-xs font-semibold ${critical ? 'text-red-400' : 'text-zinc-400'}`}
          style={critical ? { animation: 'stressPulse 0.8s ease-in-out infinite alternate' } : {}}
        >
          {critical ? '💀 НЕРВИ НА МЕЖІ' : '😤 Нерви власника'}
        </span>
        <span className={`text-xs font-mono ${critical ? 'text-red-400' : 'text-zinc-500'}`}>{value}/100</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
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
          {(ev.engineDelta ?? 0) !== 0 && (
            <span className={ev.engineDelta > 0 ? 'text-green-400' : 'text-red-400'}>
              🔧 {ev.engineDelta > 0 ? '+' : ''}{ev.engineDelta}
            </span>
          )}
          {(ev.transDelta ?? 0) !== 0 && (
            <span className={ev.transDelta > 0 ? 'text-green-400' : 'text-red-400'}>
              ⚙️ {ev.transDelta > 0 ? '+' : ''}{ev.transDelta}
            </span>
          )}
          {(ev.bodyDelta ?? 0) !== 0 && (
            <span className={ev.bodyDelta > 0 ? 'text-green-400' : 'text-red-400'}>
              🚗 {ev.bodyDelta > 0 ? '+' : ''}{ev.bodyDelta}
            </span>
          )}
          {isExpensive && (
            <span className="text-red-500/70">😤 Нерви +{calcStressDelta(ev)}</span>
          )}
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
          className="flex items-center pl-3 text-xs font-bold text-black rounded-l-full"
          style={{ width: `${pct1}%`, background: 'linear-gradient(90deg, #f59e0b, #f59e0b99)', minWidth: 60, transition: 'width 0.7s ease' }}
        >
          {label1} {fmtD(cost1)}
        </div>
        <div
          className="flex items-center justify-end pr-3 text-xs font-bold text-white ml-auto"
          style={{ width: `${100 - pct1}%`, background: 'linear-gradient(270deg, #818cf8, #818cf855)', minWidth: 60, transition: 'width 0.7s ease' }}
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
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);

  const carColor = { car1: '#f59e0b', car2: '#818cf8' };

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">📋 Журнал подій</div>
      <div ref={ref} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 h-40 overflow-y-auto space-y-1">
        {log.length === 0 && (
          <div className="text-zinc-600 text-xs italic text-center pt-4">Ще немає подій — натисни "Наступний рік"</div>
        )}
        {log.map((entry, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs">
            <span className="text-zinc-600 font-mono w-5 flex-shrink-0">{entry.year}р</span>
            <span>{entry.icon}</span>
            <span className="text-zinc-400 flex-1 truncate">{entry.title}</span>
            {entry.carId && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ background: (carColor[entry.carId] ?? '#888') + '22', color: carColor[entry.carId] ?? '#888' }}
              >
                {entry.carLabel}
              </span>
            )}
            {entry.cost > 0 && (
              <span className="text-red-400 font-mono flex-shrink-0">−{fmtD(entry.cost)}</span>
            )}
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

  const c1   = buildChartPoints(prices1, yearIndex, W, H, maxP);
  const c2   = prices2 ? buildChartPoints(prices2, yearIndex, W, H, maxP) : null;
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
        {c1.solid  && <polyline points={c1.solid}  fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />}
        {c1.dashed && <polyline points={c1.dashed} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" opacity={0.4} />}
        {c2?.solid  && <polyline points={c2.solid}  fill="none" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" />}
        {c2?.dashed && <polyline points={c2.dashed} fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" opacity={0.4} />}
        {[...dots1, ...dots2].map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#ef4444" opacity={0.85} />
        ))}
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
          <input
            value={value.make}
            onChange={e => set('make', e.target.value)}
            placeholder="Toyota"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Модель</label>
          <input
            value={value.model}
            onChange={e => set('model', e.target.value)}
            placeholder="Camry"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Рік</label>
          <input
            type="number"
            value={value.year}
            onChange={e => set('year', e.target.value)}
            placeholder="2017"
            min="1990"
            max={new Date().getFullYear()}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Пробіг (км)</label>
          <input
            type="number"
            value={value.mileage}
            onChange={e => set('mileage', e.target.value)}
            placeholder="95000"
            min="0"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Ціна ($)</label>
          <input
            type="number"
            value={value.price}
            onChange={e => set('price', e.target.value)}
            placeholder="14000"
            min="100"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
          {parseInt(value.price) > 0 && makeData.dep > 0.13 && (
            <p className="text-xs text-amber-500/80">⚠️ {value.make} — висока амортизація {Math.round(makeData.dep * 100)}%/рік</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Країна ввезення</label>
          <select
            value={value.importCountry}
            onChange={e => set('importCountry', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors"
          >
            {Object.entries(IMPORT_MODIFIER).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Коробка</label>
          <select
            value={value.transmission}
            onChange={e => set('transmission', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors"
          >
            {Object.entries(TRANS_MOD).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {transData?.riskNote && <p className="text-xs text-amber-500/80">{transData.riskNote}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Пальне</label>
          <select
            value={value.fuel}
            onChange={e => set('fuel', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors"
          >
            <option value="gasoline">⛽ Бензин</option>
            <option value="diesel">🛢 Дизель</option>
            <option value="hybrid">⚡🛢 Гібрид</option>
            <option value="electric">⚡ Електро</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Відомі проблеми (необов'язково)</label>
        <input
          value={value.knownIssues}
          onChange={e => set('knownIssues', e.target.value.slice(0, 200))}
          placeholder="напр. шум з двигуна, куплено після ДТП..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
        />
      </div>
    </div>
  );
}

// CSS keyframes injected once into <head>
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
  const [car1, setCar1] = useState({ ...EMPTY_PROFILE, make: 'Toyota', model: 'Camry', year: '2017', mileage: '95000', price: '14000' });
  const [car2, setCar2] = useState(EMPTY_PROFILE);
  const [showRival, setShowRival] = useState(false);

  const [phase,      setPhase]      = useState('setup');
  const [yearIndex,  setYearIndex]  = useState(0);
  const [simData1,   setSimData1]   = useState(null);
  const [simData2,   setSimData2]   = useState(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [speed,      setSpeed]      = useState(1);
  const [loadMsg,    setLoadMsg]    = useState('');
  const [eventLog,   setEventLog]   = useState([]);

  const autoRef    = useRef(null);
  const prevYearRef = useRef(0);

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

  const state1 = useMemo(() => carStateAt(simData1, yearIndex, car1), [simData1, yearIndex, car1]);
  const state2 = useMemo(
    () => (showRival && simData2 ? carStateAt(simData2, yearIndex, car2) : null),
    [simData2, yearIndex, car2, showRival],
  );

  const isRace = showRival && Boolean(state2);

  async function fetchAIEvents(profile) {
    try {
      const res = await fetch('/api/car-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('ai_fail');
      const json = await res.json();
      if (json.ok && Array.isArray(json.years)) return json.years;
    } catch { /* fall through to fallback */ }
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
    prevYearRef.current = 0;
    setPhase('playing');
  }

  function buildLogEntries(nextYear) {
    const entries = [];
    const add = (sim, carId, carLabel) => {
      if (!sim) return;
      (sim.years[nextYear]?.events ?? []).forEach(ev => {
        entries.push({ year: nextYear, icon: ev.icon ?? '🔧', title: ev.title, cost: ev.cost ?? 0, carId, carLabel });
      });
    };
    add(simData1, 'car1', car1.make || 'Авто 1');
    if (isRace) add(simData2, 'car2', car2.make || 'Суперник');
    return entries;
  }

  function advanceYear() {
    if (yearIndex >= SIM_YEARS) return;
    const next = yearIndex + 1;
    const newEntries = buildLogEntries(next);
    if (newEntries.length) setEventLog(prev => [...prev.slice(-90), ...newEntries]);
    prevYearRef.current = next;
    setYearIndex(next);
  }

  // Auto-play interval
  useEffect(() => {
    if (!isAutoPlay || phase !== 'playing') return;
    const ms = 3000 / speed;
    autoRef.current = setInterval(() => {
      setYearIndex(prev => {
        if (prev >= SIM_YEARS) { setIsAutoPlay(false); return prev; }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(autoRef.current);
  }, [isAutoPlay, speed, phase]);

  // Log entries during auto-play (derive on yearIndex change)
  useEffect(() => {
    if (phase !== 'playing' || yearIndex === 0 || yearIndex <= prevYearRef.current) return;
    prevYearRef.current = yearIndex;
    const newEntries = buildLogEntries(yearIndex);
    if (newEntries.length) setEventLog(prev => [...prev.slice(-90), ...newEntries]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearIndex, phase]);

  // Transition to done
  useEffect(() => {
    if (phase === 'playing' && yearIndex >= SIM_YEARS) {
      setIsAutoPlay(false);
      setTimeout(() => setPhase('done'), 400);
    }
  }, [yearIndex, phase]);

  const verdict1 = useMemo(() => {
    if (phase !== 'done' || !simData1 || !state1) return null;
    return buildVerdict(profile1, simData1.years, state1.totalEventCost);
  }, [phase, simData1, profile1, state1]);

  const verdict2 = useMemo(() => {
    if (phase !== 'done' || !simData2 || !state2) return null;
    return buildVerdict(profile2, simData2.years, state2.totalEventCost);
  }, [phase, simData2, profile2, state2]);

  // Inject CSS keyframes once
  useEffect(() => {
    if (document.getElementById('carsim-kf')) return;
    const s = document.createElement('style');
    s.id = 'carsim-kf';
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }, []);

  // ── SETUP ────────────────────────────────────────────────
  if (phase === 'setup') {
    const canStart  = parseInt(car1.price) > 0 && parseInt(car1.year) > 1990 && car1.make.trim();
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
              <button
                onClick={() => { setShowRival(false); setCar2(EMPTY_PROFILE); }}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                ✕ Прибрати
              </button>
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
            {showRival ? '⚔️ Симулювати дуель' : '🔮 Симулювати'}
          </button>
          {!canStart && <p className="text-zinc-500 text-xs mt-2">Вкажи ціну, рік і марку</p>}
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────
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

  // ── PLAYING ───────────────────────────────────────────────
  if (phase === 'playing' && simData1 && state1) {
    const progress    = yearIndex / SIM_YEARS;
    const totalSpent1 = state1.totalEventCost + (state1.totalMaint ?? 0);
    const totalSpent2 = state2 ? state2.totalEventCost + (state2.totalMaint ?? 0) : 0;

    function CarColumn({ s, profile, accentColor, isGameOver }) {
      const makeData  = getMakeData(profile.make);
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

        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${progress * 100}%` }} />
        </div>

        {isRace ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <CarColumn s={state1} profile={profile1} accentColor="#f59e0b" isGameOver={Boolean(state1.gameOver)} />
            </div>
            <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-4">
              <CarColumn s={state2} profile={profile2} accentColor="#818cf8" isGameOver={Boolean(state2?.gameOver)} />
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
            <CarColumn s={state1} profile={profile1} accentColor="#f59e0b" isGameOver={false} />
          </div>
        )}

        {isRace && yearIndex > 0 && (
          <RaceBar
            label1={car1.make || 'Авто 1'} cost1={totalSpent1}
            label2={car2.make || 'Суперник'} cost2={totalSpent2}
          />
        )}

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
              <button
                onClick={() => setIsAutoPlay(p => !p)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm"
              >
                {isAutoPlay ? '⏸ Пауза' : '▶ Авто'}
              </button>
              {isAutoPlay && [1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${speed === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  {s}×
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={() => setPhase('done')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
            >
              🏁 Дивитись вердикт
            </button>
          )}
        </div>

        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: SIM_YEARS + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsAutoPlay(false); setYearIndex(i); }}
              className={`py-2 rounded-lg text-xs font-mono transition-colors ${
                i === yearIndex ? 'bg-amber-500 text-black font-bold' :
                i < yearIndex  ? 'bg-zinc-700 text-zinc-300' :
                                 'bg-zinc-900 text-zinc-600'
              }`}
            >
              {i === 0 ? '🛒' : `${i}р`}
            </button>
          ))}
        </div>

        <PriceChart simData1={simData1} simData2={isRace ? simData2 : null} yearIndex={yearIndex} />
        <LogPanel log={eventLog} />
      </div>
    );
  }

  // ── DONE — Verdict ────────────────────────────────────────
  if (phase === 'done' && verdict1) {
    function VerdictCard({ v, profile, state }) {
      const verdictBg = {
        '🏆': 'border-green-700 bg-green-950/30',
        '✅': 'border-green-800 bg-zinc-900',
        '⚠️': 'border-amber-700 bg-amber-950/20',
        '💀': 'border-red-800 bg-red-950/20',
      }[v.emoji] ?? 'border-zinc-700 bg-zinc-900';
      const transData = TRANS_MOD[profile.transmission];

      return (
        <div className={`border rounded-2xl p-5 space-y-4 ${verdictBg}`}>
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
            <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">⚙️ {transData?.label ?? 'Коробка'}</span><HealthBar value={clamp(state?.trans ?? v.finalTrans, 5, 100)} /></div>
            <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">🚗 Кузов</span><HealthBar value={clamp(state?.bodyHealth ?? v.finalBody, 5, 100)} /></div>
          </div>
          <p className="text-zinc-300 text-xs leading-relaxed">{v.text}</p>
          {state?.gameOver && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 text-xs text-red-400">
              💀 Вийшов з гри на {state.gameOver.year}-му році —{' '}
              {state.gameOver.type === 'stress' ? 'нерви закінчились' :
               state.gameOver.type === 'engine' ? 'двигун помер' : 'ремонти з\'їли авто'}
            </div>
          )}
        </div>
      );
    }

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
              <VerdictCard v={verdict1} profile={profile1} state={state1} />
              <VerdictCard v={verdict2} profile={profile2} state={state2} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-2">
              <div className="text-3xl font-black font-mono text-amber-400">{fmtD(diffCost)}</div>
              <div className="text-zinc-400 text-sm">
                {winner === 1 ? car1.make : car2.make} обійшовся дешевше за 5 років
              </div>
              <div className="text-xs text-zinc-600">
                {winner === 1 ? car1.make : car2.make} — {fmtD(winner === 1 ? verdict1.perMonth : verdict2.perMonth)}/міс vs{' '}
                {fmtD(winner === 1 ? verdict2.perMonth : verdict1.perMonth)}/міс
              </div>
            </div>
          </>
        ) : (
          <VerdictCard v={verdict1} profile={profile1} state={state1} />
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
