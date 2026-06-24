import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory rate limit (per IP, resets on cold start) ──────
const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return false;
  return true;
}

// ── Prompt ───────────────────────────────────────────────────
function buildPrompt(data) {
  const {
    make,
    model,
    year,
    claimedMileage,
    prevMileage,
    owners,
    importCountry,
    priceAsked,
    marketPrice,
    weeksOnSale,
    fastReReg,
    vinChecked,
    listingUrl,
    fuelType,
    body,
  } = data;

  const currentYear = new Date().getFullYear();
  const carAge = currentYear - Number(year);
  const avgExpected = carAge * 15000;

  return `Ти — відомий в Україні автоексперт, який робить вірусні пости розборів оголошень у стилі Instagram. Твій стиль: прямий, іноді іронічний, з емодзі, але завжди по суті. Ти захищаєш покупців від шахраїв і перекупників.

ДАНІ ОГОЛОШЕННЯ:
- Авто: ${make || "?"} ${model || "?"} ${year || "?"} р., ${body || "?"}, ${fuelType || "?"}
- Заявлений пробіг: ${claimedMileage ? Number(claimedMileage).toLocaleString("uk-UA") + " км" : "не вказано"}
- Попередній пробіг (з архіву/старого оголошення): ${prevMileage ? Number(prevMileage).toLocaleString("uk-UA") + " км" : "не знайдено"}
- Кількість власників: ${owners || "?"}
- Країна ввезення: ${importCountry || "Україна"}
- Ціна продавця: ${priceAsked ? "$" + Number(priceAsked).toLocaleString() : "не вказано"}
- Ринкова ціна аналогів: ${marketPrice ? "~$" + Number(marketPrice).toLocaleString() : "не вказано"}
- Тижнів в оголошенні: ${weeksOnSale || "невідомо"}
- Швидке переоформлення: ${fastReReg ? "ТАК 🚩" : "ні"}
- VIN перевірено: ${vinChecked ? "так ✅" : "ні"}
- Посилання: ${listingUrl || "не надано"}
- Середній пробіг за вік авто (${carAge} р.): ~${avgExpected.toLocaleString("uk-UA")} км

ЗАВДАННЯ: Зроби аналіз цього оголошення у твоєму фірмовому стилі.

Відповідь ОБОВ'ЯЗКОВО у такому JSON форматі (і тільки JSON, без markdown, без пояснень навколо):
{
  "score": <число 0-100, рейтинг довіри>,
  "verdict": "<emoji + короткий вердикт до 60 символів>",
  "verdictLevel": "<одне з: safe | caution | suspicious | run>",
  "postText": "<вірусний Instagram-пост розбору, 150-300 символів, з емодзі, стиль 'що ми маємо? 👇'>",
  "flags": [
    { "severity": "<critical|high|medium|low>", "icon": "<emoji>", "title": "<до 60 симв>", "detail": "<деталь 1-2 речення>" }
  ],
  "positives": ["<позитивна ознака>"],
  "priceForecast": "<прогноз ціни через 1 рік: наприклад 'Через рік піде за ~$14 400'>",
  "negotiationTip": "<конкретна порада по торгу або чому відмовитись>"
}

Правила:
- score < 35 → verdictLevel = "run"
- score 35-59 → "suspicious"
- score 60-79 → "caution"
- score 80+ → "safe"
- Якщо prevMileage > claimedMileage — це ЗАВЖДИ critical flag і мінус мінімум 40 балів від score
- Якщо ціна нижча за ринок > 20% — це теж підозріло (suspicious), не "добре"
- Якщо авто продається > 1 рік — великий мінус
- Будь чесним: якщо даних мало — кажи що треба додатково перевірити`;
}

// ── Route ─────────────────────────────────────────────────────
export async function POST(req) {
  // API key guard
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не налаштований" },
      { status: 503 },
    );
  }

  // Content-Type
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type має бути application/json" },
      { status: 415 },
    );
  }

  // Body size guard (16KB max)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 16 * 1024) {
    return NextResponse.json(
      { error: "Тіло запиту занадто велике" },
      { status: 413 },
    );
  }

  // Rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Забагато запитів. Спробуй через 10 хвилин." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  // Parse body
  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  // Validate required
  if (!data.year || !data.claimedMileage) {
    return NextResponse.json(
      { error: "Рік і пробіг обов'язкові" },
      { status: 400 },
    );
  }

  // Sanitize inputs — truncate strings to safe lengths
  const sanitized = {
    make: String(data.make || "").slice(0, 50),
    model: String(data.model || "").slice(0, 50),
    year: parseInt(data.year) || 0,
    claimedMileage: parseInt(data.claimedMileage) || 0,
    prevMileage: parseInt(data.prevMileage) || 0,
    owners: Math.min(parseInt(data.owners) || 1, 20),
    importCountry: String(data.importCountry || "ua").slice(0, 20),
    priceAsked: parseFloat(data.priceAsked) || 0,
    marketPrice: parseFloat(data.marketPrice) || 0,
    weeksOnSale: parseInt(data.weeksOnSale) || 0,
    fastReReg: Boolean(data.fastReReg),
    vinChecked: Boolean(data.vinChecked),
    listingUrl: String(data.listingUrl || "").slice(0, 200),
    fuelType: String(data.fuelType || "").slice(0, 30),
    body: String(data.body || "").slice(0, 30),
  };

  // Call Claude
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(sanitized) }],
    });

    const raw = message.content[0]?.text ?? "";

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI не повернув коректний JSON. Спробуй ще раз." },
        { status: 502 },
      );
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Помилка парсингу відповіді AI." },
        { status: 502 },
      );
    }

    // Clamp score
    result.score = Math.max(0, Math.min(100, Number(result.score) || 0));

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/analyze] Claude error:", err?.message);
    if (err?.status === 401) {
      return NextResponse.json(
        { error: "Невалідний ANTHROPIC_API_KEY" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Помилка AI. Спробуй ще раз." },
      { status: 502 },
    );
  }
}
