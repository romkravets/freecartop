import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Cache ─────────────────────────────────────────────────────
const newsCache = new Map();
const NEWS_TTL  = 2 * 60 * 60 * 1000; // 2h
const CACHE_KEY = 'market-news';

function getNewsCache() {
  const e = newsCache.get(CACHE_KEY);
  if (!e || Date.now() > e.expiresAt) { newsCache.delete(CACHE_KEY); return null; }
  return e;
}
function setNewsCache(data) {
  newsCache.set(CACHE_KEY, { data, expiresAt: Date.now() + NEWS_TTL });
}

// ── Classification ────────────────────────────────────────────
const CATEGORY_MAP = [
  { kw: ['ціни', 'ціна', 'коштує', 'дорожчає', 'дешевшає', 'курс'],   emoji: '💰', cat: 'Ціни' },
  { kw: ['електро', 'електромобіль', 'ev', 'tesla', 'зарядка'],        emoji: '⚡', cat: 'Електро' },
  { kw: ['закон', 'правило', 'штраф', 'реєстрація', 'техогляд'],       emoji: '📋', cat: 'Закони' },
  { kw: ['розмит', 'митниця', 'мито', 'акциз'],                         emoji: '🚢', cat: 'Розмитнення' },
  { kw: ['продажі', 'ринок', 'попит', 'пропозиція', 'статисти'],       emoji: '📊', cat: 'Ринок' },
  { kw: ['нов', 'запуск', 'вийшов', 'дебют', 'прем'],                  emoji: '🚗', cat: 'Новинки' },
  { kw: ['кредит', 'лізинг', 'фінанс'],                                  emoji: '🏦', cat: 'Фінанси' },
  { kw: ['ремонт', 'запчастин', 'сервіс', 'масло', 'шини'],            emoji: '🔧', cat: 'Сервіс' },
];

function classify(title, text) {
  const s = ((title || '') + ' ' + (text || '')).toLowerCase();
  for (const { kw, emoji, cat } of CATEGORY_MAP) {
    if (kw.some(k => s.includes(k))) return { emoji, cat };
  }
  return { emoji: '🗞️', cat: 'Авто' };
}

function impact(title) {
  const t = (title || '').toLowerCase();
  if (/зростає|дорожчає|підвищення|заборон|обмеж/.test(t)) return 'negative';
  if (/знижує|дешевшає|зниження|знижк|пільга/.test(t))     return 'positive';
  return 'neutral';
}

function fmtDate(raw) {
  if (!raw) return '';
  try { return new Date(raw).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }); }
  catch { return ''; }
}

// ── Parsers ───────────────────────────────────────────────────
// ── auto.ria classic HTML parser ─────────────────────────────
// Structure: div.news-item > a.news-item-title[href] > h2.item (title)
//                          > span.news-item-text (summary)
//                          > div[data-info=unixts] (date)
function fromAutoRiaHtml(html) {
  const items = [];
  // Each news-item block
  const blockRe = /<div class="news-item[^"]*"[^>]*>([\s\S]*?)(?=<div class="news-item|$)/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null && items.length < 15) {
    const block = m[1];
    // Title from h2 itemprop="name" or class="item"
    const titleM = block.match(/itemprop="name">([^<]{5,150})<\/h2>/i)
      ?? block.match(/<h2 class="[^"]*item[^"]*">([^<]{5,150})<\/h2>/i);
    if (!titleM) continue;
    const title = titleM[1].trim();

    // URL from a.news-item-title href
    const urlM  = block.match(/class="news-item-title"[^>]*href="([^"]+)"/i)
      ?? block.match(/href="(https:\/\/auto\.ria\.com\/uk\/news\/[^"]+)"/i);
    const url   = urlM?.[1] ?? '';

    // Summary from span.news-item-text
    const sumM  = block.match(/class="news-item-text">([^<]{10,300})<\/span>/i);
    const summary = (sumM?.[1] ?? '').trim().slice(0, 220);

    // Date from data-info unix timestamp
    const tsM   = block.match(/data-info="(\d+)"/i);
    const date  = tsM ? fmtDate(new Date(parseInt(tsM[1]) * 1000).toISOString()) : '';

    const { emoji, cat } = classify(title, summary);
    items.push({ title, summary, url, date, emoji, category: cat, impact: impact(title) });
  }
  return items.length ? items : null;
}

// ── __NEXT_DATA__ parser (for future migration) ──────────────
function fromNextData(html) {
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!nd) return null;
  let d;
  try { d = JSON.parse(nd); } catch { return null; }
  const pp  = d?.props?.pageProps;
  const raw = pp?.articles ?? pp?.news ?? pp?.items ?? pp?.data?.articles ?? pp?.data?.news ?? [];
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.slice(0, 15).map(a => {
    const title   = (a.title ?? a.name ?? a.headline ?? '').trim();
    const summary = (a.description ?? a.shortText ?? a.preview ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 220);
    const rawUrl  = a.url ?? a.link ?? a.canonical ?? '';
    const url     = rawUrl.startsWith('http') ? rawUrl : 'https://auto.ria.com' + rawUrl;
    const { emoji, cat } = classify(title, summary);
    return { title, summary, url, date: fmtDate(a.publishAt ?? a.published ?? a.date ?? a.createdAt), emoji, category: cat, impact: impact(title) };
  }).filter(a => a.title.length > 5);
}

function fromJsonLd(html) {
  const items = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const obj  = JSON.parse(m[1]);
      const type = obj['@type'] ?? '';
      if (type !== 'NewsArticle' && type !== 'Article') continue;
      const title = (obj.headline ?? obj.name ?? '').trim();
      if (title.length < 6) continue;
      const { emoji, cat } = classify(title, obj.description ?? '');
      items.push({ title, summary: (obj.description ?? '').slice(0, 220), url: obj.url ?? '', date: fmtDate(obj.datePublished), emoji, category: cat, impact: impact(title) });
    } catch { /* skip */ }
    if (items.length >= 15) break;
  }
  return items.length ? items : null;
}

async function scrapeNews() {
  const candidates = ['https://auto.ria.com/uk/news/', 'https://auto.ria.com/news/'];
  for (const url of candidates) {
    try {
      const res  = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'uk-UA,uk;q=0.9' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const html     = await res.text();
      const articles = fromNextData(html) ?? fromAutoRiaHtml(html) ?? fromJsonLd(html);
      if (articles?.length) return { articles, source: 'auto.ria.com' };
    } catch { /* try next */ }
  }
  return null;
}

// ── Route ─────────────────────────────────────────────────────
export async function GET() {
  const hit = getNewsCache();
  if (hit) return NextResponse.json({ ok: true, ...hit.data, cached: true });

  const result = await scrapeNews();
  if (result?.articles?.length) {
    const data = { articles: result.articles, source: result.source, updatedAt: new Date().toISOString() };
    setNewsCache(data);
    return NextResponse.json({ ok: true, ...data, cached: false });
  }

  return NextResponse.json({ ok: false, error: 'scrape_failed', articles: [], source: 'none', cached: false });
}
