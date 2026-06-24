import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Normalizers ───────────────────────────────────────────────
function normalizeFuel(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes('дизел') || t.includes('diesel'))          return 'diesel';
  if (t.includes('гібрид') || t.includes('hybrid'))         return 'hybrid';
  if (t.includes('електр') || t.includes('electr'))         return 'electric';
  if (t.includes('бензин') || t.includes('gasol') || t.includes('petrol') || t.includes('газ')) return 'gasoline';
  return null;
}

function normalizeBody(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes('седан') || t.includes('sedan'))                                              return 'sedan';
  if (t.includes('кросовер') || t.includes('suv') || t.includes('позашляховик') || t.includes('jeep')) return 'suv';
  if (t.includes('хетч') || t.includes('hatch') || t.includes('комбі') || t.includes('wagon'))  return 'hatch';
  if (t.includes('мінівен') || t.includes('minivan') || t.includes('мікроавтобус'))              return 'minivan';
  if (t.includes('купе') || t.includes('coupe') || t.includes('кабріолет'))                     return 'coupe';
  return null;
}

function normalizeTrans(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes('варіатор') || t.includes('cvt'))                                             return 'cvt';
  if (t.includes('dsg') || t.includes('робот') || t.includes('dct') || t.includes('amt'))      return 'dsg';
  if (t.includes('автомат') || t.includes('automatic') || t.includes('акпп'))                  return 'auto';
  if (t.includes('механіка') || t.includes('механіч') || t.includes('manual') || t.includes('мкпп')) return 'manual';
  return null;
}

function normalizeCountry(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes('сша') || t.includes('usa') || t.includes('америка'))                         return 'usa';
  if (t.includes('германі') || t.includes('німеч') || t.includes('germany'))                   return 'de';
  if (t.includes('україна') || t.includes('украин'))                                           return 'ua';
  if (t.includes('польщ') || t.includes('чехі') || t.includes('литв') || t.includes('євро'))   return 'eu';
  return null;
}

// ── JSON-LD parser (schema.org Vehicle / Product) ─────────────
function parseJsonLd(html) {
  const out = {};
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, raw] of html.matchAll(re)) {
    try {
      const items = [].concat(JSON.parse(raw));
      for (const item of items) {
        const t = item['@type'];
        if (t === 'Vehicle' || t === 'Car' || t === 'Product') {
          if (item.brand?.name) out.make  = item.brand.name;
          if (item.model)       out.model = item.model;
          if (item.vehicleModelDate) out.year = parseInt(item.vehicleModelDate);
          if (item.mileageFromOdometer?.value) out.mileage = parseInt(item.mileageFromOdometer.value);
          if (item.fuelType)            out.fuel         = normalizeFuel(item.fuelType);
          if (item.bodyType)            out.body         = normalizeBody(item.bodyType);
          if (item.vehicleTransmission) out.transmission = normalizeTrans(item.vehicleTransmission);
        }
        const offer = item.offers || item.offer;
        if (offer && !out.priceRaw) {
          out.priceRaw  = parseFloat(String(offer.price || offer.lowPrice || '0').replace(/[^\d.]/g, ''));
          out.currency  = offer.priceCurrency || 'USD';
        }
      }
    } catch {}
  }
  return out;
}

// ── Auto.ria parser ──────────────────────────────────────────
function parseAutoRia(html, url) {
  const out = {};

  // __NEXT_DATA__
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (nd) {
    try {
      const d    = JSON.parse(nd);
      const pp   = d?.props?.pageProps;
      const auto = pp?.auto || pp?.car || pp?.result?.auto;
      if (auto) {
        out.make         = auto.markName      || auto.brand?.name      || null;
        out.model        = auto.modelName     || auto.model?.name      || null;
        out.year         = parseInt(auto.year || 0) || null;
        out.mileage      = parseInt(auto.race?.value || auto.mileage || 0) || null;
        out.price        = parseInt(auto.USD  || auto.price?.USD || auto.priceUSD || 0) || null;
        out.fuel         = normalizeFuel(auto.fuel?.name);
        out.body         = normalizeBody(auto.bodyStyle?.name);
        out.transmission = normalizeTrans(auto.gearbox?.name);
        out.importCountry = normalizeCountry(auto.country?.name);
      }
    } catch {}
  }

  // Lightweight regex fallbacks
  if (!out.price)   { const m = html.match(/"USD"\s*:\s*"?(\d+)"?/);       if (m) out.price   = parseInt(m[1]); }
  if (!out.mileage) { const m = html.match(/"mileage"\s*:\s*(\d+)/);        if (m) out.mileage = parseInt(m[1]); }
  if (!out.year)    { const m = html.match(/"year"\s*:\s*"?(\d{4})"?/);     if (m) out.year    = parseInt(m[1]); }

  // URL pattern fallback for make/model
  if (!out.make || !out.model) {
    const um = url.match(/auto_([a-z]+)_([a-z0-9_]+?)_\d+\.html/i);
    if (um) {
      if (!out.make)  out.make  = um[1].charAt(0).toUpperCase() + um[1].slice(1);
      if (!out.model) out.model = um[2].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  return out;
}

// ── OLX parser ───────────────────────────────────────────────
function parseOlx(html) {
  const out = {};

  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (nd) {
    try {
      const d  = JSON.parse(nd);
      const ad = d?.props?.pageProps?.ad;
      if (ad) {
        for (const p of (ad.params || [])) {
          const key = p.key || '';
          const val = p.value?.label || p.value?.key || '';
          if (key === 'make' || key === 'brand')  out.make         = val;
          else if (key === 'model')               out.model        = val;
          else if (key === 'year')                out.year         = parseInt(val);
          else if (key === 'mileage')             out.mileage      = parseInt(val);
          else if (key === 'fuel_type')           out.fuel         = normalizeFuel(val);
          else if (key === 'gearbox')             out.transmission = normalizeTrans(val);
          else if (key === 'body_type')           out.body         = normalizeBody(val);
        }
        const price = ad.price?.regularPrice;
        if (price) { out.priceRaw = parseInt(String(price.value).replace(/\D/g, '')); out.currency = price.currencyCode || 'UAH'; }
      }
    } catch {}
  }

  return out;
}

// ── Title parser fallback ─────────────────────────────────────
function parseMakeModelFromTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]{5,120})<\/title>/i);
  if (!titleMatch) return {};
  const title = titleMatch[1];
  const m = title.match(/([A-Za-z]+)\s+([A-Za-z0-9\s]+?)\s+(\d{4})/);
  if (m) return { make: m[1], model: m[2].trim(), year: parseInt(m[3]) };
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]{5,100})"/i)?.[1];
  if (og) {
    const m2 = og.match(/([A-Za-z]+)\s+([A-Za-z0-9]+)\s+(\d{4})/);
    if (m2) return { make: m2[1], model: m2[2], year: parseInt(m2[3]) };
  }
  return {};
}

// ── Route ─────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get('url') ?? '').trim();

  if (!rawUrl.startsWith('http')) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  let hostname;
  try { hostname = new URL(rawUrl).hostname; }
  catch { return NextResponse.json({ error: 'bad_url' }, { status: 400 }); }

  const isAutoRia = hostname.includes('auto.ria.com');
  const isOlx     = hostname.includes('olx.ua');

  if (!isAutoRia && !isOlx) {
    return NextResponse.json({
      error:   'unsupported_site',
      message: 'Підтримуємо auto.ria.com та olx.ua',
    }, { status: 400 });
  }

  let html;
  try {
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent':      UA,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
        'Cache-Control':   'no-cache',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ error: 'page_error', httpStatus: res.status }, { status: 502 });
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: 'fetch_error', message: String(e.message).slice(0, 100) }, { status: 502 });
  }

  // Merge: JSON-LD first, then site-specific (site-specific wins)
  let extracted = { ...parseJsonLd(html) };
  if (isAutoRia) Object.assign(extracted, filterNonNull(parseAutoRia(html, rawUrl)));
  else            Object.assign(extracted, filterNonNull(parseOlx(html)));

  // Title fallback
  if (!extracted.make) Object.assign(extracted, parseMakeModelFromTitle(html));

  // Price: convert UAH → USD rough estimate
  if (!extracted.price && extracted.priceRaw) {
    extracted.price = extracted.currency === 'UAH'
      ? Math.round(extracted.priceRaw / 41)
      : Math.round(extracted.priceRaw);
  }

  const car = {
    make:         extracted.make          || null,
    model:        extracted.model         || null,
    year:         extracted.year          ? String(extracted.year)    : null,
    mileage:      extracted.mileage       ? String(extracted.mileage) : null,
    price:        extracted.price         ? String(extracted.price)   : null,
    fuel:         extracted.fuel          || null,
    body:         extracted.body          || null,
    transmission: extracted.transmission  || null,
    importCountry:extracted.importCountry || null,
  };

  const fieldsFound = Object.values(car).filter(Boolean).length;

  return NextResponse.json({
    ok:    true,
    car,
    found: fieldsFound > 0,
    fieldsFound,
    source: isAutoRia ? 'auto.ria' : 'olx',
  });
}

function filterNonNull(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== 0));
}
