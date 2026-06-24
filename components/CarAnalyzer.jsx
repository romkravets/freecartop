'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Share2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { analyzeRisk, generateShareText, IMPORT_OPTIONS } from '../lib/analyzer';

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score, size = 200 }) {
  const r    = (size - 24) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#f59e0b' :
    score >= 35 ? '#f97316' :
                  '#ef4444';

  const label =
    score >= 80 ? 'Норм' :
    score >= 60 ? 'Обережно' :
    score >= 35 ? 'Підозріло' :
                  'НЕБЕЗПЕКА';

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#1f1f1f" strokeWidth={14} />
        {/* Progress */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="score-ring"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1), stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold font-mono leading-none" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">з 100</span>
        <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

// ── Flag Card ─────────────────────────────────────────────────
function FlagCard({ flag }) {
  const [open, setOpen] = useState(false);

  const colors = {
    critical: { bg: 'bg-red-950/40',    border: 'border-red-700',   text: 'text-red-400',    badge: 'bg-red-900 text-red-300' },
    high:     { bg: 'bg-orange-950/30', border: 'border-orange-700', text: 'text-orange-400', badge: 'bg-orange-900 text-orange-300' },
    medium:   { bg: 'bg-amber-950/30',  border: 'border-amber-700',  text: 'text-amber-400',  badge: 'bg-amber-900 text-amber-300' },
    low:      { bg: 'bg-zinc-900/50',   border: 'border-zinc-700',   text: 'text-zinc-400',   badge: 'bg-zinc-800 text-zinc-400' },
  };

  const c      = colors[flag.severity] ?? colors.low;
  const labels = { critical: 'КРИТИЧНО', high: 'СЕРЙОЗНО', medium: 'ВАРТО ЗНАТИ', low: 'ІНФО' };

  return (
    <div
      className={`${c.bg} border-l-4 ${c.border} rounded-r-lg p-3 cursor-pointer select-none`}
      onClick={() => flag.detail && setOpen(o => !o)}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none mt-0.5">{flag.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.badge}`}>
              {labels[flag.severity]}
            </span>
            <span className={`text-sm font-semibold ${c.text}`}>{flag.title}</span>
          </div>
          {open && flag.detail && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed animate-fade-in">{flag.detail}</p>
          )}
        </div>
        {flag.detail && (
          <span className="text-gray-600 ml-1 flex-shrink-0">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, prefix, suffix }) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-gray-500 text-sm pointer-events-none">{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2.5 text-sm text-white
          placeholder-zinc-600 focus:outline-none focus:border-amber-500
          ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-12' : 'pr-3'}`}
      />
      {suffix && (
        <span className="absolute right-3 text-gray-500 text-sm pointer-events-none">{suffix}</span>
      )}
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
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white
        placeholder-zinc-600 focus:outline-none focus:border-amber-500"
    />
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all
        ${value
          ? 'border-amber-600 bg-amber-950/40 text-amber-400'
          : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600'}`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors
        ${value ? 'border-amber-400 bg-amber-400' : 'border-zinc-600 bg-transparent'}`} />
      {label}
    </button>
  );
}

function OwnerSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, '4+'].map(n => {
        const num = n === '4+' ? 4 : n;
        const active = value === num;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(num)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-all
              ${active
                ? 'border-amber-500 bg-amber-950/50 text-amber-400'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

// ── Share button ──────────────────────────────────────────────
function ShareButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handle}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-900
        text-sm text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-all"
    >
      {copied
        ? <><Check size={15} className="text-green-400" /> Скопійовано!</>
        : <><Share2 size={15} /> Поділитись результатом</>}
    </button>
  );
}

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <span className="text-lg">{icon}</span>
      <div>
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function CarAnalyzer() {
  // ── form state ─────────────────────────────────────────────
  const [make,         setMake        ] = useState('');
  const [model,        setModel       ] = useState('');
  const [year,         setYear        ] = useState('');
  const [claimedKm,    setClaimedKm   ] = useState('');
  const [prevKm1,      setPrevKm1     ] = useState('');
  const [prevKm2,      setPrevKm2     ] = useState('');
  const [owners,       setOwners      ] = useState(1);
  const [regYear,      setRegYear     ] = useState('');
  const [importCntry,  setImportCntry ] = useState('ua');
  const [fastReReg,    setFastReReg   ] = useState(false);
  const [priceAsked,   setPriceAsked  ] = useState('');
  const [marketPrice,  setMarketPrice ] = useState('');
  const [weeksOnSale,  setWeeksOnSale ] = useState('');
  const [vinChecked,   setVinChecked  ] = useState(false);

  const [analyzed, setAnalyzed] = useState(false);

  // ── compute ────────────────────────────────────────────────
  const result = useMemo(() => {
    if (!analyzed || !year || !claimedKm) return null;
    return analyzeRisk({
      year:          parseInt(year),
      claimedMileage: parseInt(claimedKm),
      prevMileage1:  parseInt(prevKm1) || 0,
      prevMileage2:  parseInt(prevKm2) || 0,
      owners,
      regYear:       parseInt(regYear) || 0,
      importCountry: importCntry,
      priceAsked:    parseFloat(priceAsked) || 0,
      marketPrice:   parseFloat(marketPrice) || 0,
      weeksOnSale:   parseInt(weeksOnSale) || 0,
      fastReReg,
      vinChecked,
    });
  }, [analyzed, year, claimedKm, prevKm1, prevKm2, owners, regYear,
      importCntry, fastReReg, priceAsked, marketPrice, weeksOnSale, vinChecked]);

  const shareText = useMemo(() => {
    if (!result) return '';
    return generateShareText(
      { make, model, year: parseInt(year), claimedMileage: parseInt(claimedKm), priceAsked: parseFloat(priceAsked), owners },
      result,
      parseFloat(marketPrice) || 0,
    );
  }, [result, make, model, year, claimedKm, priceAsked, owners, marketPrice]);

  const verdictBg = result
    ? result.verdictColor === 'green'  ? 'from-green-950/50 border-green-800'
    : result.verdictColor === 'yellow' ? 'from-amber-950/50 border-amber-800'
    : result.verdictColor === 'orange' ? 'from-orange-950/50 border-orange-800'
    : 'from-red-950/60 border-red-800'
    : '';

  const canAnalyze = year && claimedKm;

  return (
    <div className="w-full animate-slide-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── LEFT: INPUTS ────────────────────────────── */}
        <div className="space-y-5">

          {/* Basic */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <SectionHeader icon="🚘" title="Авто" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Марка">
                <TextInput value={make} onChange={setMake} placeholder="Toyota, BMW, Audi…" />
              </Field>
              <Field label="Модель">
                <TextInput value={model} onChange={setModel} placeholder="Camry, X6, A6…" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Рік випуску *">
                <NumberInput value={year} onChange={setYear} placeholder="2018" />
              </Field>
              <Field label="Заявлений пробіг *" >
                <NumberInput value={claimedKm} onChange={setClaimedKm} placeholder="95 000" suffix="км" />
              </Field>
            </div>
          </div>

          {/* Mileage history */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <SectionHeader
              icon="🔢"
              title="Попередній пробіг"
              sub="Знайди в архівах auto.ria, OLX або попередніх оголошеннях — це головний детектор скручування"
            />
            <Field label="Попередній запис пробігу" hint="Наприклад зі старого оголошення або фото панелі">
              <NumberInput value={prevKm1} onChange={setPrevKm1} placeholder="269 000" suffix="км" />
            </Field>
            <Field label="Ще один запис (необов'язково)">
              <NumberInput value={prevKm2} onChange={setPrevKm2} placeholder="208 000" suffix="км" />
            </Field>
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-2.5 flex gap-2">
              <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Шукай старі фото авто в Google, архівах auto.ria або запитай VIN-звіт — там видно пробіг при ТО
              </p>
            </div>
          </div>

          {/* Ownership */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <SectionHeader icon="👥" title="Власники та ввезення" />
            <Field label="Кількість власників">
              <OwnerSelector value={owners} onChange={setOwners} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="1-а реєстрація в UA" hint="Рік">
                <NumberInput value={regYear} onChange={setRegYear} placeholder="2022" />
              </Field>
              <Field label="Країна ввезення">
                <select
                  value={importCntry}
                  onChange={e => setImportCntry(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white
                    focus:outline-none focus:border-amber-500"
                >
                  {IMPORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Toggle value={fastReReg} onChange={setFastReReg} label="Швидке переоформлення (< 3 місяці)" />
          </div>

          {/* Price */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <SectionHeader
              icon="💰"
              title="Ціна та ринок"
              sub="Порівняй з auto.ria, OLX або autobazar.ua для подібних авто"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ціна продавця">
                <NumberInput value={priceAsked} onChange={setPriceAsked} placeholder="18 700" prefix="$" />
              </Field>
              <Field label="Ринкова ціна (~)">
                <NumberInput value={marketPrice} onChange={setMarketPrice} placeholder="17 800" prefix="$" />
              </Field>
            </div>
            <Field label="Тижнів в оголошенні" hint="Скільки тижнів продається — перевір дату оголошення">
              <NumberInput value={weeksOnSale} onChange={setWeeksOnSale} placeholder="104" suffix="тиж." />
            </Field>
          </div>

          {/* Checks */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <SectionHeader icon="🔍" title="Перевірки" />
            <Toggle value={vinChecked} onChange={setVinChecked} label="VIN перевірено (carvertical / auto.ria)" />
          </div>

          <button
            onClick={() => setAnalyzed(true)}
            disabled={!canAnalyze}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all
              ${canAnalyze
                ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
          >
            {analyzed ? '🔄 Оновити аналіз' : '🔍 Аналізувати авто'}
          </button>

        </div>

        {/* ─── RIGHT: RESULTS ──────────────────────────── */}
        <div className="lg:sticky lg:top-6 h-fit space-y-5">

          {!result ? (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
              <span className="text-5xl">🚗</span>
              <div>
                <p className="text-gray-300 font-semibold">Введи дані оголошення</p>
                <p className="text-gray-600 text-sm mt-1">
                  Хоча б рік і пробіг — і ми покажемо перші ризики
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-1.5 w-full max-w-xs">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Що аналізуємо:</p>
                {['Скручений пробіг', 'Підозрілі власники', 'Довге оголошення', 'Ціна vs ринок', 'Авто з США'].map(s => (
                  <p key={s} className="text-xs text-gray-400">• {s}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-slide-up space-y-4">

              {/* Score Card */}
              <div className={`bg-gradient-to-b ${verdictBg} border rounded-2xl p-6 flex flex-col items-center gap-4`}>
                {(make || model) && (
                  <p className="text-gray-400 text-sm font-mono">{[make, model, year].filter(Boolean).join(' ')}</p>
                )}
                <ScoreRing score={result.score} size={200} />
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{result.verdictEmoji} {result.verdict}</p>
                </div>
                <ShareButton text={shareText} />
              </div>

              {/* Red Flags */}
              {result.flags.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    🚩 Червоні прапорці
                    <span className="bg-red-900/70 text-red-400 text-xs px-1.5 py-0.5 rounded">
                      {result.flags.length}
                    </span>
                  </h3>
                  {result.flags.map((flag, i) => (
                    <FlagCard key={i} flag={flag} />
                  ))}
                </div>
              )}

              {/* Green Flags */}
              {result.positives.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    ✅ Позитивні сигнали
                    <span className="bg-green-900/50 text-green-400 text-xs px-1.5 py-0.5 rounded">
                      {result.positives.length}
                    </span>
                  </h3>
                  {result.positives.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-0.5">{p.icon}</span>
                      <span>{p.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Shareable text preview */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-gray-300 mb-2">📋 Текст для репосту</h3>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap break-words leading-relaxed bg-black/40 rounded-lg p-3 font-mono max-h-48 overflow-y-auto">
                  {shareText}
                </pre>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
