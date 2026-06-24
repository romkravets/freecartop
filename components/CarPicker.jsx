'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { BUDGETS, PURPOSES, BODY_TYPES, FUELS, PRIORITIES, pickCars } from '../lib/pickerData';

// ── Step Option Card ──────────────────────────────────────────
function OptionCard({ emoji, label, desc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all w-full
        ${active
          ? 'border-amber-500 bg-amber-950/40 text-amber-300'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/60'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="font-bold text-sm">{label}</span>
      </div>
      {desc && <span className="text-xs text-gray-500 leading-relaxed">{desc}</span>}
    </button>
  );
}

// ── Progress Bar ─────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500
            ${i < step ? 'bg-amber-500' : i === step ? 'bg-amber-800' : 'bg-zinc-800'}`}
        />
      ))}
    </div>
  );
}

// ── Reliability Stars ─────────────────────────────────────────
function ScoreBar({ label, value }) {
  const filled = Math.round(value);
  const color =
    filled >= 9 ? 'bg-green-500' :
    filled >= 7 ? 'bg-amber-500' :
    filled >= 5 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-sm ${i < filled ? color : 'bg-zinc-800'}`}
          />
        ))}
      </div>
      <span className={`font-mono font-bold ${filled >= 9 ? 'text-green-400' : filled >= 7 ? 'text-amber-400' : filled >= 5 ? 'text-orange-400' : 'text-red-400'}`}>
        {filled}/10
      </span>
    </div>
  );
}

// ── Car Result Card ───────────────────────────────────────────
function CarCard({ car, rank }) {
  const [open, setOpen] = useState(rank === 1);

  const rankColors = {
    1: 'border-amber-600 bg-amber-950/30',
    2: 'border-zinc-600 bg-zinc-900/40',
    3: 'border-zinc-700 bg-zinc-900/20',
  };

  const rankBadge = {
    1: 'bg-amber-500 text-black',
    2: 'bg-zinc-600 text-white',
    3: 'bg-zinc-700 text-zinc-300',
  };

  const rankLabel = { 1: '🥇 Найкраще підходить', 2: '🥈 Хороший варіант', 3: '🥉 Також розглянь' };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${rankColors[rank]}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
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
        <span className="text-gray-500 text-xs">{rankLabel[rank]}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-3 animate-fade-in">
          {/* Scores */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Характеристики</p>
            <ScoreBar label="Надійність"  value={car.scores.reliability} />
            <ScoreBar label="Економність" value={car.scores.economy} />
            <ScoreBar label="Комфорт"     value={car.scores.comfort} />
            <ScoreBar label="Динаміка"    value={car.scores.dynamics} />
            <ScoreBar label="Безпека"     value={car.scores.safety} />
          </div>

          {/* Pros/Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-green-400 mb-1.5">✅ Плюси</p>
              {car.pros.map((p, i) => (
                <p key={i} className="text-xs text-gray-300 mb-1">• {p}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 mb-1.5">❌ Мінуси</p>
              {car.cons.map((c, i) => (
                <p key={i} className="text-xs text-gray-300 mb-1">• {c}</p>
              ))}
            </div>
          </div>

          {/* Watch out */}
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-400 mb-1.5">⚠️ На що звернути увагу при покупці</p>
            {car.watchOut.map((w, i) => (
              <p key={i} className="text-xs text-amber-200/70 mb-1">• {w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── STEPS CONFIG ─────────────────────────────────────────────
const STEPS = [
  { key: 'budget',   title: 'Який бюджет?',            options: BUDGETS,    colsClass: 'grid-cols-2' },
  { key: 'purpose',  title: 'Для чого авто?',           options: PURPOSES,   colsClass: 'grid-cols-1 sm:grid-cols-2' },
  { key: 'body',     title: 'Який тип кузова?',         options: BODY_TYPES, colsClass: 'grid-cols-2' },
  { key: 'fuel',     title: 'Яке пальне?',              options: FUELS,      colsClass: 'grid-cols-2' },
  { key: 'priority', title: 'Що важливіше всього?',     options: PRIORITIES, colsClass: 'grid-cols-1 sm:grid-cols-2' },
];

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function CarPicker() {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone]       = useState(false);

  const currentStep = STEPS[step];

  const pick = key => {
    const next = { ...answers, [currentStep.key]: key };
    setAnswers(next);

    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 200);
    } else {
      setDone(true);
    }
  };

  const results = useMemo(() => {
    if (!done) return [];
    return pickCars({
      budget:   answers.budget,
      purpose:  answers.purpose,
      body:     answers.body,
      fuel:     answers.fuel,
      priority: answers.priority,
    });
  }, [done, answers]);

  const reset = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
  };

  // ── Done / Results ─────────────────────────────────────────
  if (done && results.length > 0) {
    const summaryLabels = {
      budget:  BUDGETS.find(b => b.key === answers.budget)?.label,
      purpose: PURPOSES.find(p => p.key === answers.purpose)?.label,
      body:    BODY_TYPES.find(b => b.key === answers.body)?.label,
      fuel:    FUELS.find(f => f.key === answers.fuel)?.label,
      priority: PRIORITIES.find(p => p.key === answers.priority)?.label,
    };

    return (
      <div className="animate-slide-up space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">🎯 Підбір завершено</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {summaryLabels.budget} · {summaryLabels.body} · {summaryLabels.fuel} · пріоритет: {summaryLabels.priority}
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-amber-600 hover:text-amber-400 transition-all"
          >
            <RotateCcw size={14} /> Спочатку
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((car, i) => (
              <CarCard key={car.id} car={car} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-gray-400">На жаль, не знайдено авто під ці параметри.</p>
            <p className="text-gray-500 text-sm mt-1">Спробуй змінити тип кузова або пальне.</p>
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 rounded-lg border border-amber-600 text-amber-400 text-sm hover:bg-amber-950/30 transition-all"
            >
              Почати знову
            </button>
          </div>
        )}

        {/* Tip */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
          <p className="text-xs text-blue-300 leading-relaxed">
            💡 <strong>Порада:</strong> Знайшов авто? Перейди до{' '}
            <strong>Аналізатора</strong> і перевір оголошення на червоні прапорці — скручений пробіг, підозрілих власників та завищену ціну.
          </p>
        </div>
      </div>
    );
  }

  // ── Wizard Steps ───────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <ProgressBar step={step} total={STEPS.length} />

      <div className="flex items-center gap-3 mb-5">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Крок {step + 1} з {STEPS.length}
          </p>
          <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
        </div>
      </div>

      <div className={`grid ${currentStep.colsClass} gap-3`}>
        {currentStep.options.map(opt => (
          <OptionCard
            key={opt.key}
            emoji={opt.emoji ?? opt.icon ?? ''}
            label={opt.label}
            desc={opt.desc}
            active={answers[currentStep.key] === opt.key}
            onClick={() => pick(opt.key)}
          />
        ))}
      </div>
    </div>
  );
}
