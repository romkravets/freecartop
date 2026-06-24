'use client';

import { AlertTriangle, Check, ChevronDown, ChevronUp, Info, Loader2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { IMPORT_OPTIONS } from '../lib/analyzer';

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score, size = 200 }) {
  const r     = (size - 24) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#f59e0b' :
    score >= 35 ? '#f97316' : '#ef4444';
  const label  =
    score >= 80 ? 'Норм' :
    score >= 60 ? 'Обережно' :
    score >= 35 ? 'Підозріло' : 'НЕБЕЗПЕКА';

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth={14} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)' }} />
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
    critical: { bg: 'bg-red-950/40',    border: 'border-red-700',    text: 'text-red-400',    badge: 'bg-red-900 text-red-300' },
    high:     { bg: 'bg-orange-950/30', border: 'border-orange-700', text: 'text-orange-400', badge: 'bg-orange-900 text-orange-300' },
    medium:   { bg: 'bg-amber-950/30',  border: 'border-amber-700',  text: 'text-amber-400',  badge: 'bg-amber-900 text-amber-300' },
    low:      { bg: 'bg-zinc-900/50',   border: 'border-zinc-700',   text: 'text-zinc-400',   badge: 'bg-zinc-800 text-zinc-400' },
  };
  const c      = colors[flag.severity] ?? colors.low;
  const labels = { critical: 'КРИТИЧНО', high: 'СЕРЙОЗНО', medium: 'ВАРТО ЗНАТИ', low: 'ІНФО' };

  return (
    <div className={`${c.bg} border-l-4 ${c.border} rounded-r-lg p-3 cursor-pointer`}
      onClick={() => flag.detail && setOpen(o => !o)}>
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
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{flag.detail}</p>
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

// ── Share Button ──────────────────────────────────────────────
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
    <button onClick={handle}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-900 text-sm text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-all">
      {copied ? <><Check size={15} className="text-green-400" /> Скопійовано!</> : <><Share2 size={15} /> Поділитись</>}
    </button>
  );
}

// ── Field ─────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 ${className}`} />
  );
}

function NumberInput({ value, onChange, placeholder, suffix }) {
  return (
    <div className="relative flex items-center">
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 pl-3 ${suffix ? 'pr-12' : 'pr-3'}`} />
      {suffix && <span className="absolute right-3 text-gray-500 text-sm pointer-events-none">{suffix}</span>}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all
        ${value ? 'border-amber-600 bg-amber-950/40 text-amber-400' : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600'}`}>
      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${value ? 'border-amber-400 bg-amber-400' : 'border-zinc-600 bg-transparent'}`} />
      {label}
    </button>
  );
}

function OwnerSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, '4+'].map(n => {
        const num = n === '4+' ? 4 : n;
        return (
          <button key={n} type="button" onClick={() => onChange(num)}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-all
              ${value === num ? 'border-amber-500 bg-amber-950/50 text-amber-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
            {n}
          </button>
        );
      })}
    </div>
  );
}

// ── Try to extract make/model from auto.ria URL ───────────────
function parseAutoRiaUrl(url) {
  if (!url) return {};
  try {
    // https://auto.ria.com/uk/auto_bmw_x6_34502088.html
    // https://auto.ria.com/uk/auto_toyota_camry_v70_35123456.html
    const m = url.match(/auto_([a-z]+)_([a-z0-9_]+?)_\d+\.html/i);
    if (m) {
      const make  = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      const model = m[2].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return { make, model };
    }
  } catch {}
  return {};
}

// ── Verdict background ────────────────────────────────────────
function verdictClass(level) {
  if (level === 'safe')       return 'from-green-950/50 border-green-800';
  if (level === 'caution')    return 'from-amber-950/50 border-amber-800';
  if (level === 'suspicious') return 'from-orange-950/50 border-orange-800';
  return 'from-red-950/60 border-red-800';
}

// ── AI Result Panel ───────────────────────────────────────────
function AIResult({ result, shareText }) {
  const { score, verdict, verdictLevel, postText, flags = [], positives = [], priceForecast, negotiationTip } = result;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Score + verdict */}
      <div className={`bg-gradient-to-b ${verdictClass(verdictLevel)} border rounded-2xl p-6 flex flex-col items-center gap-4`}>
        <ScoreRing score={score} size={200} />
        <p className="text-xl font-bold text-white text-center">{verdict}</p>
        <ShareButton text={shareText} />
      </div>

      {/* AI Post text */}
      {postText && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">📱 Готовий пост</p>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{postText}</p>
        </div>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            🚩 Червоні прапорці
            <span className="bg-red-900/70 text-red-400 text-xs px-1.5 py-0.5 rounded">{flags.length}</span>
          </h3>
          {flags.map((flag, i) => <FlagCard key={i} flag={flag} />)}
        </div>
      )}

      {/* Positives */}
      {positives.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-gray-300">✅ Позитивні сигнали</h3>
          {positives.map((p, i) => (
            <p key={i} className="text-sm text-gray-300">✅ {p}</p>
          ))}
        </div>
      )}

      {/* Price forecast + negotiation */}
      {(priceForecast || negotiationTip) && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
          {priceForecast && (
            <div className="flex gap-2">
              <span className="text-lg">📈</span>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Прогноз ціни</p>
                <p className="text-sm text-gray-200 mt-0.5">{priceForecast}</p>
              </div>
            </div>
          )}
          {negotiationTip && (
            <div className="flex gap-2">
              <span className="text-lg">💬</span>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Порада по торгу</p>
                <p className="text-sm text-gray-200 mt-0.5">{negotiationTip}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function AIAnalyzer() {
  const [listingUrl,  setListingUrl  ] = useState('');
  const [make,        setMake        ] = useState('');
  const [model,       setModel       ] = useState('');
  const [year,        setYear        ] = useState('');
  const [claimedKm,   setClaimedKm   ] = useState('');
  const [prevKm,      setPrevKm      ] = useState('');
  const [owners,      setOwners      ] = useState(1);
  const [importCntry, setImportCntry ] = useState('ua');
  const [fuelType,    setFuelType    ] = useState('');
  const [body,        setBody        ] = useState('');
  const [fastReReg,   setFastReReg   ] = useState(false);
  const [priceAsked,  setPriceAsked  ] = useState('');
  const [marketPrice, setMarketPrice ] = useState('');
  const [weeksOnSale, setWeeksOnSale ] = useState('');
  const [vinChecked,  setVinChecked  ] = useState(false);

  const [loading,  setLoading ] = useState(false);
  const [result,   setResult  ] = useState(null);
  const [error,    setError   ] = useState('');

  // Parse URL to auto-fill make/model
  const handleUrlChange = val => {
    setListingUrl(val);
    const parsed = parseAutoRiaUrl(val);
    if (parsed.make && !make)  setMake(parsed.make);
    if (parsed.model && !model) setModel(parsed.model);
  };

  const canSubmit = year && claimedKm && !loading;

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make, model, year, claimedMileage: claimedKm, prevMileage: prevKm,
          owners, importCountry: importCntry, fuelType, body,
          priceAsked, marketPrice, weeksOnSale, fastReReg, vinChecked, listingUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Щось пішло не так. Спробуй ще раз.');
        return;
      }
      setResult(data.result);
    } catch {
      setError('Помилка з\'єднання. Перевір інтернет і спробуй ще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Share text from AI result
  const shareText = result
    ? [
        `${make} ${model} ${year} — аналіз від freecartop 🚘`,
        `що ми маємо? 👇`,
        '',
        result.postText,
        '',
        `📊 Рейтинг довіри: ${result.score}/100`,
        result.verdict,
        '',
        'Перевірено на freecartop.vercel.app',
      ].join('\n')
    : '';

  return (
    <div className="w-full animate-slide-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── LEFT: INPUTS ────────────────────────────── */}
        <div className="space-y-4">

          {/* URL */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔗</span>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Посилання на оголошення</h3>
                <p className="text-xs text-gray-500">auto.ria.com, olx.ua — марка і модель заповняться самі</p>
              </div>
            </div>
            <TextInput value={listingUrl} onChange={handleUrlChange}
              placeholder="https://auto.ria.com/uk/auto_bmw_x6_35123456.html" />
          </div>

          {/* Basic */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-200">🚘 Авто</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Марка">
                <TextInput value={make} onChange={setMake} placeholder="Toyota, BMW…" />
              </Field>
              <Field label="Модель">
                <TextInput value={model} onChange={setModel} placeholder="Camry, X6…" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Рік *">
                <NumberInput value={year} onChange={setYear} placeholder="2018" />
              </Field>
              <Field label="Пробіг *">
                <NumberInput value={claimedKm} onChange={setClaimedKm} placeholder="95 000" suffix="км" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Тип кузова">
                <select value={body} onChange={e => setBody(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option value="">— не вказано</option>
                  <option value="sedan">Седан</option>
                  <option value="suv">Кросовер / SUV</option>
                  <option value="hatch">Хетч / Комбі</option>
                  <option value="minivan">Мінівен</option>
                  <option value="coupe">Купе</option>
                </select>
              </Field>
              <Field label="Пальне">
                <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option value="">— не вказано</option>
                  <option value="gasoline">Бензин</option>
                  <option value="diesel">Дизель</option>
                  <option value="hybrid">Гібрид</option>
                  <option value="electric">Електро</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Mileage history */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔢</span>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Попередній пробіг</h3>
                <p className="text-xs text-gray-500">Знайди в архіві auto.ria або старих оголошеннях</p>
              </div>
            </div>
            <NumberInput value={prevKm} onChange={setPrevKm} placeholder="269 000" suffix="км" />
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-2.5 flex gap-2">
              <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Якщо попередній пробіг більший за поточний — це головний сигнал скручування
              </p>
            </div>
          </div>

          {/* Ownership */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-200">👥 Власники та ввезення</h3>
            <Field label="Кількість власників">
              <OwnerSelector value={owners} onChange={setOwners} />
            </Field>
            <Field label="Країна ввезення">
              <select value={importCntry} onChange={e => setImportCntry(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
                {IMPORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Toggle value={fastReReg} onChange={setFastReReg} label="Швидке переоформлення (< 3 місяці)" />
          </div>

          {/* Price */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-200">💰 Ціна та ринок</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ціна продавця ($)">
                <NumberInput value={priceAsked} onChange={setPriceAsked} placeholder="18 700" />
              </Field>
              <Field label="Ринкова ціна (~$)">
                <NumberInput value={marketPrice} onChange={setMarketPrice} placeholder="17 800" />
              </Field>
            </div>
            <Field label="Тижнів в оголошенні">
              <NumberInput value={weeksOnSale} onChange={setWeeksOnSale} placeholder="104" suffix="тиж." />
            </Field>
          </div>

          {/* VIN */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <Toggle value={vinChecked} onChange={setVinChecked} label="VIN перевірено (carvertical / auto.ria)" />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={`w-full py-4 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2
              ${canSubmit ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> AI аналізує…</> : '🤖 Аналізувати з AI'}
          </button>

          {error && (
            <div className="flex gap-2 bg-red-950/40 border border-red-800 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* ─── RIGHT: RESULTS ──────────────────────────── */}
        <div className="lg:sticky lg:top-6 h-fit">
          {!result && !loading ? (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
              <span className="text-5xl">🤖</span>
              <div>
                <p className="text-gray-300 font-semibold">AI готовий до аналізу</p>
                <p className="text-gray-600 text-sm mt-1">Введи дані і натисни кнопку</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4 text-left space-y-1.5 w-full max-w-xs">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">AI зробить:</p>
                {['Аналіз скрученого пробігу', 'Оцінку ціни vs ринок', 'Прогноз ціни через рік', 'Пораду по торгу', 'Готовий Instagram-пост'].map(s => (
                  <p key={s} className="text-xs text-gray-400">• {s}</p>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[400px]">
              <Loader2 size={40} className="animate-spin text-amber-500" />
              <p className="text-gray-300 font-semibold">AI аналізує оголошення…</p>
              <p className="text-gray-600 text-xs">Зазвичай 5–10 секунд</p>
            </div>
          ) : (
            <AIResult result={result} shareText={shareText} />
          )}
        </div>
      </div>
    </div>
  );
}
