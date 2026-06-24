'use client';

import { AlertTriangle, ChevronLeft, Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { BODY_TYPES, BUDGETS, FUELS, PRIORITIES, PURPOSES } from '../lib/pickerData';

// ── Option Card ───────────────────────────────────────────────
function OptionCard({ emoji, label, desc, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all w-full
        ${active ? 'border-amber-500 bg-amber-950/40 text-amber-300' : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/60'}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="font-bold text-sm">{label}</span>
      </div>
      {desc && <span className="text-xs text-gray-500 leading-relaxed">{desc}</span>}
    </button>
  );
}

// ── Progress Bar ──────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500
          ${i < step ? 'bg-amber-500' : i === step ? 'bg-amber-800' : 'bg-zinc-800'}`} />
      ))}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const filled = Math.round(Math.max(1, Math.min(10, value)));
  const color = filled >= 9 ? 'bg-green-500' : filled >= 7 ? 'bg-amber-500' : filled >= 5 ? 'bg-orange-500' : 'bg-red-500';
  const textColor = filled >= 9 ? 'text-green-400' : filled >= 7 ? 'text-amber-400' : filled >= 5 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`h-1.5 w-3 rounded-sm ${i < filled ? color : 'bg-zinc-800'}`} />
        ))}
      </div>
      <span className={`font-mono font-bold ${textColor}`}>{filled}/10</span>
    </div>
  );
}

// ── Car Card ──────────────────────────────────────────────────
function CarCard({ car, rank }) {
  const [open, setOpen] = useState(rank === 1);
  const rankColors = { 1: 'border-amber-600 bg-amber-950/30', 2: 'border-zinc-600 bg-zinc-900/40', 3: 'border-zinc-700 bg-zinc-900/20' };
  const rankBadge  = { 1: 'bg-amber-500 text-black', 2: 'bg-zinc-600 text-white', 3: 'bg-zinc-700 text-zinc-300' };
  const rankLabel  = { 1: '🥇 Найкраще підходить', 2: '🥈 Хороший варіант', 3: '🥉 Також розглянь' };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${rankColors[rank]}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${rankBadge[rank]}`}>#{rank}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{car.icon}</span>
              <span className="font-bold text-white">{car.make} {car.model}</span>
              <span className="text-xs text-gray-500">{car.generation}</span>
            </div>
            <div className="text-sm text-amber-400 font-mono font-bold">{car.priceRange}</div>
          </div>
        </div>
        <span className="text-gray-500 text-xs hidden sm:block">{rankLabel[rank]}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-3">
          {car.whyBest && (
            <p className="text-sm text-amber-200/80 italic">"{car.whyBest}"</p>
          )}
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
              <p className="text-xs font-bold text-blue-400 mb-1">💡 Порада по ринку</p>
              <p className="text-xs text-blue-200/80">{car.marketTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────
const STEPS = [
  { key: 'budget',   title: 'Який бюджет?',          options: BUDGETS,    colsClass: 'grid-cols-2' },
  { key: 'purpose',  title: 'Для чого авто?',         options: PURPOSES,   colsClass: 'grid-cols-1 sm:grid-cols-2' },
  { key: 'body',     title: 'Який тип кузова?',       options: BODY_TYPES, colsClass: 'grid-cols-2' },
  { key: 'fuel',     title: 'Яке пальне?',            options: FUELS,      colsClass: 'grid-cols-2' },
  { key: 'priority', title: 'Що важливіше всього?',   options: PRIORITIES, colsClass: 'grid-cols-1 sm:grid-cols-2' },
];

// ── MAIN ──────────────────────────────────────────────────────
export default function AICarPicker() {
  const [step,       setStep       ] = useState(0);
  const [answers,    setAnswers    ] = useState({});
  const [extraNotes, setExtraNotes ] = useState('');
  const [showNotes,  setShowNotes  ] = useState(false);
  const [loading,    setLoading    ] = useState(false);
  const [results,    setResults    ] = useState(null);
  const [error,      setError      ] = useState('');

  const currentStep = STEPS[step];

  const getLabelForKey = (stepKey, optionKey) => {
    const stepDef = STEPS.find(s => s.key === stepKey);
    return stepDef?.options.find(o => o.key === optionKey)?.label ?? optionKey;
  };

  const pick = key => {
    const next = { ...answers, [currentStep.key]: key };
    setAnswers(next);
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 180);
    } else {
      // Last step — show extra notes or submit
      setShowNotes(true);
    }
  };

  const submit = async (prefs) => {
    setLoading(true);
    setResults(null);
    setError('');
    setShowNotes(false);
    try {
      const res = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget:       prefs.budget,
          budgetLabel:  getLabelForKey('budget', prefs.budget),
          purpose:      prefs.purpose,
          purposeLabel: getLabelForKey('purpose', prefs.purpose),
          body:         prefs.body,
          bodyLabel:    getLabelForKey('body', prefs.body),
          fuel:         prefs.fuel,
          fuelLabel:    getLabelForKey('fuel', prefs.fuel),
          priority:     prefs.priority,
          priorityLabel: getLabelForKey('priority', prefs.priority),
          extraNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Щось пішло не так. Спробуй ще раз.');
        setLoading(false);
        return;
      }
      setResults(data.result);
    } catch {
      setError('Помилка з\'єднання.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setExtraNotes('');
    setShowNotes(false);
    setResults(null);
    setError('');
    setLoading(false);
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-20 flex flex-col items-center gap-4 text-center">
        <Loader2 size={48} className="animate-spin text-amber-500" />
        <p className="text-gray-200 font-semibold">AI підбирає авто…</p>
        <p className="text-gray-500 text-sm">Аналізую ринок і знаходжу найкращі варіанти</p>
        <p className="text-gray-600 text-xs">Зазвичай 5–10 секунд</p>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────
  if (results) {
    const summaryParts = [
      getLabelForKey('budget', answers.budget),
      getLabelForKey('body', answers.body),
      getLabelForKey('fuel', answers.fuel),
      'пріоритет: ' + getLabelForKey('priority', answers.priority),
    ];
    return (
      <div className="animate-slide-up space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">🎯 Підбір завершено</h2>
            <p className="text-sm text-gray-500 mt-0.5">{summaryParts.join(' · ')}</p>
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
            {results.cars.map((car, i) => <CarCard key={car.id || i} car={car} rank={i + 1} />)}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Не знайдено авто під ці параметри.</p>
            <button onClick={reset} className="mt-4 px-4 py-2 rounded-lg border border-amber-600 text-amber-400 text-sm">Спробуй інші параметри</button>
          </div>
        )}

        <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
          <p className="text-xs text-blue-300 leading-relaxed">
            💡 <strong>Порада:</strong> Знайшов авто? Перейди до <strong>Аналізатора</strong> і перевір оголошення — скручений пробіг, підозрілих власників та ціну.
          </p>
        </div>
      </div>
    );
  }

  // ── Extra notes step ───────────────────────────────────────
  if (showNotes) {
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <ProgressBar step={STEPS.length} total={STEPS.length} />
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Останній крок</p>
          <h2 className="text-xl font-bold text-white">Є особливі побажання?</h2>
          <p className="text-xs text-gray-500 mt-1">Наприклад: "тільки японці", "не хочу DSG", "є гараж тільки для малих авто"</p>
        </div>
        <textarea
          value={extraNotes}
          onChange={e => setExtraNotes(e.target.value.slice(0, 200))}
          placeholder="Не обов'язково — можна пропустити"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none mb-4"
        />
        {error && (
          <div className="flex gap-2 bg-red-950/40 border border-red-800 rounded-xl p-3 mb-4">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setShowNotes(false)} className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:border-zinc-500 transition-all">
            ← Назад
          </button>
          <button onClick={() => submit(answers)}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-all flex items-center justify-center gap-2">
            🤖 Підібрати з AI
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard steps ───────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <ProgressBar step={step} total={STEPS.length} />
      <div className="flex items-center gap-3 mb-5">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-all">
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Крок {step + 1} з {STEPS.length}</p>
          <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
        </div>
      </div>
      <div className={`grid ${currentStep.colsClass} gap-3`}>
        {currentStep.options.map(opt => (
          <OptionCard key={opt.key} emoji={opt.emoji ?? ''} label={opt.label} desc={opt.desc}
            active={answers[currentStep.key] === opt.key} onClick={() => pick(opt.key)} />
        ))}
      </div>
    </div>
  );
}
