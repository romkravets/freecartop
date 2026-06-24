'use client';

import { useState, useMemo } from 'react';
import {
  MARKET_PRICES, MARKET_NEWS, POPULAR_MODELS,
  getMarketPrice, getWeaknesses, resolveMarketKey,
} from '../lib/carMarket';

function fmt(n)  { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }

const CURRENT_YEAR = new Date().getFullYear();

// ── Price trend bar ──────────────────────────────────────────
function TrendBar({ table }) {
  if (!table) return null;
  const entries = Object.entries(table).map(([y, p]) => [Number(y), p]).sort((a, b) => a[0] - b[0]);
  const max     = Math.max(...entries.map(e => e[1]));
  const min     = Math.min(...entries.map(e => e[1]));
  return (
    <div className="flex items-end gap-0.5 h-10">
      {entries.map(([year, price]) => {
        const h = Math.round(((price - min) / (max - min || 1)) * 100);
        return (
          <div key={year} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-t-sm bg-amber-500/60 group-hover:bg-amber-400 transition-colors min-h-[2px]"
              style={{ height: `${Math.max(8, h)}%` }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {year}: {fmtD(price)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Model card in popular grid ────────────────────────────────
function ModelCard({ item, onSelect, isSelected }) {
  const table  = MARKET_PRICES[item.key];
  const years  = table ? Object.keys(table).map(Number).sort((a, b) => a - b) : [];
  const newest = years[years.length - 1];
  const oldest = years[0];
  const hasWarning = item.badge?.startsWith('⚠️');

  return (
    <button
      onClick={() => onSelect(item)}
      className={`text-left rounded-xl border p-3 transition-all hover:border-amber-500/60 ${isSelected ? 'border-amber-500 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/60'}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div>
          <div className="text-xs text-zinc-500">{item.emoji} {item.make}</div>
          <div className="text-sm font-bold text-white leading-tight">{item.model}</div>
        </div>
        {item.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${hasWarning ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
            {item.badge}
          </span>
        )}
      </div>
      {table && (
        <>
          <TrendBar table={table} />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>{oldest}р: {fmtD(table[oldest])}</span>
            <span>{newest}р: {fmtD(table[newest])}</span>
          </div>
        </>
      )}
    </button>
  );
}

// ── News card ────────────────────────────────────────────────
function NewsCard({ item }) {
  const colors = {
    positive: 'border-green-800/50 bg-green-950/20',
    negative: 'border-red-800/50 bg-red-950/20',
    neutral:  'border-zinc-700 bg-zinc-900/60',
  };
  const textColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral:  'text-zinc-400',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[item.impact] ?? colors.neutral}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-bold tracking-wide ${textColors[item.impact] ?? textColors.neutral}`}>
              {item.category}
            </span>
            <span className="text-[10px] text-zinc-600">{item.date}</span>
          </div>
          <div className="text-sm font-bold text-white leading-tight mb-1">{item.title}</div>
          <div className="text-xs text-zinc-400 leading-relaxed">{item.summary}</div>
        </div>
      </div>
    </div>
  );
}

// ── Price table for selected model ───────────────────────────
function PriceTable({ item }) {
  const table    = MARKET_PRICES[item.key];
  const weakness = getWeaknesses(item.make, item.model);
  if (!table) return <div className="text-zinc-500 text-sm">Дані для цієї моделі відсутні</div>;

  const entries = Object.entries(table).map(([y, p]) => [Number(y), p]).sort((a, b) => a[0] - b[0]);
  const maxP    = Math.max(...entries.map(e => e[1]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{item.emoji}</span>
        <div>
          <h3 className="font-bold text-white">{item.make} {item.model}</h3>
          <p className="text-xs text-zinc-500">Середні ціни UA ринку, USD (AUTO.RIA/OLX)</p>
        </div>
        {item.badge && (
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-bold ${item.badge.startsWith('⚠️') ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
            {item.badge}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {entries.map(([year, price]) => {
          const barW = Math.round((price / maxP) * 100);
          const age  = CURRENT_YEAR - year;
          return (
            <div key={year} className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400 w-10 flex-shrink-0 font-mono">{year}</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full bg-amber-500/70 rounded flex items-center pl-2 text-[10px] font-mono text-black font-bold"
                  style={{ width: `${barW}%`, minWidth: 40 }}
                >
                  {fmtD(price)}
                </div>
              </div>
              <span className="text-zinc-600 text-xs w-14 flex-shrink-0">{age}р старе</span>
            </div>
          );
        })}
      </div>

      {weakness && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-500">⚙️ Що знати перед покупкою</div>
          <div className="space-y-1">
            {weakness.issues.map((issue, i) => (
              <div key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-red-400 flex-shrink-0">•</span>
                <span>{issue}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-green-400 pt-1">✓ {weakness.strengths}</div>
          <div className="flex gap-4 text-xs text-zinc-500 pt-1">
            <span>1р: ~{fmtD(weakness.avgCosts.y1)}/рік</span>
            <span>3р: ~{fmtD(weakness.avgCosts.y3)}/рік</span>
            <span>5р: ~{fmtD(weakness.avgCosts.y5)}/рік</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Insights panel ────────────────────────────────────────
function AIInsights({ make, model, year, price }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error,   setError]   = useState(null);

  async function fetchInsight() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/market-insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ make, model, year, price }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'ai_error');
      setInsight(data.insight);
    } catch (e) {
      setError(e.message === 'no_key' ? 'AI недоступний (немає ключа)' : 'Помилка AI-аналізу');
    } finally {
      setLoading(false);
    }
  }

  const recColors = { recommend: 'text-green-400', caution: 'text-amber-400', avoid: 'text-red-400' };
  const riskColors = { low: 'text-green-400', medium: 'text-amber-400', high: 'text-red-400' };

  return (
    <div className="border border-indigo-800/40 bg-indigo-950/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-400">
          🤖 AI-аналіз ринку
        </div>
        {!insight && (
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Аналізую…' : 'Отримати аналіз'}
          </button>
        )}
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      {loading && (
        <div className="space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="h-3 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {insight && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900 rounded-lg p-2.5">
              <div className="text-zinc-500 mb-0.5">Рекомендація</div>
              <div className={`font-bold ${recColors[insight.buyRecommendation] ?? 'text-white'}`}>
                {insight.buyRecommendation === 'recommend' ? '✅ Купувати' :
                 insight.buyRecommendation === 'caution'   ? '⚠️ Обережно' : '❌ Уникати'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2.5">
              <div className="text-zinc-500 mb-0.5">Ризик ремонтів</div>
              <div className={`font-bold ${riskColors[insight.repairRisk] ?? 'text-white'}`}>
                {insight.repairRisk === 'low' ? '🟢 Низький' :
                 insight.repairRisk === 'medium' ? '🟡 Середній' : '🔴 Високий'}
              </div>
            </div>
            {insight.monthlyOwnershipCost && (
              <div className="bg-zinc-900 rounded-lg p-2.5 col-span-2">
                <div className="text-zinc-500 mb-0.5">Утримання на місяць</div>
                <div className="font-bold font-mono text-white">{fmtD(insight.monthlyOwnershipCost)}/міс</div>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: '💰 Ціна', text: insight.priceAssessment },
              { label: '📈 Тренд', text: insight.trendForecast },
              { label: '🎯 Причина', text: insight.buyReason },
              { label: '⚠️ Ризик', text: insight.topRisk },
              { label: '📅 Кращий рік', text: insight.bestYear },
              { label: '🇺🇦 UA специфіка', text: insight.uaSpecificNote },
            ].map(({ label, text }) => text && (
              <div key={label} className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0 w-24">{label}</span>
                <span className="text-zinc-300 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setInsight(null); fetchInsight(); }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            🔄 Оновити аналіз
          </button>
        </div>
      )}

      {!insight && !loading && (
        <p className="text-xs text-zinc-600 italic">
          Аналіз порівняє ціну з ринком, визначить тренд і головні ризики для UA.
        </p>
      )}
    </div>
  );
}

// ── Quick price lookup ───────────────────────────────────────
function PriceLookup() {
  const [makeInput,  setMakeInput]  = useState('');
  const [modelInput, setModelInput] = useState('');
  const [yearInput,  setYearInput]  = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [searched,   setSearched]   = useState(false);

  const marketResult = useMemo(() => {
    if (!makeInput || !modelInput || !yearInput || !searched) return null;
    return getMarketPrice(makeInput, modelInput, yearInput);
  }, [makeInput, modelInput, yearInput, searched]);

  const weakness = useMemo(() => {
    if (!makeInput || !modelInput || !searched) return null;
    return getWeaknesses(makeInput, modelInput);
  }, [makeInput, modelInput, searched]);

  const userPrice = parseInt(priceInput) || 0;
  const marketAvg = marketResult?.avg ?? 0;
  const diff      = userPrice && marketAvg ? Math.round(((userPrice - marketAvg) / marketAvg) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-500">🔍 Перевірити ціну авто</div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { label: 'Марка', value: makeInput, onChange: setMakeInput, placeholder: 'Toyota' },
          { label: 'Модель', value: modelInput, onChange: setModelInput, placeholder: 'Camry' },
          { label: 'Рік', value: yearInput, onChange: setYearInput, placeholder: '2017', type: 'number' },
          { label: 'Ваша ціна ($)', value: priceInput, onChange: setPriceInput, placeholder: '14000', type: 'number' },
        ].map(({ label, value, onChange, placeholder, type }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide">{label}</label>
            <input
              type={type ?? 'text'}
              value={value}
              onChange={e => { onChange(e.target.value); setSearched(false); }}
              placeholder={placeholder}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setSearched(true)}
        disabled={!makeInput || !modelInput || !yearInput}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-40"
      >
        Перевірити ціну
      </button>

      {searched && (
        <div className="space-y-3">
          {marketResult ? (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Середня ринкова ціна {makeInput} {modelInput} {yearInput}р.</div>
                <div className="text-2xl font-black font-mono text-amber-400">{fmtD(marketResult.avg)}</div>
                {diff !== null && (
                  <div className={`text-sm mt-1 font-semibold ${Math.abs(diff) < 5 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {Math.abs(diff) < 5 ? '✅ В ринку' :
                     diff > 15 ? `🔴 Дорого! На ${diff}% вище ринку` :
                     diff > 5  ? `⚠️ Трохи дорого (+${diff}%)` :
                     diff < -20 ? `⚠️ Підозріло дешево (${diff}%) — перевіряй` :
                     `✅ Нижче ринку на ${Math.abs(diff)}%`}
                  </div>
                )}
              </div>

              {weakness && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                  <div className="text-xs font-bold text-amber-500 mb-2">⚙️ Типові витрати на ремонти</div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    <span>1р: ~{fmtD(weakness.avgCosts.y1)}</span>
                    <span>3р: ~{fmtD(weakness.avgCosts.y3)}</span>
                    <span>5р: ~{fmtD(weakness.avgCosts.y5)}</span>
                  </div>
                </div>
              )}

              <AIInsights
                make={makeInput} model={modelInput}
                year={parseInt(yearInput)} price={parseInt(priceInput)}
              />
            </>
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center text-sm text-zinc-500">
              Дані для "{makeInput} {modelInput}" у базі відсутні.<br />
              <span className="text-xs text-zinc-600 mt-1 block">Спробуй: Toyota Camry, BMW 5 Series, Skoda Octavia…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function MarketDashboard() {
  const [selectedModel, setSelectedModel] = useState(POPULAR_MODELS[0]);
  const [activeTab,     setActiveTab]     = useState('prices'); // 'prices' | 'news' | 'lookup'

  const relevantNews = useMemo(() => {
    if (!selectedModel) return MARKET_NEWS;
    const key     = selectedModel.key;
    const related = MARKET_NEWS.filter(n => n.keys.includes(key));
    const other   = MARKET_NEWS.filter(n => !n.keys.includes(key));
    return [...related, ...other];
  }, [selectedModel]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
        {[
          { id: 'prices', label: '📊 Ціни по моделях' },
          { id: 'news',   label: '📰 Новини ринку' },
          { id: 'lookup', label: '🔍 Перевірити ціну' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Prices tab */}
      {activeTab === 'prices' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {POPULAR_MODELS.map(item => (
              <ModelCard
                key={item.key}
                item={item}
                onSelect={setSelectedModel}
                isSelected={selectedModel?.key === item.key}
              />
            ))}
          </div>

          {selectedModel && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <PriceTable item={selectedModel} />
            </div>
          )}
        </div>
      )}

      {/* News tab */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-600 italic px-1">
            Аналіз UA автомобільного ринку · Оновлено червень 2025
          </div>
          {relevantNews.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}

      {/* Lookup tab */}
      {activeTab === 'lookup' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <PriceLookup />
        </div>
      )}
    </div>
  );
}
