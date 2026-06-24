// ============================================================
//  FreeCar Top — Car Life Simulator Math
//  Pure functions, no React dependencies
// ============================================================

export const CURRENT_YEAR = new Date().getFullYear();
export const SIM_YEARS = 5;
export const KM_PER_YEAR = 15000; // avg UA usage

// ── Make catalogue ─────────────────────────────────────────
// dep: annual depreciation rate
// rel: reliability modifier (-3 .. +3)
// origin: display emoji
export const MAKE_DATA = {
  toyota: { dep: 0.08, rel: 2, origin: "🇯🇵", label: "Toyota" },
  honda: { dep: 0.09, rel: 1, origin: "🇯🇵", label: "Honda" },
  mazda: { dep: 0.09, rel: 1, origin: "🇯🇵", label: "Mazda" },
  lexus: { dep: 0.09, rel: 2, origin: "🇯🇵", label: "Lexus" },
  subaru: { dep: 0.1, rel: 0, origin: "🇯🇵", label: "Subaru" },
  mitsubishi: { dep: 0.1, rel: 0, origin: "🇯🇵", label: "Mitsubishi" },
  nissan: { dep: 0.1, rel: 0, origin: "🇯🇵", label: "Nissan" },
  kia: { dep: 0.1, rel: 0, origin: "🇰🇷", label: "Kia" },
  hyundai: { dep: 0.1, rel: 0, origin: "🇰🇷", label: "Hyundai" },
  bmw: { dep: 0.15, rel: -3, origin: "🇩🇪", label: "BMW" },
  mercedes: { dep: 0.15, rel: -2, origin: "🇩🇪", label: "Mercedes" },
  audi: { dep: 0.14, rel: -3, origin: "🇩🇪", label: "Audi" },
  volkswagen: { dep: 0.12, rel: -2, origin: "🇩🇪", label: "Volkswagen" },
  skoda: { dep: 0.11, rel: -1, origin: "🇨🇿", label: "Skoda" },
  ford: { dep: 0.11, rel: -1, origin: "🇺🇸", label: "Ford" },
  chevrolet: { dep: 0.13, rel: -2, origin: "🇺🇸", label: "Chevrolet" },
  jeep: { dep: 0.13, rel: -2, origin: "🇺🇸", label: "Jeep" },
  volvo: { dep: 0.13, rel: -1, origin: "🇸🇪", label: "Volvo" },
  peugeot: { dep: 0.12, rel: -2, origin: "🇫🇷", label: "Peugeot" },
  renault: { dep: 0.12, rel: -2, origin: "🇫🇷", label: "Renault" },
  _default: { dep: 0.12, rel: 0, origin: "🌍", label: "Авто" },
};

export function getMakeData(make) {
  const key = (make ?? "").toLowerCase().trim().replace(/[-\s]/g, "");
  return MAKE_DATA[key] ?? MAKE_DATA._default;
}

// ── Transmission reliability modifier ──────────────────────
export const TRANS_MOD = {
  manual: { rel: 2, label: "Механіка", riskNote: null },
  auto: { rel: 0, label: "АКПП", riskNote: null },
  cvt: {
    rel: -2,
    label: "Варіатор",
    riskNote: "Варіатор коштує $1 000–3 000 при заміні",
  },
  dsg: {
    rel: -3,
    label: "DSG/PDK",
    riskNote: "DSG ненадійна до 200k — плануй бюджет",
  },
};

// ── Import penalties ────────────────────────────────────────
export const IMPORT_MODIFIER = {
  ua: { depExtra: 0, engPenalty: 0, label: "🇺🇦 Україна" },
  eu: { depExtra: 0, engPenalty: 0, label: "🇪🇺 ЄС" },
  de: { depExtra: 0, engPenalty: 0, label: "🇩🇪 Німеччина" },
  usa: { depExtra: 0.03, engPenalty: 8, label: "🇺🇸 США" },
  other: { depExtra: 0.01, engPenalty: 3, label: "🌍 Інша" },
};

// ── Initial health from age + mileage ──────────────────────
export function calcInitialHealth(year, mileage, importCountry, transmission) {
  const age = CURRENT_YEAR - Number(year);
  const km = Number(mileage);
  const imp = IMPORT_MODIFIER[importCountry] ?? IMPORT_MODIFIER.ua;
  const tr = TRANS_MOD[transmission] ?? TRANS_MOD.auto;

  const base = 100 - age * 3 - (km / 10_000) * 1.5;

  const engine = Math.max(15, Math.min(95, Math.round(base - imp.engPenalty)));
  const trans = Math.max(
    15,
    Math.min(95, Math.round(base - imp.engPenalty + tr.rel * 2 + 4)),
  );
  const body = Math.max(
    15,
    Math.min(95, Math.round(base - imp.engPenalty * 0.5 - age * 0.5)),
  );

  return { engine, trans, body };
}

// ── Price after N years from purchase ──────────────────────
export function calcPriceAfterYears(
  buyPrice,
  make,
  importCountry,
  fuel,
  years,
) {
  const makeData = getMakeData(make);
  const imp = IMPORT_MODIFIER[importCountry] ?? IMPORT_MODIFIER.ua;
  let price = Number(buyPrice);

  for (let y = 0; y < years; y++) {
    let rate = makeData.dep + imp.depExtra;
    if (fuel === "diesel") rate += 0.01; // diesel losing popularity
    // Floor effect — older cars depreciate slower
    if (y >= 3) rate = Math.max(0.04, rate - 0.02);
    price = Math.round(price * (1 - rate));
  }
  return Math.max(500, price);
}

// ── Annual price drop (for display) ───────────────────────
export function calcYearPrice(buyPrice, make, importCountry, fuel, yearIndex) {
  return calcPriceAfterYears(buyPrice, make, importCountry, fuel, yearIndex);
}

// ── Annual fixed maintenance costs ─────────────────────────
export function calcFixedCosts(fuel, importCountry) {
  const imp = IMPORT_MODIFIER[importCountry] ?? IMPORT_MODIFIER.ua;
  const isUSA = importCountry === "usa";
  const isElec = fuel === "electric";

  const items = [];
  items.push({
    name: "🛡 Страховка (ОСЦПВ + доп.)",
    amount: isElec ? 220 : 320,
  });
  items.push({ name: "📋 Техогляд", amount: 80 });
  items.push({
    name: isElec ? "⚡ Зарядка (річна)" : "🛢 Заміна масла ×2",
    amount: isElec ? 300 : isUSA ? 240 : 180,
  });
  if (!isElec)
    items.push({ name: "🌀 Повітряний + салонний фільтр", amount: 70 });
  return items;
}

// ── Fallback random events per year ────────────────────────
// Used when no AI key. Realistic for UA 2024-2025 market prices.
export const FALLBACK_EVENTS = [
  // Year 1
  [
    {
      icon: "🔋",
      title: 'Акумулятор "здох" в мороз',
      cost: 160,
      engineDelta: 1,
      transDelta: 0,
      bodyDelta: 0,
    },
    {
      icon: "🛞",
      title: "Прокол — міняємо колесо",
      cost: 55,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 0,
    },
  ],
  // Year 2
  [
    {
      icon: "🛑",
      title: "Гальмівні колодки (передні)",
      cost: 280,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 1,
    },
    {
      icon: "❄️",
      title: "Дозаправка кондиціонера",
      cost: 90,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 0,
    },
  ],
  // Year 3
  [
    {
      icon: "💨",
      title: "Амортизатори передні (пара)",
      cost: 460,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 3,
    },
    {
      icon: "🔥",
      title: "Свічки + дроти",
      cost: 130,
      engineDelta: 4,
      transDelta: 0,
      bodyDelta: 0,
    },
  ],
  // Year 4
  [
    {
      icon: "⛓",
      title: "Ремінь/ланцюг ГРМ + помпа",
      cost: 420,
      engineDelta: 5,
      transDelta: 0,
      bodyDelta: 0,
    },
    {
      icon: "🛞",
      title: "Зимова гума (комплект)",
      cost: 380,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 0,
    },
  ],
  // Year 5
  [
    {
      icon: "🔩",
      title: "Рульові наконечники + тяги",
      cost: 320,
      engineDelta: 0,
      transDelta: 0,
      bodyDelta: 0,
    },
    {
      icon: "⚙️",
      title: "Перша серйозна поломка двигуна",
      cost: 750,
      engineDelta: -4,
      transDelta: 0,
      bodyDelta: 0,
    },
  ],
];

// ── Per-year health degradation ─────────────────────────────
// Base degradation for engine/trans/body per year (without events)
export function yearlyDegradation(
  yearIndex,
  make,
  transmission,
  importCountry,
) {
  const makeData = getMakeData(make);
  const tr = TRANS_MOD[transmission] ?? TRANS_MOD.auto;

  // Engine: better makes degrade slower
  const engDeg = 4 - makeData.rel * 0.5 + (yearIndex >= 3 ? 1 : 0);
  // Trans: DSG/CVT degrade faster
  const transDeg = 3 - tr.rel * 0.5 + (yearIndex >= 4 ? 1 : 0);
  // Body
  const bodyDeg = 2;

  return {
    engine: Math.round(Math.max(1, engDeg)),
    trans: Math.round(Math.max(1, transDeg)),
    body: bodyDeg,
  };
}

// ── Compute full 5-year projection (static, no events) ─────
export function buildProjection(profile) {
  const { make, importCountry, fuel, year, mileage, price, transmission } =
    profile;
  const initHealth = calcInitialHealth(
    year,
    mileage,
    importCountry,
    transmission,
  );
  const fixedCosts = calcFixedCosts(fuel, importCountry);
  const fixedTotal = fixedCosts.reduce((s, c) => s + c.amount, 0);

  const years = [];
  let curEngine = initHealth.engine;
  let curTrans = initHealth.trans;
  let curBody = initHealth.body;
  let totalMaint = 0;

  for (let y = 0; y <= SIM_YEARS; y++) {
    const curPrice = calcYearPrice(price, make, importCountry, fuel, y);
    const yearCosts = y === 0 ? 0 : fixedTotal;
    totalMaint += yearCosts;

    years.push({
      year: y,
      price: curPrice,
      engine: Math.max(5, curEngine),
      trans: Math.max(5, curTrans),
      body: Math.max(5, curBody),
      yearCosts,
      totalMaint,
      events: [], // filled in by AI or fallback
    });

    // Apply degradation for next year
    if (y < SIM_YEARS) {
      const deg = yearlyDegradation(y, make, transmission, importCountry);
      curEngine -= deg.engine;
      curTrans -= deg.trans;
      curBody -= deg.body;
    }
  }

  return { years, initHealth, fixedCosts };
}

// ── 5-year verdict ──────────────────────────────────────────
export function buildVerdict(profile, years) {
  const lastYear = years[years.length - 1];
  const totalSpent = profile.price + lastYear.totalMaint;
  const resaleVal = lastYear.price;
  const realCost = totalSpent - resaleVal;
  const perYear = Math.round(realCost / SIM_YEARS);
  const perMonth = Math.round(realCost / (SIM_YEARS * 12));

  const finalEngine = lastYear.engine;
  const makeData = getMakeData(profile.make);

  let emoji, title, text;

  if (finalEngine >= 70 && perMonth < 250) {
    emoji = "🏆";
    title = "Відмінна покупка";
    text = `${makeData.label} тримає ціну і надійний. За 5 років реальна вартість використання — $${perMonth}/місяць. Менше за оренду авто.`;
  } else if (finalEngine >= 55 && perMonth < 400) {
    emoji = "✅";
    title = "Хороша інвестиція";
    text = `Нормальне авто за свої гроші. $${perMonth}/міс — прийнятно для UA ринку. Слідкуй за двигуном.`;
  } else if (finalEngine >= 40 && perMonth < 600) {
    emoji = "⚠️";
    title = "Прийнятно, але з ризиками";
    text = `Авто ще їздить, але витрати зростають. $${perMonth}/міс. На горизонті — капремонт або продаж.`;
  } else {
    emoji = "💀";
    title = "Грошова яма";
    text = `За 5 років витратиш більше, ніж коштує авто. Двигун на межі. $${perMonth}/міс — дорого. Краще продати зараз.`;
  }

  return {
    emoji,
    title,
    text,
    buyPrice: profile.price,
    resaleVal,
    totalMaint: lastYear.totalMaint,
    totalSpent,
    realCost,
    perYear,
    perMonth,
    finalEngine,
    finalTrans: lastYear.trans,
    finalBody: lastYear.body,
  };
}
