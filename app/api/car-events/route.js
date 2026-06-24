import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getWeaknessPromptText } from "../../../lib/carMarket.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory event cache ────────────────────────────────────
// Key: make|model|fuel|transmission — events are model-type specific
const eventCache    = new Map();
const EVENT_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const EVENT_CACHE_MAX = 300;

function eventCacheKey(p) {
  return `${p.make}|${p.model}|${p.fuel}|${p.transmission}`.toLowerCase().replace(/\s+/g, '_');
}
function getCachedEvents(key) {
  const e = eventCache.get(key);
  if (!e || Date.now() > e.expiresAt) { eventCache.delete(key); return null; }
  return e.data;
}
function setCachedEvents(key, data) {
  if (eventCache.size >= EVENT_CACHE_MAX) {
    eventCache.delete(eventCache.keys().next().value); // evict oldest
  }
  eventCache.set(key, { data, expiresAt: Date.now() + EVENT_CACHE_TTL });
}

const rateLimitMap = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || e.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  return ++e.count <= 5;
}

function buildPrompt(p) {
  const {
    make,
    model,
    year,
    mileage,
    price,
    importCountry,
    transmission,
    fuel,
    body,
    knownIssues,
  } = p;
  const age = new Date().getFullYear() - Number(year);
  const totalKm = Number(mileage) + 15000 * 5;
  const weaknessText = getWeaknessPromptText(make, model);

  return `Ти — досвідчений автомеханік і аналітик UA ринку. Тобі потрібно змоделювати реалістичні події для конкретного авто протягом 5 років використання.

ПРОФІЛЬ АВТО:
- ${make || "?"} ${model || "?"} ${year || "?"} р., ${body || "кузов невідомий"}, ${fuel || "бензин"}
- Куплено за: $${price || "?"}
- Пробіг при покупці: ${Number(mileage).toLocaleString("uk-UA")} км
- Через 5 років буде: ~${totalKm.toLocaleString("uk-UA")} км
- Країна ввезення: ${importCountry || "UA"}
- Коробка: ${transmission || "АКПП"}
- Відомі проблеми: ${knownIssues || "не вказано"}
- Вік авто: ${age} р.
${weaknessText}
ЗАВДАННЯ: Для кожного з 5 років — згенеруй 2-3 реалістичних події (поломки, ТО, сюрпризи).

Враховуй:
- РЕАЛЬНІ слабкі місця ЦІЄЇ моделі (вище надані дані — використовуй їх!)
- Вік і пробіг: рік 1 — дрібниці, рік 3-4 — планові великі роботи, рік 5 — можливо капремонт
- Країна ввезення: авто з США → вищий ризик прихованих пошкоджень, можливі іржа і електрика
- Пальне: дизель → паливна система, сажовий фільтр (DPF) після 150k; гібрид → батарея
- Коробка: DSG/варіатор → специфічні ризики

Відповідь ТІЛЬКИ у JSON (без markdown, без пояснень):
{
  "years": [
    {
      "yearIndex": 1,
      "headline": "<1 речення-настрій року — іронічний або прямий>",
      "events": [
        {
          "icon": "<emoji>",
          "title": "<назва до 50 символів>",
          "detail": "<1 речення опису що сталось>",
          "cost": <число в доларах>,
          "engineDelta": <-5..+5, вплив на стан двигуна>,
          "transDelta": <-5..+5>,
          "bodyDelta": <-3..+3>,
          "type": "<repair|scheduled|surprise|external>"
        }
      ]
    }
  ]
}

Типи подій:
- repair: поломка, незапланований ремонт
- scheduled: планове ТО (ремінь ГРМ, шини, гальма)
- surprise: несподівана ситуація (крадіжка дзеркала, ДТП з паркування, блекаут — не доїхав)
- external: ринкова подія (ціна запчастин зросла, курс, нові правила техогляду)

Costs у доларах: маленький ремонт $50–200, середній $200–600, великий $600–2000.
engineDelta позитивний = покращення після ремонту.`;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "bad_content_type" }, { status: 415 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const sanitized = {
    make: String(data.make || "").slice(0, 30),
    model: String(data.model || "").slice(0, 30),
    year: parseInt(data.year) || 2015,
    mileage: parseInt(data.mileage) || 0,
    price: parseInt(data.price) || 0,
    importCountry: String(data.importCountry || "ua").slice(0, 10),
    transmission: String(data.transmission || "auto").slice(0, 10),
    fuel: String(data.fuel || "gasoline").slice(0, 15),
    body: String(data.body || "").slice(0, 20),
    knownIssues: String(data.knownIssues || "").slice(0, 200),
  };

  // ── Cache hit ──────────────────────────────────────────────
  const cacheKey = eventCacheKey(sanitized);
  const cached   = getCachedEvents(cacheKey);
  if (cached) {
    return NextResponse.json({ ok: true, years: cached, cached: true });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      messages: [{ role: "user", content: buildPrompt(sanitized) }],
    });

    const raw = message.content[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "no_json" }, { status: 502 });

    let result;
    try {
      result = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "parse_error" }, { status: 502 });
    }

    // Validate and clamp
    if (!Array.isArray(result.years))
      return NextResponse.json({ error: "bad_shape" }, { status: 502 });
    result.years = result.years.map((y) => ({
      ...y,
      events: (y.events ?? []).map((e) => ({
        ...e,
        cost: Math.max(0, Math.min(5000, Number(e.cost) || 0)),
        engineDelta: Math.max(-10, Math.min(8, Number(e.engineDelta) || 0)),
        transDelta: Math.max(-10, Math.min(8, Number(e.transDelta) || 0)),
        bodyDelta: Math.max(-5, Math.min(5, Number(e.bodyDelta) || 0)),
      })),
    }));

    // ── Cache store ──────────────────────────────────────────
    setCachedEvents(cacheKey, result.years);

    return NextResponse.json({ ok: true, years: result.years, cached: false });
  } catch (err) {
    console.error("[/api/car-events]", err?.message);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
