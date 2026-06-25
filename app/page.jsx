'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const AIAnalyzer     = dynamic(() => import('../components/AIAnalyzer'),     { ssr: false });
const AICarPicker    = dynamic(() => import('../components/AICarPicker'),     { ssr: false });
const CarAnalyzer    = dynamic(() => import('../components/CarAnalyzer'),     { ssr: false });
const CarPicker      = dynamic(() => import('../components/CarPicker'),       { ssr: false });
const CarSimulator   = dynamic(() => import('../components/CarSimulator'),    { ssr: false });
const MarketDashboard = dynamic(() => import('../components/MarketDashboard'), { ssr: false });

const HAS_AI = Boolean(process.env.NEXT_PUBLIC_AI_ENABLED === 'true');

// ── Data ─────────────────────────────────────────────────────
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
    story: 'США: 208k км → скрутили → продають як "95k км" 🤷',
  },
];

const TOOLS = [
  {
    id: 'analyzer',
    emoji: '🔍',
    title: 'AI Аналізатор',
    subtitle: 'Перевір оголошення',
    desc: 'VIN-декодер, фото авто, перевірка Copart/IAAI, звіт CarVertical. AI видає розбір з рейтингом довіри 0–100.',
    tags: ['VIN', 'Фото AI', 'Аукціони', 'Ринкова ціна'],
    accent: 'amber',
  },
  {
    id: 'picker',
    emoji: '🎯',
    title: 'Підбір авто',
    subtitle: 'Знайди своє авто',
    desc: 'Бюджет-слайдер, мульти-вибір мети і кузова, пріоритети, фільтр коробки і країни. AI підбирає 3 найкращих варіанти.',
    tags: ['Гнучкий підбір', 'Мульти-фільтри', 'AI рекомендації'],
    accent: 'blue',
  },
  {
    id: 'simulator',
    emoji: '🔮',
    title: 'Симулятор',
    subtitle: '5 років з авто',
    desc: 'Вводиш авто або вставляєш посилання з auto.ria — AI моделює поломки, ТО, витрати та зміну стану за 5 років.',
    tags: ['AI події', 'Порівняння 2 авто', 'Посилання auto.ria'],
    accent: 'purple',
  },
  {
    id: 'market',
    emoji: '📊',
    title: 'Ринок',
    subtitle: 'Live ціни UA',
    desc: 'Скрейпінг auto.ria в реальному часі: середня, мін/макс, кількість оголошень. AI-аналіз ринку по моделі.',
    tags: ['Live auto.ria', 'AI тренди', 'Слабкі місця'],
    accent: 'green',
  },
];

const ACCENT = {
  amber:  { border: 'border-amber-700/50',  bg: 'bg-amber-950/20',  tag: 'bg-amber-950/60 text-amber-400 border-amber-800',   btn: 'bg-amber-500 hover:bg-amber-400 text-black',   icon: 'text-amber-400' },
  blue:   { border: 'border-blue-700/50',   bg: 'bg-blue-950/20',   tag: 'bg-blue-950/60 text-blue-400 border-blue-800',      btn: 'bg-blue-600 hover:bg-blue-500 text-white',      icon: 'text-blue-400' },
  purple: { border: 'border-purple-700/50', bg: 'bg-purple-950/20', tag: 'bg-purple-950/60 text-purple-400 border-purple-800', btn: 'bg-purple-600 hover:bg-purple-500 text-white',  icon: 'text-purple-400' },
  green:  { border: 'border-green-700/50',  bg: 'bg-green-950/20',  tag: 'bg-green-950/60 text-green-400 border-green-800',   btn: 'bg-green-600 hover:bg-green-500 text-white',   icon: 'text-green-400' },
};

const ANALYZER_FEATURES = [
  { emoji: '🔢', title: 'VIN-декодер',       desc: 'Введи VIN — авто-заповнення марки, моделі, року з NHTSA' },
  { emoji: '📸', title: 'Фото-аналіз AI',    desc: 'Завантаж фото — Claude знаходить іржу, вм\'ятини, ознаки кузовного ремонту' },
  { emoji: '🏁', title: 'Аукціони Copart/IAAI', desc: 'Перевіряємо чи авто було страховим тоталом на аукціонах США' },
  { emoji: '📋', title: 'Звіти CarVertical', desc: 'Встав текст звіту — AI врахує його при аналізі ризиків' },
  { emoji: '🔗', title: 'Парсинг посилань',  desc: 'Встав URL з auto.ria або OLX — дані заповняться автоматично' },
  { emoji: '💰', title: 'Ринкова ціна',       desc: 'Live ціни з auto.ria і аналіз чи не завищена ціна продавця' },
];

// ── Sub-components ────────────────────────────────────────────
function ExampleCard({ ex }) {
  const colorMap = {
    red:    { border: 'border-red-800/60',    badge: 'bg-red-950/60 text-red-300 border border-red-800',    bar: '#ef4444', tc: 'text-red-400' },
    orange: { border: 'border-orange-800/60', badge: 'bg-orange-950/60 text-orange-300 border border-orange-800', bar: '#f97316', tc: 'text-orange-400' },
  };
  const c = colorMap[ex.color];
  return (
    <div className={`bg-zinc-900/50 border ${c.border} rounded-2xl p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-white">{ex.model}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>{ex.verdict}</span>
      </div>
      <p className="text-xs text-gray-500 italic">"{ex.story}"</p>
      <div className="space-y-1.5">
        {ex.flags.map((f, i) => <p key={i} className="text-xs text-gray-300">{f}</p>)}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="h-1.5 flex-1 bg-zinc-800 rounded-full">
          <div className="h-1.5 rounded-full" style={{ width: `${ex.score}%`, backgroundColor: c.bar }} />
        </div>
        <span className={`text-xs font-mono font-bold ${c.tc}`}>{ex.score}/100</span>
      </div>
    </div>
  );
}

// ── Mobile bottom nav ─────────────────────────────────────────
function BottomNav({ view, onNavigate }) {
  const tabs = [
    { id: 'landing',   emoji: '🏠', label: 'Головна' },
    { id: 'analyzer',  emoji: '🔍', label: 'Аналіз' },
    { id: 'picker',    emoji: '🎯', label: 'Підбір' },
    { id: 'simulator', emoji: '🔮', label: 'Симулятор' },
    { id: 'market',    emoji: '📊', label: 'Ринок' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-zinc-800/80 bg-[#080808]/95 backdrop-blur-md">
      <div className="flex">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onNavigate(t.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors
              ${view === t.id ? 'text-amber-400' : 'text-zinc-500 active:text-zinc-300'}`}>
            <span className="text-lg leading-none">{t.emoji}</span>
            <span className="text-[10px] font-medium leading-none">{t.label}</span>
          </button>
        ))}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

// ── Tool view header tabs (desktop only) ─────────────────────
function DesktopTabBtn({ id, active, onClick, emoji, label }) {
  return (
    <button onClick={() => onClick(id)}
      className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
        ${active
          ? 'bg-amber-500 text-black'
          : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function Page() {
  const [view, setView] = useState('landing');
  const [simulatorPreFill, setSimulatorPreFill] = useState(null);

  function handleSimulateFromPicker(car) {
    const yearMatch = String(car.generation ?? '').match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';
    const priceMatch = String(car.priceRange ?? '').match(/\$?([\d\s]+)/);
    const price = priceMatch ? priceMatch[1].replace(/\s/g, '') : '';
    setSimulatorPreFill({ make: car.make ?? '', model: car.model ?? '', year, price });
    setView('simulator');
  }

  // ── Tool views ───────────────────────────────────────────────
  if (view !== 'landing') {
    const TOOL_CONFIGS = {
      analyzer:  { emoji: '🔍', title: HAS_AI ? 'AI Аналізатор' : 'Аналізатор авто',        subtitle: HAS_AI ? 'VIN, фото, аукціони — повний розбір як Instagram-пост' : 'Введи дані — покажемо червоні прапорці та рейтинг довіри' },
      picker:    { emoji: '🎯', title: HAS_AI ? 'AI Підбір авто' : 'Підбір авто',             subtitle: HAS_AI ? 'Бюджет, мета, пріоритети — AI підбирає 3 найкращих варіанти' : 'Дай відповідь на питання — підберемо варіанти для UA ринку' },
      simulator: { emoji: '🔮', title: 'Симулятор Життя Авто',                                subtitle: 'AI прорахує 5 років: поломки, ТО, витрати і зміна стану' },
      market:    { emoji: '📊', title: 'Ринок авто в Україні',                                subtitle: 'Live ціни auto.ria, новини та AI-аналіз для популярних моделей' },
    };
    const cfg = TOOL_CONFIGS[view];

    return (
      <div className="min-h-screen bg-[#080808]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#080808]/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button onClick={() => setView('landing')}
              className="flex items-center gap-2 text-amber-400 font-black text-base tracking-tight flex-shrink-0">
              🚗 <span className="hidden sm:inline">FreeCar<span className="text-white">Top</span></span>
            </button>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              <DesktopTabBtn id="analyzer"  active={view==='analyzer'}  onClick={setView} emoji="🔍" label="Аналізатор" />
              <DesktopTabBtn id="picker"    active={view==='picker'}    onClick={setView} emoji="🎯" label="Підбір" />
              <DesktopTabBtn id="simulator" active={view==='simulator'} onClick={setView} emoji="🔮" label="Симулятор" />
              <DesktopTabBtn id="market"    active={view==='market'}    onClick={setView} emoji="📊" label="Ринок" />
            </div>
            {HAS_AI && (
              <span className="hidden sm:block flex-shrink-0 text-xs bg-amber-900/50 border border-amber-700 text-amber-400 px-2 py-1 rounded-full font-semibold whitespace-nowrap">
                ✨ Claude AI
              </span>
            )}
          </div>
        </header>

        {/* Page title — visible on mobile (no desktop tabs shown) */}
        <div className="md:hidden border-b border-zinc-800/40 px-4 py-3 bg-zinc-900/30">
          <p className="text-xs text-zinc-500">{cfg.emoji} {cfg.title}</p>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
          {/* Desktop title */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-black text-white">{cfg.emoji} {cfg.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{cfg.subtitle}</p>
          </div>

          {view === 'analyzer'  && (HAS_AI ? <AIAnalyzer /> : <CarAnalyzer />)}
          {view === 'picker'    && (HAS_AI
            ? <AICarPicker onSimulateClick={handleSimulateFromPicker} />
            : <CarPicker />)}
          {view === 'simulator' && (
            <CarSimulator
              preFill={simulatorPreFill}
              onPreFillUsed={() => setSimulatorPreFill(null)}
            />
          )}
          {view === 'market'    && <MarketDashboard />}
        </main>

        <BottomNav view={view} onNavigate={setView} />
      </div>
    );
  }

  // ── LANDING ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <header className="border-b border-zinc-800/60 sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-black text-lg tracking-tight">
            🚗 <span>FreeCar<span className="text-amber-400">Top</span></span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('analyzer')}
              className="px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-all">
              🔍 Аналіз
            </button>
            <button onClick={() => setView('picker')}
              className="px-3 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all">
              🎯 Підібрати
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-950/40 border border-amber-800/50 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
          🇺🇦 Для покупців авто в Україні
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-4">
          Купуй авто<br />
          <span className="text-amber-400">без обману</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Перевір оголошення через VIN, фото і аукціони. Підбери авто по бюджету і потребах.
          Симулюй 5 років витрат. Дивись live-ціни з auto.ria.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => setView('analyzer')}
            className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-xl transition-all">
            🔍 Перевірити оголошення
          </button>
          <button onClick={() => setView('picker')}
            className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-bold text-base rounded-xl transition-all">
            🎯 Підібрати авто
          </button>
        </div>
      </section>

      {/* 4 Tool Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map(tool => {
            const a = ACCENT[tool.accent];
            return (
              <button key={tool.id} onClick={() => setView(tool.id)}
                className={`text-left p-5 rounded-2xl border ${a.border} ${a.bg} hover:brightness-110 transition-all group`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{tool.emoji}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${a.icon} opacity-60 group-hover:opacity-100 transition-opacity`}>
                    Відкрити →
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mb-0.5">{tool.title}</h3>
                <p className="text-xs text-zinc-500 mb-3 font-medium">{tool.subtitle}</p>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{tool.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map(tag => (
                    <span key={tag} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${a.tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Analyzer deep-dive */}
      <section className="border-t border-zinc-800/60 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-2">🔍 Аналізатор</p>
            <h2 className="text-2xl sm:text-3xl font-black mb-2">6 перевірок в одному запиті</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              Замість окремих сервісів — одне поле, один AI-розбір з рейтингом довіри 0–100
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ANALYZER_FEATURES.map(f => (
              <div key={f.title} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex gap-3">
                <span className="text-2xl flex-shrink-0">{f.emoji}</span>
                <div>
                  <h4 className="font-bold text-white text-sm mb-0.5">{f.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <button onClick={() => setView('analyzer')}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-all">
              Спробувати аналізатор →
            </button>
          </div>
        </div>
      </section>

      {/* Simulator + Picker promo */}
      <section className="border-t border-zinc-800/60 py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simulator */}
          <div className="bg-purple-950/20 border border-purple-700/40 rounded-2xl p-6">
            <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-3">🔮 Симулятор</p>
            <h3 className="text-xl font-black text-white mb-2">Що буде з авто за 5 років?</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              AI генерує реалістичні події — поломки, ТО, сюрпризи — враховуючи слабкі місця конкретної моделі, країну ввезення і тип коробки.
            </p>
            <div className="space-y-2 mb-5">
              {['Поломки специфічні для ЦІЄЇ моделі', 'Порівняй 2 авто поруч', 'Вставь посилання з auto.ria / OLX'].map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-purple-400">✓</span> {t}
                </div>
              ))}
            </div>
            <button onClick={() => setView('simulator')}
              className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all">
              Симулювати авто →
            </button>
          </div>

          {/* Picker */}
          <div className="bg-blue-950/20 border border-blue-700/40 rounded-2xl p-6">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-3">🎯 Підбір</p>
            <h3 className="text-xl font-black text-white mb-2">Гнучкий підбір по потребах</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Не 5 жорстких питань, а гнучкий конфігуратор: слайдер бюджету, мульти-вибір мети, пріоритети, "схоже на Toyota RAV4 але дешевше".
            </p>
            <div className="space-y-2 mb-5">
              {['Бюджет-слайдер $2k–60k+', 'Мета + кузов: мульти-вибір', 'Фільтр коробки і країни ввезення'].map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-blue-400">✓</span> {t}
                </div>
              ))}
            </div>
            <button onClick={() => setView('picker')}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all">
              Підібрати авто →
            </button>
          </div>
        </div>
      </section>

      {/* Real examples */}
      <section className="border-t border-zinc-800/60 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Реальні кейси</h2>
            <p className="text-gray-500 text-sm">Такий розбір AI робить за ~10 секунд</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {EXAMPLES.map((ex, i) => <ExampleCard key={i} ex={ex} />)}
          </div>
          <div className="mt-6 text-center">
            <button onClick={() => setView('analyzer')}
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors underline underline-offset-4">
              Перевірити власне оголошення →
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-zinc-800/60 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { n: '6',   l: 'перевірок авто' },
              { n: 'VIN', l: 'автодекодер NHTSA' },
              { n: 'Live', l: 'ціни auto.ria' },
              { n: '🆓',  l: 'без реєстрації' },
            ].map(s => (
              <div key={s.l} className="bg-zinc-900/40 rounded-xl py-4 px-2">
                <div className="text-2xl font-black font-mono text-amber-400">{s.n}</div>
                <div className="text-xs text-gray-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-800/60 py-14 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Готовий купувати без ризику?</h2>
          <p className="text-gray-500 text-sm mb-6">Безкоштовно. Без реєстрації.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setView(t.id)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 transition-all text-center">
                <span className="text-xl">{t.emoji}</span>
                <span className="text-xs text-zinc-300 font-semibold leading-tight">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 pb-24 md:pb-6 text-center text-xs text-gray-600">
        <p>FreeCar Top — для тих, хто не хоче купити чужі проблеми 🚗</p>
        <p className="mt-1">Дані для ознайомлення. Завжди перевіряй авто у сертифікованого механіка.</p>
        <p className="mt-2">
          Зроблено{' '}
          <a href="https://github.com/romkravets" target="_blank" rel="noopener noreferrer"
            className="text-zinc-500 hover:text-amber-400 transition-colors underline underline-offset-2">
            @romkravets
          </a>
        </p>
      </footer>

      <BottomNav view={view} onNavigate={setView} />
    </div>
  );
}
