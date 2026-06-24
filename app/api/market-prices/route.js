import { NextResponse } from 'next/server';
import { getMarketPrice, getWeaknesses } from '../../../lib/carMarket.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Cache ─────────────────────────────────────────────────────
const priceCache    = new Map();
const PRICE_TTL     = 6 * 60 * 60 * 1000; // 6h
const PRICE_MAX     = 400;

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

// ── Auto.ria live scrape ─────────────────────────────────────
async function fetchAutoRiaPrices(make, model, year) {
  try {
    const q    = encodeURIComponent(`${make} ${model}`);
    const yrQ  = year ? `&year%5B0%5D.gte=${year}&year%5B0%5D.lte=${year}` : '';
    const url  = `https://auto.ria.com/uk/search/?q=${q}${yrQ}&price.currency=1&abroad.not=0&custom.not=1&countpage=20`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':      UA,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9',
        'Cache-Control':   'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Try __NEXT_DATA__ first
    const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (nd) {
      const d = JSON.parse(nd);
      const pp = d?.props?.pageProps;
      // auto.ria search result shape varies — try several known paths
      const listings =
        pp?.searchResult?.results   ??
        pp?.results                 ??
        pp?.autos                   ??
        [];

      const prices = listings
        .map(r => r.USD ?? r.price?.USD ?? r.priceUSD ?? 0)
        .filter(p => p > 500 && p < 300000)
        .map(Number);

      if (prices.length >= 3) return computeStats(prices);
    }

    // Regex fallback: extract raw "USD":NNNNN patterns
    const usdMatches = [...html.matchAll(/"USD"\s*:\s*"?(\d{4,6})"?/g)]
      .map(m => parseInt(m[1]))
      .filter(p => p > 500 && p < 300000);

    if (usdMatches.length >= 3) return computeStats(usdMatches);

    return null;
  } catch {
    return null;
  }
}

// ── Also try auto.ria model page for price range ─────────────
async function fetchAutoRiaModelPage(make, model) {
  try {
    const makeSlug  = make.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = model.toLowerCase().replace(/[\s_]+/g, '-');
    const url = `https://auto.ria.com/uk/${makeSlug}/${modelSlug}/`;

    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'uk-UA' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (!nd) return null;
    const d = JSON.parse(nd);

    // model page may have priceFrom / priceTo / avgPrice
    const pp  = d?.props?.pageProps;
    const avg = pp?.avgPrice ?? pp?.averagePrice ?? pp?.stats?.avgPrice;
    if (avg && avg > 500) return { avg: Math.round(avg), source: 'auto.ria.model' };

    return null;
  } catch {
    return null;
  }
}

function computeStats(prices) {
  prices.sort((a, b) => a - b);
  // Trim top/bottom 10% as outliers
  const lo = Math.floor(prices.length * 0.10);
  const hi = Math.ceil(prices.length * 0.90);
  const trimmed = prices.slice(lo, hi);
  if (!trimmed.length) return null;
  const avg = Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length);
  return {
    avg,
    min:   prices[0],
    max:   prices[prices.length - 1],
    count: prices.length,
    source: 'auto.ria.live',
  };
}

// ── Route ─────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const make  = String(searchParams.get('make')  ?? '').slice(0, 50).trim();
  const model = String(searchParams.get('model') ?? '').slice(0, 50).trim();
  const year  = parseInt(searchParams.get('year') ?? '0') || 0;

  if (!make || !model) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const cacheKey = priceCacheKey(make, model, year);
  const cached   = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // Parallel: search page + model page
  const [searchData, modelData] = await Promise.all([
    fetchAutoRiaPrices(make, model, year || null),
    year ? null : fetchAutoRiaModelPage(make, model),
  ]);

  // Pick best live data
  const live = searchData ?? (modelData?.avg ? modelData : null);

  // Static fallback
  const staticData = getMarketPrice(make, model, year || new Date().getFullYear() - 5);
  const weakness   = getWeaknesses(make, model);

  const result = {
    ok:       true,
    make,
    model,
    year:     year || null,
    // Live wins, static is fallback
    avg:      live?.avg      ?? staticData?.avg  ?? null,
    min:      live?.min      ?? null,
    max:      live?.max      ?? null,
    count:    live?.count    ?? null,
    source:   live?.source   ?? (staticData ? 'static' : 'none'),
    staticAvg: staticData?.avg ?? null,
    weakness: weakness
      ? { avgCosts: weakness.avgCosts, strengths: weakness.strengths }
      : null,
    updatedAt: new Date().toISOString(),
    cached: false,
  };

  setToCache(cacheKey, result);
  return NextResponse.json(result);
}
