'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// AI versions (call Claude API)
const AIAnalyzer  = dynamic(() => import('../components/AIAnalyzer'),  { ssr: false });
const AICarPicker = dynamic(() => import('../components/AICarPicker'),  { ssr: false });

// Static fallbacks (no API key needed)
const CarAnalyzer  = dynamic(() => import('../components/CarAnalyzer'),  { ssr: false });
const CarPicker    = dynamic(() => import('../components/CarPicker'),    { ssr: false });
const CarSimulator     = dynamic(() => import('../components/CarSimulator'),     { ssr: false });
const MarketDashboard  = dynamic(() => import('../components/MarketDashboard'),  { ssr: false });

const HAS_AI = Boolean(process.env.NEXT_PUBLIC_AI_ENABLED === 'true');

// ── Example cases (like those Instagram posts) ────────────────
const EXAMPLES = [
  {
    model: 'Audi A6 2018',
    verdict: '☠️ ТІКАЙ',
    score: 12,
    color: 'red',
    flags: [
      '🔢 Пробіг скручений на 214 000 км',
      '👥 4 власники з 2022',
      '🔄 Швидке переоформлення у 2023',
      '📅 Продається вже 2 роки',
      '💰 Ціна вища за ринок на +5%',
    ],
    story: 'Ще у 2024 було 269k км, а в 2025 стало "чесних" 55k км 🤯',
  },
  {
    model: 'BMW X6 E71 2010',
    verdict: '🔴 Підозріло',
    score: 28,
    color: 'orange',
    flags: [
      '🇺🇸 Авто з США (кузов відновлювали після крадіжки)',
      '🔢 Пробіг скручений на 118 000 км',
      '👥 3 власники, третій — невдалий перекуп',
      '📅 Продається вже 3 рік поспіль',
      '💰 Просять $18 500 при ринку ~$15 100 (+22%)',
    ],
    story: 'США: 208k км → скрутили → продають як "95k км" 🤷‍♀️',
  },
];

// ── Example Card ──────────────────────────────────────────────
function ExampleCard({ ex }) {
  const colorMap = {
    red:    { border: 'border-red-800',    badge: 'bg-red-900 text-red-300',    score: 'text-red-400' },
    orange: { border: 'border-orange-800', badge: 'bg-orange-900 text-orange-300', score: 'text-orange-400' },
  };
  const c = colorMap[ex.color];

  return (
    <div className={`bg-zinc-900/60 border ${c.border} rounded-2xl p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-white">{ex.model}</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.badge}`}>{ex.verdict}</span>
      </div>
      <p className="text-xs text-gray-500 italic">"{ex.story}"</p>
      <div className="space-y-1.5">
        {ex.flags.map((f, i) => (
          <p key={i} className="text-xs text-gray-300">{f}</p>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="h-1 flex-1 bg-zinc-800 rounded-full">
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${ex.score}%`, backgroundColor: ex.color === 'red' ? '#ef4444' : '#f97316' }}
          />
        </div>
        <span className={`text-xs font-mono font-bold ${c.score}`}>{ex.score}/100</span>
      </div>
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────
function Stat({ number, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-black font-mono text-amber-400">{number}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────
function TabBtn({ id, active, onClick, emoji, label }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all
        ${active
          ? 'bg-amber-500 text-black'
          : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
    >
      <span className="text-base">{emoji}</span>
      {label}
    </button>
  );
}

// ── HOW IT WORKS STEPS ────────────────────────────────────────
const HOW_STEPS = [
  { n: '01', title: 'Вводиш дані оголошення', desc: 'Рік, пробіг, власники, ціна — займає 2 хвилини' },
  { n: '02', title: 'Ми рахуємо ризики',       desc: '8 перевірок: скручений пробіг, підозрілі власники, ціна vs ринок' },
  { n: '03', title: 'Отримуєш рейтинг',        desc: 'Рейтинг довіри 0–100 і список червоних прапорців з поясненнями' },
  { n: '04', title: 'Ділишся',                  desc: 'Копіюєш текст і відправляєш друзям або в спільноту' },
];

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function Page() {
  const [view, setView] = useState('landing'); // 'landing' | 'analyzer' | 'picker' | 'simulator' | 'market'
  const [simulatorPreFill, setSimulatorPreFill] = useState(null);

  function handleSimulateFromPicker(car) {
    // car = { make, model, generation, priceRange, ... } from AICarPicker results
    const yearMatch = String(car.generation ?? '').match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';
    // priceRange like "$9 000–14 000" — take lower bound
    const priceMatch = String(car.priceRange ?? '').match(/\$?([\d\s]+)/);
    const price = priceMatch ? priceMatch[1].replace(/\s/g, '') : '';
    setSimulatorPreFill({ make: car.make ?? '', model: car.model ?? '', year, price });
    setView('simulator');
  }

  if (view === 'analyzer' || view === 'picker' || view === 'simulator' || view === 'market') {
    return (
      <div className="min-h-screen bg-[#080808]">
        {/* Sticky Nav */}
        <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#080808]/90 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button
              onClick={() => setView('landing')}
              className="flex items-center gap-2 text-amber-400 font-black text-lg tracking-tight"
            >
              🚗 <span>FreeCar<span className="text-white">Top</span></span>
            </button>

            <div className="flex gap-2">
              <TabBtn id="analyzer"  active={view === 'analyzer'}  onClick={setView} emoji="🔍" label="Аналізатор" />
              <TabBtn id="picker"    active={view === 'picker'}    onClick={setView} emoji="🎯" label="Підбір авто" />
              <TabBtn id="simulator" active={view === 'simulator'} onClick={setView} emoji="🔮" label="Симулятор" />
              <TabBtn id="market"    active={view === 'market'}    onClick={setView} emoji="📊" label="Ринок" />
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {view === 'analyzer' && (
            <div>
              <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-white">
                    {HAS_AI ? '🤖 AI-аналізатор авто' : '🔍 Аналізатор авто'}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {HAS_AI
                      ? 'Вводиш дані — AI робить розбір як Instagram-пост + прогноз ціни і поради'
                      : 'Введи дані оголошення — покажемо всі червоні прапорці і рейтинг довіри'}
                  </p>
                </div>
                {HAS_AI && (
                  <span className="text-xs bg-amber-900/50 border border-amber-700 text-amber-400 px-2 py-1 rounded-full font-semibold">
                    ✨ Powered by Claude AI
                  </span>
                )}
              </div>
              {HAS_AI ? <AIAnalyzer /> : <CarAnalyzer />}
            </div>
          )}
          {view === 'picker' && (
            <div>
              <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-white">
                    {HAS_AI ? '🤖 AI-підбір авто' : '🎯 Підбір авто'}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {HAS_AI
                      ? 'Дай відповідь на 5 питань — AI підбере найкращі варіанти з поясненням'
                      : 'Дай відповідь на 5 питань — підберемо найкращі варіанти для UA ринку'}
                  </p>
                </div>
                {HAS_AI && (
                  <span className="text-xs bg-amber-900/50 border border-amber-700 text-amber-400 px-2 py-1 rounded-full font-semibold">
                    ✨ Powered by Claude AI
                  </span>
                )}
              </div>
              {HAS_AI ? <AICarPicker onSimulateClick={handleSimulateFromPicker} /> : <CarPicker />}
            </div>
          )}
          {view === 'simulator' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-black text-white">🔮 Симулятор Життя Авто</h1>
                <p className="text-gray-500 text-sm mt-1">
                  AI прорахує 5 років — ціна, стан двигуна, витрати на ТО і несподівані поломки
                </p>
              </div>
              <CarSimulator preFill={simulatorPreFill} onPreFillUsed={() => setSimulatorPreFill(null)} />
            </div>
          )}
          {view === 'market' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-black text-white">📊 Ринок авто в Україні</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Реальні ціни AUTO.RIA/OLX, новини та AI-аналіз для популярних моделей
                </p>
              </div>
              <MarketDashboard />
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── LANDING ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Nav */}
      <header className="border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight">
            🚗 <span>FreeCar<span className="text-amber-400">Top</span></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('analyzer')}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-all"
            >
              🔍 Аналізатор
            </button>
            <button
              onClick={() => setView('picker')}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-all"
            >
              🎯 Підібрати авто
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-block bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
          🇺🇦 Для покупців авто в Україні
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-none tracking-tight mb-4">
          Купуй авто <br />
          <span className="text-amber-400">без обману</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
          Вводиш дані оголошення — ми знаходимо скручений пробіг,
          підозрілих власників і завищену ціну. Як ті Instagram-пости
          розбору авто, але для тебе.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setView('analyzer')}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg rounded-xl transition-all"
          >
            🔍 Перевірити оголошення
          </button>
          <button
            onClick={() => setView('picker')}
            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-bold text-lg rounded-xl transition-all"
          >
            🎯 Підібрати авто
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-b border-zinc-800/60 py-8">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat number="8+" label="перевірок кожного авто" />
          <Stat number="0/100" label="рейтинг довіри" />
          <Stat number="15+" label="моделей у базі UA" />
          <Stat number="🆓" label="безкоштовно, без реєстрації" />
        </div>
      </section>

      {/* Examples */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-2">Реальні кейси</h2>
          <p className="text-gray-500">Такий розбір ми робимо для тебе за 2 хвилини</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {EXAMPLES.map((ex, i) => <ExampleCard key={i} ex={ex} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-900/30 border-t border-b border-zinc-800/60 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-2">Як це працює</h2>
            <p className="text-gray-500">Просто і зрозуміло</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map(s => (
              <div key={s.n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 card-hover">
                <div className="text-3xl font-black text-amber-500/40 font-mono mb-3">{s.n}</div>
                <h3 className="font-bold text-white mb-1.5">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we check */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-2">Що ми перевіряємо</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: '🔢', title: 'Скручений пробіг', desc: 'Порівнюємо поточний пробіг з попередніми записами' },
            { icon: '👥', title: 'Підозрілі власники', desc: 'Забагато власників за короткий час — погана ознака' },
            { icon: '📅', title: 'Довге оголошення',  desc: 'Ніхто не купує 2 роки — є причина' },
            { icon: '💰', title: 'Ціна vs ринок',     desc: 'Зависока або занизька ціна — обидва варіанти підозрілі' },
            { icon: '🇺🇸', title: 'Авто з США',        desc: 'Ризик прихованих пошкоджень після ДТП або крадіжки' },
            { icon: '🔄', title: 'Швидке переоформлення', desc: 'Чому власник так поспішав позбутись?' },
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 card-hover flex gap-3">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <h3 className="font-bold text-sm text-white mb-0.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-800/60 py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-black mb-3">Готовий перевірити авто?</h2>
          <p className="text-gray-500 mb-6">Безкоштовно. Без реєстрації. Займає 2 хвилини.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setView('analyzer')}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-xl transition-all"
            >
              🔍 Аналізувати оголошення
            </button>
            <button
              onClick={() => setView('picker')}
              className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-bold text-base rounded-xl transition-all"
            >
              🎯 Підібрати авто по потребах
            </button>
            <button
              onClick={() => setView('simulator')}
              className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-amber-700/40 font-bold text-base rounded-xl transition-all text-amber-400"
            >
              🔮 Симулятор авто
            </button>
            <button
              onClick={() => setView('market')}
              className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-bold text-base rounded-xl transition-all text-zinc-300"
            >
              📊 Ціни на ринку
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-gray-600">
        <p>FreeCar Top — для тих, хто не хоче купити чужі проблеми 🚗</p>
        <p className="mt-1">Дані для ознайомлення. Завжди перевіряй авто у сертифікованого механіка.</p>
      </footer>

    </div>
  );
}
