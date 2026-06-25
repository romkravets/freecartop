'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { MARKET_PRICES, MARKET_NEWS, POPULAR_MODELS, getWeaknesses } from '../lib/carMarket';

function fmt(n)  { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }
const CY = new Date().getFullYear();

// ── Static trend bars (historical prices) ─────────────────────
function TrendBar({ table }) {
  if (!table) return null;
  const entries = Object.entries(table).map(([y, p]) => [Number(y), p]).sort((a, b) => a[0] - b[0]);
  const max = Math.max(...entries.map(e => e[1]));
  const min = Math.min(...entries.map(e => e[1]));
  return (
    <div className="flex items-end gap-0.5 h-10">
      {entries.map(([year, price]) => {
        const h = Math.round(((price - min) / (max - min || 1)) * 100);
        return (
          <div key={year} className="flex-1 flex flex-col items-center group relative">
            <div className="w-full rounded-t-sm bg-amber-500/60 group-hover:bg-amber-400 transition-colors min-h-[2px]"
              style={{ height: `${Math.max(8, h)}%` }} />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {year}: {fmtD(price)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Model card ────────────────────────────────────────────────
function ModelCard({ item, onSelect, isSelected }) {
  const table  = MARKET_PRICES[item.key];
  const years  = table ? Object.keys(table).map(Number).sort((a, b) => a - b) : [];
  return (
    <button onClick={() => onSelect(item)}
      className={`text-left rounded-xl border p-3 transition-all hover:border-amber-500/60
        ${isSelected ? 'border-amber-500 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/60'}`}>
      <div className="flex items-start justify-between gap-1 mb-2">
        <div>
          <div className="text-xs text-zinc-500">{item.emoji} {item.make}</div>
          <div className="text-sm font-bold text-white leading-tight">{item.model}</div>
        </div>
        {item.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${item.badge.startsWith('⚠️') ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
            {item.badge}
          </span>
        )}
      </div>
      {table && (
        <>
          <TrendBar table={table} />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>{years[0]}р: {fmtD(table[years[0]])}</span>
            <span>{years[years.length - 1]}р: {fmtD(table[years[years.length - 1]])}</span>
          </div>
        </>
      )}
    </button>
  );
}

// ── Live price badge ──────────────────────────────────────────
function LivePriceBadge({ make, model }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setFailed(false); setLoading(true);
    const params = new URLSearchParams({ make, model, year: String(CY - 2) });
    fetch(`/api/market-prices?${params}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.ok && d.avg) setData(d); else if (!cancelled) setFailed(true); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [make, model]);

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
      <Loader2 size={12} className="animate-spin" /> Завантажую live-ціни з auto.ria…
    </div>
  );
  if (failed || !data) return null;

  const isLive = data.source?.includes('live');
  return (
    <div className={`rounded-xl border p-3 ${isLive ? 'border-green-800/50 bg-green-950/20' : 'border-zinc-700 bg-zinc-900/40'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-white">Зараз на ринку ({CY - 2}р)</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isLive ? 'bg-green-950 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
          {isLive ? '🟢 Live auto.ria' : '📦 Статична база'}
        </span>
      </div>
      <div className="text-xl font-black font-mono text-amber-400">{fmtD(data.avg)}</div>
      {isLive && data.count && (
        <div className="text-xs text-zinc-500 mt-0.5">
          {data.count} оголошень · {data.min && data.max ? `${fmtD(data.min)}–${fmtD(data.max)}` : ''}
        </div>
      )}
    </div>
  );
}

// ── Price detail panel ────────────────────────────────────────
function PriceDetail({ item }) {
  const table    = MARKET_PRICES[item.key];
  const weakness = getWeaknesses(item.make, item.model);

  const entries = table
    ? Object.entries(table).map(([y, p]) => [Number(y), p]).sort((a, b) => a[0] - b[0])
    : [];
  const maxP = entries.length ? Math.max(...entries.map(e => e[1])) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl">{item.emoji}</span>
        <div>
          <h3 className="font-bold text-white">{item.make} {item.model}</h3>
          <p className="text-xs text-zinc-500">Середні ціни UA ринку, USD</p>
        </div>
        {item.badge && (
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-bold ${item.badge.startsWith('⚠️') ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
            {item.badge}
          </span>
        )}
      </div>

      {/* Live price block */}
      <LivePriceBadge make={item.make} model={item.model} />

      {/* Static historical */}
      {entries.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">📦 Історична база по роках</p>
          <div className="space-y-1.5">
            {entries.map(([year, price]) => {
              const barW = Math.round((price / maxP) * 100);
              return (
                <div key={year} className="flex items-center gap-3 text-sm">
                  <span className="text-zinc-400 w-10 flex-shrink-0 font-mono text-xs">{year}</span>
                  <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded flex items-center pl-2 text-[10px] font-mono text-black font-bold"
                      style={{ width: `${barW}%`, minWidth: 44 }}>
                      {fmtD(price)}
                    </div>
                  </div>
                  <span className="text-zinc-600 text-xs w-14 flex-shrink-0">{CY - year}р старе</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weaknesses */}
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
          <div className="flex gap-4 text-xs text-zinc-500 pt-1 flex-wrap">
            <span>1р: ~{fmtD(weakness.avgCosts.y1)}/рік</span>
            <span>3р: ~{fmtD(weakness.avgCosts.y3)}/рік</span>
            <span>5р: ~{fmtD(weakness.avgCosts.y5)}/рік</span>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <AIInsights make={item.make} model={item.model} year={CY - 3} price={table ? table[Object.keys(table).sort().pop()] : 0} />
    </div>
  );
}

// ── AI Insights ────────────────────────────────────────────────
function AIInsights({ make, model, year, price }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error,   setError]   = useState(null);

  async function fetchInsight() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/market-insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ make, model, year, price }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'ai_error');
      setInsight(data.insight);
    } catch (e) {
      setError(e.message === 'no_key' ? 'AI недоступний' : 'Помилка AI-аналізу');
    } finally {
      setLoading(false);
    }
  }

  const recC  = { recommend: 'text-green-400', caution: 'text-amber-400', avoid: 'text-red-400' };
  const riskC = { low: 'text-green-400', medium: 'text-amber-400', high: 'text-red-400' };

  return (
    <div className="border border-indigo-800/40 bg-indigo-950/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-400">🤖 AI-аналіз ринку</div>
        {!insight && (
          <button onClick={fetchInsight} disabled={loading}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <><Loader2 size={11} className="animate-spin" /> Аналізую…</> : 'Отримати аналіз'}
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
              <div className={`font-bold ${recC[insight.buyRecommendation] ?? 'text-white'}`}>
                {insight.buyRecommendation === 'recommend' ? '✅ Купувати' : insight.buyRecommendation === 'caution' ? '⚠️ Обережно' : '❌ Уникати'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2.5">
              <div className="text-zinc-500 mb-0.5">Ризик ремонтів</div>
              <div className={`font-bold ${riskC[insight.repairRisk] ?? 'text-white'}`}>
                {insight.repairRisk === 'low' ? '🟢 Низький' : insight.repairRisk === 'medium' ? '🟡 Середній' : '🔴 Високий'}
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
              { label: '💰 Ціна',      text: insight.priceAssessment },
              { label: '📈 Тренд',     text: insight.trendForecast },
              { label: '🎯 Причина',   text: insight.buyReason },
              { label: '⚠️ Ризик',    text: insight.topRisk },
              { label: '📅 Рік',       text: insight.bestYear },
              { label: '🇺🇦 UA',       text: insight.uaSpecificNote },
            ].filter(r => r.text).map(({ label, text }) => (
              <div key={label} className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0 w-20">{label}</span>
                <span className="text-zinc-300 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setInsight(null); fetchInsight(); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <RefreshCw size={11} /> Оновити
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

// ── News feed ─────────────────────────────────────────────────
const IMPACT_STYLE = {
  positive: { card: 'border-green-800/50 bg-green-950/20',  label: 'text-green-400' },
  negative: { card: 'border-red-800/50 bg-red-950/20',     label: 'text-red-400'   },
  neutral:  { card: 'border-zinc-700 bg-zinc-900/50',       label: 'text-zinc-400'  },
};

function NewsCard({ item }) {
  const s = IMPACT_STYLE[item.impact] ?? IMPACT_STYLE.neutral;
  return (
    <div className={`border rounded-xl p-4 ${s.card}`}>
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] uppercase font-bold tracking-wide ${s.label}`}>{item.category}</span>
            <span className="text-[10px] text-zinc-600">{item.date}</span>
          </div>
          <div className="text-sm font-bold text-white leading-tight mb-1">{item.title}</div>
          {item.summary && <div className="text-xs text-zinc-400 leading-relaxed">{item.summary}</div>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-amber-400 transition-colors mt-2">
              Читати <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsFeed() {
  const [status,  setStatus]  = useState('idle'); // idle | loading | live | static | error
  const [articles, setArticles] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');

  async function load() {
    setStatus('loading');
    try {
      const res  = await fetch('/api/market-news');
      const data = await res.json();
      if (data.ok && data.articles?.length) {
        setArticles(data.articles);
        setUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '');
        setStatus('live');
      } else {
        setArticles(MARKET_NEWS);
        setStatus('static');
      }
    } catch {
      setArticles(MARKET_NEWS);
      setStatus('static');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      {/* Source badge */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-600 italic">
          {status === 'live'    && <span className="text-green-400 font-semibold">🟢 Live auto.ria{updatedAt ? ` · ${updatedAt}` : ''}</span>}
          {status === 'static'  && <span className="text-zinc-500">📦 Статична база · auto.ria недоступна</span>}
          {status === 'loading' && <span className="text-zinc-500 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Завантажую новини з auto.ria…</span>}
        </div>
        {status !== 'loading' && (
          <button onClick={load}
            className="text-[10px] text-zinc-600 hover:text-amber-400 transition-colors flex items-center gap-1">
            <RefreshCw size={10} /> Оновити
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-zinc-800 rounded-xl p-4 flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status !== 'loading' && articles.map((item, i) => <NewsCard key={i} item={item} />)}
    </div>
  );
}

// ── Price lookup ──────────────────────────────────────────────
function PriceLookup() {
  const [makeInput,  setMakeInput]  = useState('');
  const [modelInput, setModelInput] = useState('');
  const [yearInput,  setYearInput]  = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [err,        setErr]        = useState('');

  const reset = () => { setResult(null); setErr(''); };

  const search = async () => {
    if (!makeInput || !modelInput) return;
    setLoading(true); reset();
    try {
      const p = new URLSearchParams({ make: makeInput, model: modelInput });
      if (yearInput) p.set('year', yearInput);
      const res  = await fetch('/api/market-prices?' + p);
      const data = await res.json();
      if (data.ok) setResult(data);
      else setErr('Дані не знайдені');
    } catch { setErr("Помилка з'єднання"); }
    finally { setLoading(false); }
  };

  const diff    = result?.avg && priceInput ? Math.round(((+priceInput - result.avg) / result.avg) * 100) : null;
  const isLive  = result?.source?.includes('live');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-amber-500">🔍 Перевірити ціну авто</span>
        {result && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isLive ? 'bg-green-950 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
            {isLive ? '🟢 Live auto.ria' : '📦 Статична база'}
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { lbl: 'Марка',         val: makeInput,  set: setMakeInput,  ph: 'Toyota',  tp: 'text'   },
          { lbl: 'Модель',        val: modelInput, set: setModelInput, ph: 'Camry',   tp: 'text'   },
          { lbl: 'Рік (необов.)', val: yearInput,  set: setYearInput,  ph: '2017',    tp: 'number' },
          { lbl: 'Ваша ціна ($)', val: priceInput, set: setPriceInput, ph: '14000',   tp: 'number' },
        ].map(({ lbl, val, set, ph, tp }) => (
          <div key={lbl} className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide">{lbl}</label>
            <input type={tp} value={val}
              onChange={e => { set(e.target.value); reset(); }}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={ph}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
          </div>
        ))}
      </div>

      <button onClick={search} disabled={!makeInput || !modelInput || loading}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Запит до auto.ria…</> : '🔍 Отримати ціну'}
      </button>

      {err && <p className="text-xs text-red-400">{err}</p>}

      {result?.avg && (
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">Середня ціна {makeInput} {modelInput} {yearInput && `${yearInput}р.`}</span>
              {isLive && result.count && <span className="text-[10px] text-zinc-600">{result.count} оголошень</span>}
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">{fmtD(result.avg)}</div>
            {isLive && result.min && result.max && (
              <div className="text-xs text-zinc-500 mt-0.5">Діапазон: {fmtD(result.min)} — {fmtD(result.max)}</div>
            )}
            {diff !== null && (
              <div className={`text-sm mt-2 font-semibold ${Math.abs(diff) < 5 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {Math.abs(diff) < 5  ? '✅ В ринку'
                 : diff > 15         ? `🔴 Дорого! На ${diff}% вище ринку`
                 : diff > 5          ? `⚠️ Трохи дорого (+${diff}%)`
                 : diff < -20        ? `⚠️ Підозріло дешево (${diff}%) — перевіряй`
                 :                     `✅ Нижче ринку на ${Math.abs(diff)}%`}
              </div>
            )}
          </div>

          {result.weakness && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <div className="text-xs font-bold text-amber-500 mb-2">⚙️ Типові витрати на ремонти</div>
              <div className="flex gap-4 text-xs text-zinc-400 flex-wrap">
                <span>1р: ~{fmtD(result.weakness.avgCosts.y1)}</span>
                <span>3р: ~{fmtD(result.weakness.avgCosts.y3)}</span>
                <span>5р: ~{fmtD(result.weakness.avgCosts.y5)}</span>
              </div>
            </div>
          )}

          <AIInsights make={makeInput} model={modelInput} year={parseInt(yearInput)} price={parseInt(priceInput)} />
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function MarketDashboard() {
  const [selectedModel, setSelectedModel] = useState(POPULAR_MODELS[0]);
  const [activeTab,     setActiveTab]     = useState('prices');

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
        {[
          { id: 'prices', label: '📊 Моделі' },
          { id: 'news',   label: '📰 Новини' },
          { id: 'lookup', label: '🔍 Перевірити' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Prices tab */}
      {activeTab === 'prices' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {POPULAR_MODELS.map(item => (
              <ModelCard key={item.key} item={item} onSelect={setSelectedModel} isSelected={selectedModel?.key === item.key} />
            ))}
          </div>
          {selectedModel && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <PriceDetail item={selectedModel} />
            </div>
          )}
        </div>
      )}

      {/* News tab */}
      {activeTab === 'news' && <NewsFeed />}

      {/* Lookup tab */}
      {activeTab === 'lookup' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <PriceLookup />
        </div>
      )}
    </div>
  );
}
