'use client';

import { AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, Info, Loader2, Search, Share2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
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
      try { await navigator.share({ text }); return; }
      catch (e) { if (e?.name === 'AbortError') return; }
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

// ── VIN Inspector Panel ───────────────────────────────────────
function VinInspectorPanel({ result }) {
  const { nhtsa, auctions, links } = result;

  const AuctionBadge = ({ label, data, link }) => {
    let color, icon, text;
    if (data?.found === true)  { color = 'border-red-700 bg-red-950/40 text-red-400'; icon = '🚨'; text = 'ЗНАЙДЕНО'; }
    else if (data?.found === false) { color = 'border-green-700 bg-green-950/30 text-green-400'; icon = '✅'; text = 'не знайдено'; }
    else { color = 'border-zinc-700 bg-zinc-900/50 text-zinc-400'; icon = '❓'; text = data?.error ? 'недоступно' : 'перевірте'; }
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${color}`}>
        <span>{icon}</span>
        <span className="font-bold">{label}:</span>
        <span>{text}</span>
        {data?.lotNumber && <span className="opacity-70">лот #{data.lotNumber}</span>}
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
          <ExternalLink size={11} />
        </a>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900/60 border border-amber-800/40 rounded-2xl p-4 space-y-3 animate-slide-up">
      <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">🤖 Робот-інспектор</p>

      {/* NHTSA data */}
      {nhtsa && (
        <div className="bg-zinc-800/50 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">NHTSA США</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {[
              ['Марка', nhtsa.make],
              ['Модель', nhtsa.model],
              ['Рік', nhtsa.year],
              ['Кузов', nhtsa.bodyClass],
              ['Пальне', nhtsa.fuel],
              ['Двигун', nhtsa.engine ? `${nhtsa.engine}${nhtsa.cylinders ? ' ' + nhtsa.cylinders + 'цил.' : ''}` : null],
              ['Привід', nhtsa.driveType],
              ['Де зроблено', nhtsa.plant],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <span className="text-[11px] text-gray-500 flex-shrink-0">{k}:</span>
                <span className="text-[11px] text-gray-200 font-medium truncate">{v}</span>
              </div>
            ))}
          </div>
          {nhtsa.hasError && (
            <p className="text-[10px] text-amber-400">⚠️ VIN частково нерозпізнаний NHTSA</p>
          )}
        </div>
      )}
      {!nhtsa && (
        <p className="text-xs text-gray-500">NHTSA: дані не отримані (VIN може бути не американським)</p>
      )}

      {/* Auction checks */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Страхові аукціони</p>
        <AuctionBadge label="Copart" data={auctions.copart} link={links.copart} />
        <AuctionBadge label="IAAI"   data={auctions.iaai}   link={links.iaai}   />
        {(auctions.copart?.found === true || auctions.iaai?.found === true) && (
          <div className="flex gap-2 bg-red-950/40 border border-red-800 rounded-lg p-2.5">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              Авто знайдено на страховому аукціоні США — висока ймовірність тотальної аварії або катастрофічних пошкоджень
            </p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[
          { label: 'CarFax', href: links.carfax },
          { label: 'AutoRIA', href: links.autoRia },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-all">
            {label} <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Photo Analysis Card ───────────────────────────────────────
function PhotoAnalysisCard({ analysis, onClose }) {
  const grade = analysis.overallGrade ?? 0;
  const gradeColor = grade >= 7 ? '#22c55e' : grade >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-3 space-y-2 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-300">📸 Аналіз фото</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: gradeColor }}>{grade}/10</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-300">{analysis.exteriorCondition}</p>
      {analysis.rustSigns && analysis.rustSigns !== 'не виявлено' && (
        <p className="text-xs text-amber-300">🔴 Іржа: {analysis.rustSigns}</p>
      )}
      {analysis.redFlags?.length > 0 && (
        <div className="space-y-0.5">
          {analysis.redFlags.map((f, i) => (
            <p key={i} className="text-xs text-red-400">⚠️ {f}</p>
          ))}
        </div>
      )}
      {analysis.checkInPerson && (
        <p className="text-xs text-blue-300">🔍 {analysis.checkInPerson}</p>
      )}
    </div>
  );
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

  // VIN Inspector
  const [vin,            setVin          ] = useState('');
  const [vinResult,      setVinResult    ] = useState(null);
  const [vinLoading,     setVinLoading   ] = useState(false);
  const [vinError,       setVinError     ] = useState('');
  // VIN Report paste
  const [vinReport,      setVinReport    ] = useState('');
  const [showVinReport,  setShowVinReport] = useState(false);
  // Photo
  const photoInputRef = useRef(null);
  const [photoPreview,   setPhotoPreview  ] = useState(null);
  const [photoBase64,    setPhotoBase64   ] = useState(null);
  const [photoMediaType, setPhotoMediaType] = useState('image/jpeg');
  const [photoAnalysis,  setPhotoAnalysis ] = useState(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);

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

  // VIN check via NHTSA + Copart/IAAI
  const handleVinCheck = async () => {
    const v = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (v.length !== 17) { setVinError('VIN має бути рівно 17 символів'); return; }
    setVinLoading(true);
    setVinResult(null);
    setVinError('');
    try {
      const res  = await fetch(`/api/vin-check?vin=${v}`);
      const data = await res.json();
      if (data.ok) {
        setVinResult(data);
        const n = data.nhtsa;
        if (n?.make  && !make)  setMake(n.make.charAt(0).toUpperCase() + n.make.slice(1).toLowerCase());
        if (n?.model && !model) setModel(n.model);
        if (n?.year  && !year)  setYear(n.year);
      } else {
        setVinError(data.message || 'Помилка перевірки VIN');
      }
    } catch {
      setVinError('Помилка зʼєднання при перевірці VIN');
    } finally {
      setVinLoading(false);
    }
  };

  // Photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('Фото занадто велике. Максимум 3MB.'); return; }
    const mt = file.type || 'image/jpeg';
    setPhotoMediaType(mt);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setPhotoPreview(url);
      setPhotoBase64(url.split(',')[1]);
      setPhotoAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoAnalyze = async () => {
    if (!photoBase64) return;
    setPhotoAnalyzing(true);
    try {
      const res  = await fetch('/api/photo-analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageBase64: photoBase64, mediaType: photoMediaType, make, model, year }),
      });
      const data = await res.json();
      if (data.ok) setPhotoAnalysis(data.analysis);
      else setError('Помилка аналізу фото. Спробуй ще раз.');
    } catch {
      setError('Помилка зʼєднання при аналізі фото');
    } finally {
      setPhotoAnalyzing(false);
    }
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
          vin: vin.trim(),
          vinReport: vinReport.slice(0, 3000),
          nhtsaData:    vinResult?.nhtsa    ?? null,
          auctionData:  vinResult?.auctions ?? null,
          photoAnalysis: photoAnalysis ?? null,
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

          {/* VIN Inspector */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔍</span>
              <div>
                <h3 className="text-sm font-bold text-gray-200">VIN-інспектор</h3>
                <p className="text-xs text-gray-500">NHTSA декодування + перевірка Copart/IAAI. Автозаповнює марку/модель/рік</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={vin}
                onChange={e => { setVin(e.target.value.toUpperCase()); setVinError(''); setVinResult(null); }}
                onKeyDown={e => e.key === 'Enter' && handleVinCheck()}
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono tracking-widest uppercase"
              />
              <button
                onClick={handleVinCheck}
                disabled={vinLoading || vin.replace(/[^A-HJ-NPR-Z0-9]/gi,'').length !== 17}
                className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-sm transition-all flex items-center gap-1.5 flex-shrink-0">
                {vinLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {vinLoading ? 'Перевіряю…' : 'Перевірити'}
              </button>
            </div>
            {vinError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {vinError}
              </p>
            )}
            {vinResult && <VinInspectorPanel result={vinResult} />}

            {/* VIN Report paste toggle */}
            <button
              onClick={() => setShowVinReport(v => !v)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-amber-400 transition-colors">
              {showVinReport ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Вставити дані з VIN-звіту (CarVertical / AutoRIA / CarFax)
            </button>
            {showVinReport && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">Вставте текст зі звіту. AI врахує ці дані в аналізі.</p>
                <textarea
                  value={vinReport}
                  onChange={e => setVinReport(e.target.value)}
                  placeholder="Вставте текст звіту тут..."
                  rows={5}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-y"
                />
                <p className="text-right text-[10px] text-gray-600">{vinReport.length}/3000</p>
              </div>
            )}
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

          {/* VIN checked toggle */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <Toggle value={vinChecked} onChange={setVinChecked} label="VIN перевірено (carvertical / auto.ria)" />
          </div>

          {/* Photo upload */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">📸</span>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Фото авто</h3>
                <p className="text-xs text-gray-500">AI оцінить стан кузова, фарби та іржу по фото</p>
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {!photoPreview ? (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-700 hover:border-amber-600 rounded-xl p-6 flex flex-col items-center gap-2 transition-all group">
                <Upload size={22} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Натисни щоб додати фото (до 3MB)</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Car photo" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={() => { setPhotoPreview(null); setPhotoBase64(null); setPhotoAnalysis(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-all">
                    <X size={14} />
                  </button>
                </div>
                {!photoAnalysis ? (
                  <button
                    onClick={handlePhotoAnalyze}
                    disabled={photoAnalyzing}
                    className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2">
                    {photoAnalyzing ? <><Loader2 size={14} className="animate-spin" /> Аналізую фото…</> : '🤖 Аналізувати фото'}
                  </button>
                ) : (
                  <PhotoAnalysisCard analysis={photoAnalysis} onClose={() => setPhotoAnalysis(null)} />
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  Замінити фото
                </button>
              </div>
            )}
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
