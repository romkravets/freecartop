'use client';

import { AlertTriangle, ChevronDown, ChevronLeft, ChevronUp, ExternalLink, Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';

// ── Data ──────────────────────────────────────────────────────
const PURPOSES = [
  { key: 'daily',   emoji: '🏙️', label: 'Місто',         desc: 'Пробки, парковка, щодня' },
  { key: 'family',  emoji: '👨‍👩‍👧', label: 'Сімейне',       desc: 'Діти, поїздки, простір' },
  { key: 'offroad', emoji: '🏔️', label: 'Позашляховик',   desc: 'Погані дороги, природа' },
  { key: 'status',  emoji: '✨',  label: 'Статус',         desc: 'Бізнес, представницьке' },
  { key: 'economy', emoji: '💼',  label: 'Мінімум витрат', desc: 'Рідко їздити, дешево' },
  { key: 'highway', emoji: '🛣️', label: 'Траса / відрядження', desc: 'Багато км, міжмісто' },
];

const BODY_TYPES = [
  { key: 'any',     emoji: '🚘', label: 'Будь-який' },
  { key: 'sedan',   emoji: '🚗', label: 'Седан' },
  { key: 'suv',     emoji: '🚙', label: 'Кросовер / SUV' },
  { key: 'hatch',   emoji: '🚐', label: 'Хетч / Комбі' },
  { key: 'minivan', emoji: '🚌', label: 'Мінівен' },
  { key: 'coupe',   emoji: '🏎️', label: 'Купе' },
];

const FUELS = [
  { key: 'any',      emoji: '🔄', label: 'Будь-яке' },
  { key: 'gasoline', emoji: '⛽', label: 'Бензин' },
  { key: 'diesel',   emoji: '🛢️', label: 'Дизель' },
  { key: 'hybrid',   emoji: '⚡🛢️', label: 'Гібрид' },
  { key: 'electric', emoji: '⚡', label: 'Електро' },
];

const PRIORITIES = [
  { key: 'reliability', emoji: '🔧', label: 'Надійність',  desc: 'Не ламатись роками' },
  { key: 'economy',     emoji: '💰', label: 'Економність', desc: 'Мало пального і ТО' },
  { key: 'comfort',     emoji: '🛋️', label: 'Комфорт',    desc: 'Тихо, плавно, зручно' },
  { key: 'safety',      emoji: '🛡️', label: 'Безпека',    desc: 'Краш-тести, ADAS' },
  { key: 'dynamics',    emoji: '🏎️', label: 'Динаміка',   desc: 'Потужність, прискорення' },
  { key: 'cargo',       emoji: '📦', label: 'Місткість',   desc: 'Великий багажник' },
  { key: 'resale',      emoji: '📈', label: 'Ціна продажу', desc: 'Добре тримає ціну' },
];

const TRANSMISSIONS = [
  { key: 'any',    label: 'Будь-яка' },
  { key: 'auto',   label: 'Тільки АКПП' },
  { key: 'manual', label: 'Механіка' },
  { key: 'no_dsg', label: 'Без DSG/CVT' },
];

const IMPORTS = [
  { key: 'any',     label: 'Будь-яка' },
  { key: 'jp_eu',   label: 'Японія / ЄС' },
  { key: 'no_usa',  label: 'Без авто зі США' },
  { key: 'ukraine', label: 'Тільки UA пробіг' },
];

const BUDGET_PRESETS = [
  { label: 'до $8k',   min: 0,     max: 8000  },
  { label: '$8–15k',   min: 8000,  max: 15000 },
  { label: '$15–25k',  min: 15000, max: 25000 },
  { label: '$25k+',    min: 25000, max: 60000 },
];

// ── Sub-components ────────────────────────────────────────────
function Chip({ active, onClick, children, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all select-none
        ${active
          ? 'border-amber-500 bg-amber-950/50 text-amber-300'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
}

function StepHeader({ step, total, title, subtitle, onBack }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1.5 flex-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500
              ${i < step ? 'bg-amber-500' : i === step ? 'bg-amber-800' : 'bg-zinc-800'}`} />
          ))}
        </div>
        {onBack && step > 0 && (
          <button onClick={onBack}
            className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-all flex-shrink-0">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Крок {step + 1} з {total}</p>
      <h2 className="text-xl font-bold text-white mt-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ScoreBar({ label, value }) {
  const v = Math.round(Math.max(1, Math.min(10, value)));
  const color = v >= 9 ? 'bg-green-500' : v >= 7 ? 'bg-amber-500' : v >= 5 ? 'bg-orange-500' : 'bg-red-500';
  const tc    = v >= 9 ? 'text-green-400' : v >= 7 ? 'text-amber-400' : v >= 5 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-sm ${i < v ? color : 'bg-zinc-800'}`} />
        ))}
      </div>
      <span className={`font-mono font-bold text-[11px] ${tc}`}>{v}/10</span>
    </div>
  );
}

function CarCard({ car, rank, onSimulate }) {
  const [open, setOpen] = useState(rank === 1);
  const rc = { 1: 'border-amber-600 bg-amber-950/30', 2: 'border-zinc-600 bg-zinc-900/40', 3: 'border-zinc-700 bg-zinc-900/20' };
  const rb = { 1: 'bg-amber-500 text-black', 2: 'bg-zinc-600 text-white', 3: 'bg-zinc-700 text-zinc-300' };
  const rl = { 1: '🥇 Найкраще', 2: '🥈 Варіант', 3: '🥉 Розглянь' };

  const autoRiaUrl = `https://auto.ria.com/uk/search/?q=${encodeURIComponent(`${car.make} ${car.model}`)}`;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${rc[rank]}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full p-4 flex items-center justify-between text-left gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${rb[rank]}`}>#{rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{car.icon}</span>
              <span className="font-bold text-white">{car.make} {car.model}</span>
              <span className="text-xs text-gray-500">{car.generation}</span>
            </div>
            <div className="text-sm text-amber-400 font-mono font-bold">{car.priceRange}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-500 text-xs hidden sm:block">{rl[rank]}</span>
          {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-3">
          {car.whyBest && (
            <p className="text-sm text-amber-200/80 italic leading-relaxed">"{car.whyBest}"</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <a href={autoRiaUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-800 text-blue-300 text-xs font-semibold hover:bg-blue-900/40 transition-all">
              🔍 auto.ria <ExternalLink size={11} />
            </a>
            {onSimulate && (
              <button onClick={() => onSimulate(car)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-700 text-amber-300 text-xs font-semibold hover:bg-amber-900/40 transition-all">
                ▶️ Симулювати 5 років
              </button>
            )}
          </div>

          {car.scores && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Характеристики</p>
              <ScoreBar label="Надійність"  value={car.scores.reliability} />
              <ScoreBar label="Економність" value={car.scores.economy} />
              <ScoreBar label="Комфорт"     value={car.scores.comfort} />
              <ScoreBar label="Динаміка"    value={car.scores.dynamics} />
              <ScoreBar label="Безпека"     value={car.scores.safety} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {car.pros?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-green-400 mb-1.5">✅ Плюси</p>
                {car.pros.map((p, i) => <p key={i} className="text-xs text-gray-300 mb-1">• {p}</p>)}
              </div>
            )}
            {car.cons?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-400 mb-1.5">❌ Мінуси</p>
                {car.cons.map((c, i) => <p key={i} className="text-xs text-gray-300 mb-1">• {c}</p>)}
              </div>
            )}
          </div>

          {car.watchOut?.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-400 mb-1.5">⚠️ Що перевірити при купівлі</p>
              {car.watchOut.map((w, i) => <p key={i} className="text-xs text-amber-200/70 mb-1">• {w}</p>)}
            </div>
          )}

          {car.marketTip && (
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-400 mb-1">💡 Порада по ринку UA</p>
              <p className="text-xs text-blue-200/80 leading-relaxed">{car.marketTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
const TOTAL_STEPS = 4;

export default function AICarPicker({ onSimulateClick }) {
  const [step, setStep] = useState(0);

  // Step 1 — Budget
  const [budgetMin, setBudgetMin] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(18000);

  // Step 2 — Purpose + Body
  const [purposes,   setPurposes  ] = useState([]);
  const [bodies,     setBodies    ] = useState(['any']);

  // Step 3 — Fuel + Priorities
  const [fuels,      setFuels     ] = useState(['any']);
  const [priorities, setPriorities] = useState([]); // ordered, max 3

  // Step 4 — Advanced + Notes
  const [transmission, setTransmission] = useState('any');
  const [importPref,   setImportPref  ] = useState('any');
  const [similarTo,    setSimilarTo   ] = useState('');
  const [extraNotes,   setExtraNotes  ] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error,   setError  ] = useState('');

  // ── Multi-select toggle helpers ──────────────────────────
  const toggleMulti = (arr, setArr, key, maxAllowed = 99, exclusiveAny = false) => {
    if (key === 'any') { setArr(['any']); return; }
    let next = arr.filter(k => k !== 'any');
    if (next.includes(key)) next = next.filter(k => k !== key);
    else if (next.length < maxAllowed) next = [...next, key];
    setArr(next.length === 0 ? (exclusiveAny ? ['any'] : []) : next);
  };

  const togglePriority = (key) => {
    if (priorities.includes(key)) {
      setPriorities(priorities.filter(k => k !== key));
    } else if (priorities.length < 3) {
      setPriorities([...priorities, key]);
    }
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const body = {
        budgetMin, budgetMax,
        purposes,
        bodies: bodies.includes('any') ? ['any'] : bodies,
        fuels:  fuels.includes('any')  ? ['any'] : fuels,
        priorities,
        transmission,
        importPref,
        similarTo:  similarTo.slice(0, 100),
        extraNotes: extraNotes.slice(0, 300),
      };
      const res  = await fetch('/api/pick', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || 'Помилка. Спробуй ще раз.'); return; }
      setResults(data.result);
    } catch {
      setError("Помилка з'єднання");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setPurposes([]); setBodies(['any']); setFuels(['any']);
    setPriorities([]); setTransmission('any'); setImportPref('any');
    setSimilarTo(''); setExtraNotes(''); setBudgetMin(5000); setBudgetMax(18000);
    setResults(null); setError(''); setShowAdvanced(false);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 flex flex-col items-center gap-4 text-center">
        <Loader2 size={48} className="animate-spin text-amber-500" />
        <p className="text-gray-200 font-semibold">AI підбирає авто…</p>
        <p className="text-gray-500 text-sm">Аналізую UA ринок під твій запит</p>
        <p className="text-gray-600 text-xs">~10 секунд</p>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────
  if (results) {
    const budgetStr = `$${budgetMin.toLocaleString()} – $${budgetMax.toLocaleString()}`;
    const purposeStr = purposes.map(k => PURPOSES.find(p => p.key === k)?.label).filter(Boolean).join(', ');

    return (
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">🎯 Підбір завершено</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {budgetStr}{purposeStr ? ` · ${purposeStr}` : ''}
            </p>
          </div>
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-amber-600 hover:text-amber-400 transition-all">
            <RotateCcw size={14} /> Спочатку
          </button>
        </div>

        {results.intro && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed">🤖 {results.intro}</p>
          </div>
        )}

        {Array.isArray(results.cars) && results.cars.length > 0 ? (
          <div className="space-y-4">
            {results.cars.map((car, i) => (
              <CarCard key={i} car={car} rank={i + 1} onSimulate={onSimulateClick} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Не знайдено авто під ці параметри.</p>
            <button onClick={reset} className="mt-4 px-4 py-2 rounded-lg border border-amber-600 text-amber-400 text-sm">Спробуй інші параметри</button>
          </div>
        )}

        <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
          <p className="text-xs text-blue-300 leading-relaxed">
            💡 Натисни <strong>auto.ria</strong> щоб знайти реальні оголошення або <strong>Симулювати</strong> щоб побачити витрати за 5 років.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1: Budget ───────────────────────────────────────
  if (step === 0) {
    const sliderMin = 2000, sliderMax = 60000, step100 = 500;
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <StepHeader step={0} total={TOTAL_STEPS} title="Який бюджет?" subtitle="Вкажи діапазон або вибери швидко" />
        <div className="space-y-6">
          {/* Range inputs */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-amber-400">${budgetMin.toLocaleString()}</span>
              <span className="text-zinc-500 text-sm">—</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {budgetMax >= 60000 ? '$60k+' : `$${budgetMax.toLocaleString()}`}
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Мінімум</label>
              <input type="range" min={sliderMin} max={sliderMax} step={step100}
                value={budgetMin}
                onChange={e => { const v = +e.target.value; setBudgetMin(Math.min(v, budgetMax - 2000)); }}
                className="w-full accent-amber-500 cursor-pointer" />
              <label className="text-xs text-zinc-500">Максимум</label>
              <input type="range" min={sliderMin} max={sliderMax} step={step100}
                value={budgetMax}
                onChange={e => { const v = +e.target.value; setBudgetMax(Math.max(v, budgetMin + 2000)); }}
                className="w-full accent-amber-500 cursor-pointer" />
            </div>
          </div>
          {/* Presets */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Або вибери швидко:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUDGET_PRESETS.map(p => (
                <button key={p.label} onClick={() => { setBudgetMin(p.min); setBudgetMax(p.max); }}
                  className={`py-2 rounded-lg border text-sm font-bold transition-all
                    ${budgetMin === p.min && budgetMax === p.max
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(1)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-all">
            Далі →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Purpose + Body ───────────────────────────────
  if (step === 1) {
    const canNext = purposes.length > 0;
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <StepHeader step={1} total={TOTAL_STEPS}
          title="Для чого і який кузов?"
          subtitle="Можна вибрати декілька варіантів"
          onBack={() => setStep(0)} />
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Для чого авто? <span className="text-amber-500">*</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PURPOSES.map(p => (
                <button key={p.key} type="button"
                  onClick={() => {
                    const next = purposes.includes(p.key) ? purposes.filter(k => k !== p.key) : [...purposes, p.key];
                    setPurposes(next);
                  }}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all
                    ${purposes.includes(p.key)
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500'}`}>
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{p.label}</span>
                  <span className="text-[11px] text-gray-500 leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Тип кузова</p>
            <div className="flex flex-wrap gap-2">
              {BODY_TYPES.map(b => (
                <Chip key={b.key}
                  active={bodies.includes(b.key) || (b.key === 'any' && bodies.includes('any'))}
                  onClick={() => toggleMulti(bodies, setBodies, b.key, 99, true)}>
                  {b.emoji} {b.label}
                </Chip>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(2)} disabled={!canNext}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black transition-all">
            {canNext ? 'Далі →' : 'Обери хоча б 1 мету'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Fuel + Priorities ────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <StepHeader step={2} total={TOTAL_STEPS}
          title="Пальне і пріоритети"
          subtitle="Пріоритети: обери до 3 (порядок = важливість)"
          onBack={() => setStep(1)} />
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Пальне</p>
            <div className="flex flex-wrap gap-2">
              {FUELS.map(f => (
                <Chip key={f.key}
                  active={fuels.includes(f.key) || (f.key === 'any' && fuels.includes('any'))}
                  onClick={() => toggleMulti(fuels, setFuels, f.key, 99, true)}>
                  {f.emoji} {f.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Що важливіше? <span className="text-zinc-500 font-normal normal-case tracking-normal">Обери до 3</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIORITIES.map((p, idx) => {
                const rank = priorities.indexOf(p.key) + 1;
                const selected = rank > 0;
                const disabled = !selected && priorities.length >= 3;
                return (
                  <button key={p.key} type="button"
                    onClick={() => !disabled && togglePriority(p.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                      ${selected
                        ? 'border-amber-500 bg-amber-950/40'
                        : disabled
                          ? 'border-zinc-800 bg-zinc-900/30 opacity-40 cursor-not-allowed'
                          : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500'}`}>
                    <span className="text-xl flex-shrink-0">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${selected ? 'text-amber-300' : 'text-zinc-300'}`}>{p.label}</span>
                        {selected && (
                          <span className="text-[10px] bg-amber-500 text-black font-black px-1.5 py-0.5 rounded-full">{rank}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500">{p.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep(3)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-all">
            Далі →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Advanced + Submit ────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <StepHeader step={3} total={TOTAL_STEPS}
          title="Деталі та побажання"
          subtitle="Необов'язково — можна одразу підбирати"
          onBack={() => setStep(2)} />
        <div className="space-y-4">
          {/* Similar to */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Схоже на (необов'язково)
            </label>
            <input type="text" value={similarTo} onChange={e => setSimilarTo(e.target.value)}
              placeholder="напр. Toyota RAV4 але дешевше, або Skoda Octavia"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500" />
          </div>

          {/* Advanced toggle */}
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Додаткові фільтри
          </button>

          {showAdvanced && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Коробка передач</p>
                <div className="flex flex-wrap gap-2">
                  {TRANSMISSIONS.map(t => (
                    <Chip key={t.key} active={transmission === t.key} onClick={() => setTransmission(t.key)}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Країна ввезення</p>
                <div className="flex flex-wrap gap-2">
                  {IMPORTS.map(i => (
                    <Chip key={i.key} active={importPref === i.key} onClick={() => setImportPref(i.key)}>
                      {i.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Особливі побажання</label>
            <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value.slice(0, 300))}
              placeholder="напр. «тільки японці», «є гараж тільки 4.5м», «маю дітей-підлітків»…"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none" />
            <p className="text-right text-[10px] text-zinc-600">{extraNotes.length}/300</p>
          </div>

          {error && (
            <div className="flex gap-2 bg-red-950/40 border border-red-800 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base transition-all flex items-center justify-center gap-2">
            🤖 Підібрати з AI
          </button>

          <p className="text-center text-xs text-zinc-600">
            Бюджет ${budgetMin.toLocaleString()}–${budgetMax >= 60000 ? '60k+' : budgetMax.toLocaleString()}
            {' · '}{purposes.map(k => PURPOSES.find(p => p.key === k)?.label).join(', ')}
            {priorities.length > 0 && ' · ' + priorities.map(k => PRIORITIES.find(p => p.key === k)?.label).join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
