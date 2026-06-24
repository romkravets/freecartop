import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getMarketPrice, getWeaknesses, MARKET_PRICES, resolveMarketKey } from "../../../lib/carMarket.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rateLimitMap = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || e.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  return ++e.count <= 8;
}

function buildInsightPrompt(make, model, carYear, price) {
  const marketData = getMarketPrice(make, model, carYear);
  const weaknesses = getWeaknesses(make, model);
  const key        = resolveMarketKey(make, model);
  const table      = key ? MARKET_PRICES[key] : null;

  const priceTable = table
    ? Object.entries(table)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([y, p]) => `  ${y}: $${p.toLocaleString()}`)
        .join('\n')
    : 'Дані відсутні для цієї моделі';

  const userPrice = parseInt(price) || 0;
  const marketAvg = marketData?.avg ?? 0;
  const priceDiff = userPrice && marketAvg ? Math.round(((userPrice - marketAvg) / marketAvg) * 100) : null;

  const weaknessSummary = weaknesses
    ? `Відомі проблеми:\n${weaknesses.issues.map(i => `- ${i}`).join('\n')}\n${weaknesses.strengths}`
    : 'Специфічна база даних для цієї моделі відсутня.';

  return `Ти — аналітик UA автомобільного ринку. Дай стислу і корисну ринкову оцінку авто.

АВТО: ${make} ${model} ${carYear} р.
${userPrice ? `Ціна покупки: $${userPrice.toLocaleString()}` : ''}
${marketAvg ? `Середня ринкова ціна для ${carYear}р.: $${marketAvg.toLocaleString()}` : ''}
${priceDiff !== null ? `Відхилення від ринку: ${priceDiff > 0 ? '+' : ''}${priceDiff}%` : ''}

РИНКОВІ ЦІНИ (AUTO.RIA/OLX середнє, USD):
${priceTable}

${weaknessSummary}

Дай аналіз у JSON форматі (без markdown):
{
  "priceAssessment": "<1 речення: чи вигідна ціна — вище/нижче/в ринку>",
  "trendForecast": "<1 речення: як зміниться ціна цієї моделі за 1-2 роки>",
  "buyRecommendation": "<recommend|caution|avoid>",
  "buyReason": "<1-2 речення чому>",
  "topRisk": "<головний ризик для UA покупця — 1 речення>",
  "bestYear": "<який рік випуску найкраще купувати і чому — 1 речення>",
  "monthlyOwnershipCost": <орієнтовна вартість утримання в місяць в доларах включаючи паливо страховку і ТО>,
  "repairRisk": "<low|medium|high>",
  "uaSpecificNote": "<важлива особливість саме для UA умов — 1 речення>"
}`;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "bad_content_type" }, { status: 415 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  let data;
  try { data = await req.json(); }
  catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  const make     = String(data.make    || "").slice(0, 40);
  const model    = String(data.model   || "").slice(0, 40);
  const carYear  = parseInt(data.year) || 2017;
  const price    = parseInt(data.price) || 0;

  if (!make || !model) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: buildInsightPrompt(make, model, carYear, price) }],
    });

    const raw   = message.content[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "no_json" }, { status: 502 });

    let result;
    try { result = JSON.parse(match[0]); }
    catch { return NextResponse.json({ error: "parse_error" }, { status: 502 }); }

    // Attach static market data
    const marketData = getMarketPrice(make, model, carYear);
    const key = resolveMarketKey(make, model);
    const priceTable = key ? MARKET_PRICES[key] : null;

    return NextResponse.json({
      ok: true,
      insight: result,
      marketPrice: marketData?.avg ?? null,
      priceTable: priceTable ?? null,
    });
  } catch (err) {
    console.error("[/api/market-insights]", err?.message);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
