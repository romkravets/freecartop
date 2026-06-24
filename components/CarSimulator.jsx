'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildProjection, buildVerdict, calcYearPrice, FALLBACK_EVENTS, getMakeData, IMPORT_MODIFIER, SIM_YEARS, TRANS_MOD } from '../lib/carSim';

// ── Utilities ─────────────────────────────────────────────
function fmt(n)   { return Number(n).toLocaleString('en-US'); }
function fmtD(n)  { return `$${fmt(n)}`; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// ── Health bar ─────────────────────────────────────────────
function HealthBar({ value }) {
  const segs   = 10;
  const filled = Math.round((value / 100) * segs);
  const color  = value >= 70 ? '#22c55e' : value >= 45 ? '#f59e0b' : value >= 25 ? '#f97316' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: segs }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ background: i < filled ? color : '#27272a' }}
          />
        ))}
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}/100</span>
    </div>
  );
}

// ── Price trend spark ──────────────────────────────────────
function PriceDrop({ from, to }) {
  const pct = Math.round(((to - from) / from) * 100);
  return (
    <span className="text-xs font-mono text-red-400 ml-2">
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

// ── Event card ─────────────────────────────────────────────
function EventCard({ ev, isNew }) {
  const typeColor = {
    repair:    'border-red-800/50 bg-red-950/30',
    scheduled: 'border-zinc-700  bg-zinc-900',
    surprise:  'border-amber-800/50 bg-amber-950/30',
    external:  'border-blue-800/50 bg-blue-950/30',
  };
  const cls = typeColor[ev.type] ?? typeColor.scheduled;
  return (
    <div
      className={`border rounded-xl px-4 py-3 flex items-start gap-3 transition-all duration-500 ${cls} ${isNew ? 'scale-100 opacity-100' : 'opacity-100'}`}
    >
      <span className="text-xl mt-0.5">{ev.icon ?? '🔧'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-white">{ev.title}</div>
        {ev.detail && <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{ev.detail}</div>}
        <div className="flex gap-3 mt-1 flex-wrap text-xs font-mono">
          {ev.cost > 0 && <span className="text-red-400">−{fmtD(ev.cost)}</span>}
          {ev.engineDelta > 0 && <span className="text-green-400">🔧 +{ev.engineDelta}</span>}
          {ev.engineDelta < 0 && <span className="text-red-400">🔧 {ev.engineDelta}</span>}
          {ev.transDelta  > 0 && <span className="text-green-400">⚙️ +{ev.transDelta}</span>}
          {ev.transDelta  < 0 && <span className="text-red-400">⚙️ {ev.transDelta}</span>}
          {ev.bodyDelta   > 0 && <span className="text-green-400">🚗 +{ev.bodyDelta}</span>}
          {ev.bodyDelta   < 0 && <span className="text-red-400">🚗 {ev.bodyDelta}</span>}
        </div>
      </div>
    </div>
  );
}

// ── FixedCost row ──────────────────────────────────────────
function FixedRow({ item }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-400">{item.name}</span>
      <span className="font-mono text-zinc-300">−{fmtD(item.amount)}</span>
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-amber-500/80">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
    />
  );
}

function NumInput({ value, onChange, placeholder, min, max }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function CarSimulator() {
  // ── Setup form state ──────────────────────────────────────
  const [make,          setMake]          = useState('Toyota');
  const [model,         setModel]         = useState('Camry');
  const [year,          setYear]          = useState('2017');
  const [mileage,       setMileage]       = useState('95000');
  const [price,         setPrice]         = useState('14000');
  const [importCountry, setImportCountry] = useState('ua');
  const [transmission,  setTransmission]  = useState('auto');
  const [fuel,          setFuel]          = useState('gasoline');
  const [body,          setBody]          = useState('sedan');
  const [knownIssues,   setKnownIssues]   = useState('');

  // ── Sim state ─────────────────────────────────────────────
  const [phase,        setPhase]        = useState('setup');  // setup|loading|playing|done
  const [yearIndex,    setYearIndex]    = useState(0);        // 0 = initial
  const [simData,      setSimData]      = useState(null);     // built projection
  const [aiEvents,     setAiEvents]     = useState(null);     // null = use fallback
  const [isAutoPlay,   setIsAutoPlay]   = useState(false);
  const [speed,        setSpeed]        = useState(1);        // 1 | 2 | 4
  const [loadMsg,      setLoadMsg]      = useState('');
  const [newEventIdx,  setNewEventIdx]  = useState(-1);

  // ── Refs ───────────────────────────────────────────────────
  const autoRef   = useRef(null);
  const logRef    = useRef(null);
  const appliedRef = useRef(0);

  // ── Current profile ───────────────────────────────────────
  const profile = useMemo(() => ({
    make, model,
    year:          parseInt(year)    || 2015,
    mileage:       parseInt(mileage) || 0,
    price:         parseInt(price)   || 0,
    importCountry, transmission, fuel, body, knownIssues,
  }), [make, model, year, mileage, price, importCountry, transmission, fuel, body, knownIssues]);

  // ── Trans hint ────────────────────────────────────────────
  const transData = TRANS_MOD[transmission];
  const impData   = IMPORT_MODIFIER[importCountry] ?? IMPORT_MODIFIER.ua;
  const makeData  = getMakeData(make);

  // ── Fetch AI events ────────────────────────────────────────
  async function fetchAIEvents(p) {
    try {
      const res = await fetch('/api/car-events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(p),
      });
      if (!res.ok) throw new Error('ai_fail');
      const json = await res.json();
      if (json.ok && Array.isArray(json.years)) return json.years;
    } catch {
      /* swallow — use fallback */
    }
    return null;
  }

  // ── Start simulation ───────────────────────────────────────
  async function startSim() {
    setPhase('loading');
    const msgs = [
      'AI вивчає біографію авто…',
      `Шукаю слабкі місця ${make || 'авто'}…`,
      'Прораховую 5 років ремонтів та витрат…',
      'Готую прогноз цін UA ринку…',
    ];
    let i = 0;
    setLoadMsg(msgs[0]);
    const msgInt = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]); }, 1400);

    const [events] = await Promise.all([
      fetchAIEvents(profile),
      new Promise(r => setTimeout(r, 2000)), // min 2s for UX
    ]);

    clearInterval(msgInt);

    const proj = buildProjection(profile);
    // Attach events to projection
    if (events) {
      setAiEvents(events);
      proj.years = proj.years.map((y, idx) => {
        if (idx === 0) return y;
        const aiYear = events.find(e => e.yearIndex === idx);
        return { ...y, headline: aiYear?.headline, events: aiYear?.events ?? [] };
      });
    } else {
      // Fallback
      proj.years = proj.years.map((y, idx) => ({
        ...y,
        events: idx === 0 ? [] : (FALLBACK_EVENTS[idx - 1] ?? []),
      }));
    }

    setSimData(proj);
    setYearIndex(0);
    appliedRef.current = 0;
    setPhase('playing');
  }

  // ── Live metrics: apply events up to yearIndex ─────────────
  const liveMetrics = useMemo(() => {
    if (!simData) return null;
    const base = simData.years[yearIndex];
    if (!base) return null;

    let eng  = base.engine;
    let tr   = base.trans;
    let body = base.body;
    let maint = base.totalMaint;

    // Apply events for current year
    const evs = base.events ?? [];
    for (const e of evs) {
      eng   = clamp(eng   + (e.engineDelta ?? 0), 5, 100);
      tr    = clamp(tr    + (e.transDelta  ?? 0), 5, 100);
      body  = clamp(body  + (e.bodyDelta   ?? 0), 5, 100);
      maint += (e.cost ?? 0);
    }
    const yearEventCost = evs.reduce((s, e) => s + (e.cost ?? 0), 0);
    const fixedCost     = base.yearCosts;

    return { engine: eng, trans: tr, body, maint, yearEventCost, fixedCost, price: base.price };
  }, [simData, yearIndex]);

  // ── Auto-play ──────────────────────────────────────────────
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

  // ── Check done ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing' && yearIndex >= SIM_YEARS) {
      setIsAutoPlay(false);
      setTimeout(() => setPhase('done'), 400);
    }
  }, [yearIndex, phase]);

  // ── Scroll log ─────────────────────────────────────────────
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [yearIndex]);

  // ── Verdict ────────────────────────────────────────────────
  const verdict = useMemo(() => {
    if (phase !== 'done' || !simData) return null;
    return buildVerdict(profile, simData.years);
  }, [phase, simData, profile]);

  // ══════════════════════════════════════════════════════════
  // PHASE: SETUP
  // ══════════════════════════════════════════════════════════
  if (phase === 'setup') {
    const canStart = parseInt(price) > 0 && parseInt(year) > 1990 && make.trim();
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔮</div>
          <h2 className="text-2xl font-bold text-white">Симулятор Життя Авто</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Введи дані — AI прорахує 5 років: ціну, стан двигуна/коробки, витрати на ТО і неочікувані поломки
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          <Field label="Марка">
            <TextInput value={make} onChange={setMake} placeholder="Toyota" />
          </Field>
          <Field label="Модель">
            <TextInput value={model} onChange={setModel} placeholder="Camry" />
          </Field>

          <Field label="Рік випуску">
            <NumInput value={year} onChange={setYear} placeholder="2017" min="1990" max={new Date().getFullYear()} />
          </Field>
          <Field label="Пробіг при покупці (км)">
            <NumInput value={mileage} onChange={setMileage} placeholder="95000" min="0" max="999999" />
          </Field>

          <Field
            label="Ціна купівлі ($)"
            hint={parseInt(price) > 0 && makeData.dep > 0.13 ? `⚠️ ${make} — висока амортизація ${Math.round(makeData.dep * 100)}%/рік` : null}
          >
            <NumInput value={price} onChange={setPrice} placeholder="14000" min="100" />
          </Field>

          <Field label="Країна ввезення">
            <Select
              value={importCountry}
              onChange={setImportCountry}
              options={Object.entries(IMPORT_MODIFIER).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Field>

          <Field
            label="Коробка передач"
            hint={transData?.riskNote ?? null}
          >
            <Select
              value={transmission}
              onChange={setTransmission}
              options={Object.entries(TRANS_MOD).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Field>

          <Field label="Пальне">
            <Select
              value={fuel}
              onChange={setFuel}
              options={[
                { value: 'gasoline', label: '⛽ Бензин' },
                { value: 'diesel',   label: '🛢 Дизель' },
                { value: 'hybrid',   label: '⚡🛢 Гібрид' },
                { value: 'electric', label: '⚡ Електро' },
              ]}
            />
          </Field>

          <Field label="Кузов">
            <Select
              value={body}
              onChange={setBody}
              options={[
                { value: 'sedan',  label: '🚘 Седан' },
                { value: 'suv',    label: '🚙 Позашляховик / SUV' },
                { value: 'hatch',  label: '🚗 Хетчбек' },
                { value: 'minivan',label: '🚐 Мінівен' },
                { value: 'coupe',  label: '🏎 Купе' },
                { value: 'pickup', label: '🛻 Пікап' },
              ]}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Відомі проблеми або нюанси (необов'язково)">
              <input
                type="text"
                value={knownIssues}
                onChange={e => setKnownIssues(e.target.value.slice(0, 200))}
                placeholder="напр. шум з двигуна, куплено після ДТП, хазяїн не міняв масло..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
              />
            </Field>
          </div>
        </div>

        {/* Preview panel */}
        {parseInt(price) > 0 && parseInt(year) > 1990 && (
          <div className="max-w-2xl mx-auto bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Попередній прогноз</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[1, 3, 5].map(y => {
                const p = calcYearPrice(parseInt(price) || 0, make, importCountry, fuel, y);
                const dropPct = Math.round(((p - (parseInt(price) || 0)) / (parseInt(price) || 1)) * 100);
                return (
                  <div key={y} className="space-y-1">
                    <div className="text-zinc-500 text-xs">+{y} рік{y > 1 ? 'и' : ''}</div>
                    <div className="text-white font-bold">{fmtD(p)}</div>
                    <div className="text-red-400 text-xs font-mono">{dropPct}%</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
              🔮 {makeData.label || make} · амортизація ~{Math.round(makeData.dep * 100)}%/рік · {transData?.riskNote ? `⚠️ ${transData.riskNote}` : ''}
              {importCountry === 'usa' && ' · 🇺🇸 США = прихований ризик кузова та електрики'}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={startSim}
            disabled={!canStart}
            className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔮 Запустити симулятор
          </button>
          {!canStart && <p className="text-zinc-500 text-xs mt-2">Вкажи ціну, рік і марку</p>}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // PHASE: LOADING
  // ══════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="text-5xl animate-bounce">🔮</div>
        <div className="text-white font-medium">{loadMsg}</div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <div className="text-zinc-600 text-xs">Claude генерує 5 років реалістичних подій для вашого авто</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // PHASE: PLAYING
  // ══════════════════════════════════════════════════════════
  if (phase === 'playing' && simData && liveMetrics) {
    const curYear  = simData.years[yearIndex];
    const prevYear = yearIndex > 0 ? simData.years[yearIndex - 1] : null;
    const progress = yearIndex / SIM_YEARS;

    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-xs uppercase tracking-wide">
              {makeData.origin || '🚗'} {make} {model} {year}
            </div>
            <h2 className="text-white font-bold text-lg">
              {yearIndex === 0 ? 'Рік купівлі' : `Рік ${yearIndex} з ${SIM_YEARS}`}
            </h2>
            {curYear?.headline && (
              <p className="text-amber-400 text-xs italic mt-0.5">"{curYear.headline}"</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-white">{fmtD(liveMetrics.price)}</div>
            {prevYear && (
              <PriceDrop from={prevYear.price} to={liveMetrics.price} />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Metrics */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Технічний стан</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">🔧 Двигун</span>
              <HealthBar value={liveMetrics.engine} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">⚙️ Коробка ({transData?.label})</span>
              <HealthBar value={liveMetrics.trans} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">🚗 Кузов</span>
              <HealthBar value={liveMetrics.body} />
            </div>
          </div>
        </div>

        {/* Costs */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Витрати цього року</div>
            <div className="text-amber-400 font-bold font-mono text-sm">
              −{fmtD((liveMetrics.fixedCost || 0) + (liveMetrics.yearEventCost || 0))}
            </div>
          </div>
          {yearIndex > 0 && (
            <>
              {(simData.fixedCosts ?? []).map((c, i) => <FixedRow key={i} item={c} />)}
            </>
          )}
          <div className="pt-2 border-t border-zinc-800 flex justify-between">
            <span className="text-sm text-zinc-500">Всього витрачено на ТО:</span>
            <span className="font-mono text-white font-bold">{fmtD(liveMetrics.maint)}</span>
          </div>
        </div>

        {/* Events */}
        {yearIndex > 0 && (curYear?.events ?? []).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              {aiEvents ? '🤖 Подій цього року' : '📋 Подій цього року'}
            </div>
            {(curYear.events ?? []).map((ev, i) => (
              <EventCard key={i} ev={ev} isNew={true} />
            ))}
          </div>
        )}
        {yearIndex === 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-center text-zinc-500 text-sm">
            🚗 Авто щойно куплено. Тисни "Наступний рік" щоб побачити як воно буде розвиватись…
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {yearIndex < SIM_YEARS ? (
            <>
              <button
                onClick={() => setYearIndex(y => Math.min(y + 1, SIM_YEARS))}
                disabled={isAutoPlay}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Наступний рік →
              </button>
              <button
                onClick={() => setIsAutoPlay(p => !p)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-sm"
              >
                {isAutoPlay ? '⏸ Пауза' : '▶ Авто'}
              </button>
              {isAutoPlay && (
                <div className="flex gap-1">
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${speed === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              )}
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

        {/* Quick timeline */}
        <div className="grid grid-cols-6 gap-1">
          {simData.years.map((y, i) => {
            const isCur  = i === yearIndex;
            const isDone = i < yearIndex;
            return (
              <button
                key={i}
                onClick={() => { setIsAutoPlay(false); setYearIndex(i); }}
                className={`py-2 rounded-lg text-xs font-mono transition-colors ${isCur ? 'bg-amber-500 text-black font-bold' : isDone ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-600'}`}
              >
                {i === 0 ? '🛒' : `${i}р`}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // PHASE: DONE (Verdict)
  // ══════════════════════════════════════════════════════════
  if (phase === 'done' && verdict) {
    const v = verdict;
    const verdictColor = {
      '🏆': 'border-green-700  bg-green-950/30',
      '✅': 'border-green-800  bg-zinc-900',
      '⚠️': 'border-amber-700  bg-amber-950/20',
      '💀': 'border-red-800    bg-red-950/20',
    }[v.emoji] ?? 'border-zinc-700 bg-zinc-900';

    const finalEng = simData?.years[SIM_YEARS]?.engine ?? v.finalEngine;
    const finalTr  = simData?.years[SIM_YEARS]?.trans  ?? v.finalTrans;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="text-5xl">{v.emoji}</div>
          <h2 className="text-2xl font-bold text-white">{v.title}</h2>
          <p className="text-zinc-400 text-sm">
            {makeData.origin} {make} {model} {year} — 5-річний підсумок
          </p>
        </div>

        {/* Money summary */}
        <div className={`border rounded-2xl p-5 space-y-4 ${verdictColor}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-zinc-500 text-xs mb-1">💰 Куплено</div>
              <div className="text-white font-bold font-mono">{fmtD(v.buyPrice)}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">💸 ТО за 5р.</div>
              <div className="text-white font-bold font-mono">{fmtD(v.totalMaint)}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">📦 Ціна зараз</div>
              <div className="text-white font-bold font-mono">{fmtD(v.resaleVal)}</div>
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Всього витрат (купівля + ТО):</span>
              <span className="font-mono text-white font-bold">{fmtD(v.totalSpent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Залишкова вартість:</span>
              <span className="font-mono text-green-400">+{fmtD(v.resaleVal)}</span>
            </div>
            <div className="flex justify-between text-base border-t border-zinc-700 pt-2 font-bold">
              <span className="text-zinc-200">Реальна ціна використання:</span>
              <span className="font-mono text-amber-400">{fmtD(v.realCost)}</span>
            </div>
          </div>

          {/* Per year / month */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-zinc-500 text-xs mb-0.5">На рік</div>
              <div className="text-white font-bold text-lg font-mono">{fmtD(v.perYear)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-zinc-500 text-xs mb-0.5">На місяць</div>
              <div className="text-white font-bold text-lg font-mono">{fmtD(v.perMonth)}</div>
            </div>
          </div>
        </div>

        {/* Final condition */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Стан авто після 5 років</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">🔧 Двигун</span>
              <HealthBar value={clamp(finalEng, 5, 100)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">⚙️ Коробка</span>
              <HealthBar value={clamp(finalTr, 5, 100)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">🚗 Кузов</span>
              <HealthBar value={clamp(v.finalBody, 5, 100)} />
            </div>
          </div>
        </div>

        {/* Verdict text */}
        <div className="bg-zinc-900/60 border border-amber-800/40 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-amber-500 mb-2">💡 Вердикт</div>
          <p className="text-zinc-200 text-sm leading-relaxed">{v.text}</p>
          {transData?.riskNote && (
            <p className="text-amber-400 text-xs mt-2">⚠️ {transData.riskNote}</p>
          )}
          {importCountry === 'usa' && (
            <p className="text-orange-400 text-xs mt-1">🇺🇸 Авто з США — перевір VIN на прихований збиток: carfax.com або carvertical.com</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => { setPhase('setup'); setSimData(null); setAiEvents(null); setYearIndex(0); }}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
          >
            ↩ Новий симулятор
          </button>
          <button
            onClick={() => { setYearIndex(0); setPhase('playing'); setIsAutoPlay(false); }}
            className="flex-1 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-700/40 rounded-xl transition-colors font-medium"
          >
            🔁 Переглянути знову
          </button>
        </div>
      </div>
    );
  }

  return null;
}
