import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function nhtsaDecode(vin) {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const r = data.Results?.[0];
    if (!r || !r.Make) return null;
    return {
      make:      r.Make || null,
      model:     r.Model || null,
      year:      r.ModelYear || null,
      bodyClass: r.BodyClass || null,
      fuel:      r.FuelTypePrimary || null,
      engine:    r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : null,
      cylinders: r.EngineCylinders || null,
      driveType: r.DriveType || null,
      plant:     r.PlantCountry || null,
      hasError:  r.ErrorCode !== '0',
    };
  } catch {
    return null;
  }
}

async function copartCheck(vin) {
  try {
    const res = await fetch(
      `https://www.copart.com/public/lots/search-results?free-form-search=${vin}&displayStr=${vin}`,
      {
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(7000),
      }
    );
    const html = await res.text();
    const upper = vin.toUpperCase();
    const hasVin = html.toUpperCase().includes(upper);
    const hasLotData = html.includes('"lotNumber"') || html.includes('lot-number') ||
                       html.includes('lotImages') || html.includes('lotTitle');
    const found = hasVin && hasLotData;
    let lotNumber = null;
    if (found) {
      const m = html.match(/"lotNumber"\s*:\s*"?(\d+)"?/);
      if (m) lotNumber = m[1];
    }
    return { found, lotNumber };
  } catch {
    return { found: null, error: true };
  }
}

async function iaaiCheck(vin) {
  try {
    const res = await fetch(
      `https://www.iaai.com/Search?SearchText=${vin}&TypeString=VIN`,
      {
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(7000),
      }
    );
    const html = await res.text();
    const upper = vin.toUpperCase();
    const found =
      html.toUpperCase().includes(upper) &&
      (html.includes('StockNumber') || html.includes('saleDetails') ||
       html.includes('VehicleSearchResult') || html.includes('stock-number'));
    return { found };
  } catch {
    return { found: null, error: true };
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('vin') ?? '';
  const vin = raw.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);

  if (vin.length !== 17) {
    return NextResponse.json(
      { error: 'invalid_vin', message: 'VIN має бути рівно 17 символів (літери A-Z крім I,O,Q та цифри)' },
      { status: 400 }
    );
  }

  const [nhtsa, copart, iaai] = await Promise.all([
    nhtsaDecode(vin),
    copartCheck(vin),
    iaaiCheck(vin),
  ]);

  return NextResponse.json({
    ok: true,
    vin,
    nhtsa,
    auctions: { copart, iaai },
    links: {
      copart:  `https://www.copart.com/lot-list/?free-form-search=${vin}`,
      iaai:    `https://www.iaai.com/Search?SearchText=${vin}&TypeString=VIN`,
      carfax:  `https://www.carfax.com/vehicle/${vin}`,
      autoRia: `https://auto.ria.com/uk/search/?q=${vin}`,
    },
  });
}
