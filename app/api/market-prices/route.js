import { NextResponse } from 'next/server';
import { getMarketPrice, getWeaknesses } from '../../../lib/carMarket.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Cache ─────────────────────────────────────────────────────
const priceCache = new Map();
const PRICE_TTL  = 6 * 60 * 60 * 1000; // 6h
const PRICE_MAX  = 400;

function priceCacheKey(make, model, year) {
  return `${make}|${model}|${year}`.toLowerCase().replace(/\s+/g, '_');
}
function getFromCache(key) {
  const e = priceCache.get(key);
  if (!e || Date.now() > e.expiresAt) { priceCache.delete(key); return null; }
  return e.data;
}
function setToCache(key, data) {
  if (priceCache.size >= PRICE_MAX) priceCache.delete(priceCache.keys().next().value);
  priceCache.set(key, { data, expiresAt: Date.now() + PRICE_TTL });
}

// ── auto.ria brand/model ID map (real IDs from auto.ria API) ──
// Fetched 2026-06 from https://auto.ria.com/api/categories/1/marks/{id}/models/
const ARIA_IDS = {
  toyota:      { markId: 79,  models: { camry: 698, corolla: 702, 'rav4': 715, 'land cruiser prado': 35004, 'land cruiser': 35000, yaris: 720, highlander: 2090, prius: 714 } },
  bmw:         { markId: 9,   models: { '3 series': 3219, '5 series': 2319, x5: 96, x6: 2153, '7 series': 18490, x3: 1866, '1 series': 2161 } },
  honda:       { markId: 28,  models: { civic: 265, accord: 262, 'cr-v': 269, 'hr-v': 271, jazz: 274 } },
  volkswagen:  { markId: 84,  models: { golf: 35449, passat: 39690, tiguan: 2692, touareg: 793, polo: 789, jetta: 785 } },
  skoda:       { markId: 70,  models: { octavia: 652, superb: 3167, kodiaq: 49223, karoq: 51759, fabia: 649 } },
  nissan:      { markId: 55,  models: { leaf: 36565, 'x-trail': 507, qashqai: 2197, juke: 24932, note: 1975, sentra: 2689, rogue: 2228 } },
  audi:        { markId: 6,   models: { a4: 47, a6: 49, q5: 3222, q7: 1943, a3: 46, q3: 35548, a8: 51 } },
  hyundai:     { markId: 29,  models: { elantra: 3086, tucson: 1268, sonata: 295, ix35: 3901, i30: 2772, 'santa fe': 293, accent: 1258 } },
  kia:         { markId: 33,  models: { sportage: 327, cerato: 1311, sorento: 326, ceed: 2033, rio: 323, stinger: 51264 } },
  mazda:       { markId: 47,  models: { '3': 1692, '6': 393, 'cx-5': 37381, 'cx-9': 2010, 'cx-30': 60223 } },
  ford:        { markId: 24,  models: { focus: 240, mondeo: 246, kuga: 2874, fusion: 241, explorer: 238, escape: 1183 } },
  renault:     { markId: 62,  models: { logan: 1554, duster: 30503, megane: 586, kadjar: 49115, captur: 44442, laguna: 585 } },
  lexus:       { markId: 38,  models: { rx: 358, es: 1343, nx: 44191, is: 354, gx: 1895 } },
  mitsubishi:  { markId: 52,  models: { outlander: 1485, asx: 30805, 'eclipse cross': 53277 } },
  subaru:      { markId: 75,  models: { forester: 663, outback: 1720, impreza: 664, xv: 38372 } },
  opel:        { markId: 56,  models: { astra: 1508, insignia: 3121, mokka: 42885, zafira: 1524, vectra: 1523 } },
  chevrolet:   { markId: 13,  models: {} },
  mercedes:    { markId: null, models: {} },
};

function lookupAriaIds(make, model) {
  const mk = make.toLowerCase().trim();
  const md = model.toLowerCase().trim();
  const entry = ARIA_IDS[mk];
  if (!entry) return null;
  // Try exact, then partial match
  const modelId = entry.models[md] ?? Object.entries(entry.models).find(([k]) => md.includes(k) || k.includes(md))?.[1];
  if (!entry.markId || !modelId) return { markId: entry.markId, modelId: null };
  return { markId: entry.markId, modelId };
}

// ── Fetch prices from auto.ria with proper brand/model IDs ────
async function fetchByIds(markId, modelId, year) {
  try {
    const yrQ = year ? `&year%5B0%5D.gte=${year}&year%5B0%5D.lte=${year}` : '';
    const url = `https://auto.ria.com/uk/search/?brand.id%5B0%5D=${markId}&model.id%5B0%5D=${modelId}${yrQ}&price.currency=1&abroad.not=0&custom.not=1&countpage=20`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'uk-UA,uk;q=0.9' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try __NEXT_DATA__ first (future-proof)
    const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (nd) {
      try {
        const d = JSON.parse(nd);
        const pp = d?.props?.pageProps;
        const listings = pp?.searchResult?.results ?? pp?.results ?? pp?.autos ?? [];
        const prices = listings.map(r => r.USD ?? r.price?.USD ?? r.priceUSD ?? 0).filter(p => p > 500 && p < 300000).map(Number);
        if (prices.length >= 3) return computeStats(prices, 'auto.ria.live');
      } catch { /* fall through */ }
    }

    // Regex: extract "USD":NNNNN from embedded JSON in listing cards
    const usdMatches = [...html.matchAll(/"USD"\s*:\s*"?(\d{4,6})"?/g)]
      .map(m => parseInt(m[1]))
      .filter(p => p > 500 && p < 300000);

    if (usdMatches.length >= 3) return computeStats(usdMatches, 'auto.ria.live');
    return null;
  } catch {
    return null;
  }
}

// ── Fallback: text search (less accurate — only for unknown models) ──
async function fetchByTextSearch(make, model, year) {
  try {
    const q   = encodeURIComponent(`${make} ${model}`);
    const yrQ = year ? `&year%5B0%5D.gte=${year}&year%5B0%5D.lte=${year}` : '';
    const url = `https://auto.ria.com/uk/search/?q=${q}${yrQ}&price.currency=1&abroad.not=0&custom.not=1&countpage=20`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'uk-UA,uk;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const prices = [...html.matchAll(/"USD"\s*:\s*"?(\d{4,6})"?/g)]
      .map(m => parseInt(m[1]))
      .filter(p => p > 500 && p < 300000);
    if (prices.length >= 3) return computeStats(prices, 'auto.ria.search');
    return null;
  } catch {
    return null;
  }
}

function computeStats(prices, source) {
  prices.sort((a, b) => a - b);
  const lo = Math.floor(prices.length * 0.10);
  const hi = Math.ceil(prices.length * 0.90);
  const trimmed = prices.slice(lo, hi);
  if (!trimmed.length) return null;
  const avg = Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length);
  return { avg, min: prices[0], max: prices[prices.length - 1], count: prices.length, source };
}

// ── Route ─────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const make  = String(searchParams.get('make')  ?? '').slice(0, 50).trim();
  const model = String(searchParams.get('model') ?? '').slice(0, 50).trim();
  const year  = parseInt(searchParams.get('year') ?? '0') || 0;

  if (!make || !model) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

  const cacheKey = priceCacheKey(make, model, year);
  const cached   = getFromCache(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // Try proper IDs first, fall back to text search
  const ids  = lookupAriaIds(make, model);
  let live   = null;

  if (ids?.markId && ids?.modelId) {
    live = await fetchByIds(ids.markId, ids.modelId, year || null);
  }
  if (!live) {
    live = await fetchByTextSearch(make, model, year || null);
  }

  // Static fallback
  const staticData = getMarketPrice(make, model, year || new Date().getFullYear() - 5);
  const weakness   = getWeaknesses(make, model);

  const result = {
    ok: true,
    make, model, year: year || null,
    avg:       live?.avg      ?? staticData?.avg ?? null,
    min:       live?.min      ?? null,
    max:       live?.max      ?? null,
    count:     live?.count    ?? null,
    source:    live?.source   ?? (staticData ? 'static' : 'none'),
    staticAvg: staticData?.avg ?? null,
    weakness:  weakness ? { avgCosts: weakness.avgCosts, strengths: weakness.strengths } : null,
    updatedAt: new Date().toISOString(),
    cached: false,
  };

  setToCache(cacheKey, result);
  return NextResponse.json(result);
}
