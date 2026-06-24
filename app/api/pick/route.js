import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function buildPickPrompt(prefs) {
  const {
    budget,
    budgetLabel,
    purpose,
    purposeLabel,
    body,
    bodyLabel,
    fuel,
    fuelLabel,
    priority,
    priorityLabel,
    extraNotes,
  } = prefs;

  return `Ти — досвідчений автоексперт українського ринку. Твоє завдання — підібрати оптимальні авто під конкретні потреби покупця.

ПАРАМЕТРИ ПОКУПЦЯ:
- Бюджет: ${budgetLabel} (${budget})
- Мета використання: ${purposeLabel}
- Тип кузова: ${bodyLabel}
- Пальне: ${fuelLabel}
- Головний пріоритет: ${priorityLabel}
- Додаткові побажання: ${extraNotes || "не вказано"}

ЗАВДАННЯ: Підбери 3 найкращих варіанти авто для українського ринку 2024-2025.

Відповідь ТІЛЬКИ у JSON (без markdown, без пояснень навколо):
{
  "intro": "<1-2 речення: чому ці 3 варіанти найкращі для цих параметрів>",
  "cars": [
    {
      "rank": 1,
      "make": "<марка>",
      "model": "<модель>",
      "generation": "<роки, наприклад 2017-2021>",
      "icon": "<emoji прапору країни виробника>",
      "priceRange": "<наприклад $9 000–14 000>",
      "whyBest": "<1 речення чому це #1 для цих параметрів>",
      "scores": {
        "reliability": <0-10>,
        "economy": <0-10>,
        "comfort": <0-10>,
        "dynamics": <0-10>,
        "safety": <0-10>
      },
      "pros": ["<плюс 1>", "<плюс 2>", "<плюс 3>"],
      "cons": ["<мінус 1>", "<мінус 2>"],
      "watchOut": ["<що перевірити при покупці 1>", "<що перевірити 2>"],
      "marketTip": "<конкретна порада де шукати і на що звернути увагу на UA ринку>"
    }
  ]
}

Правила:
- Тільки реальні авто що є на UA ринку в цьому бюджеті
- Scores від 1 до 10, ніколи не 0
- watchOut — конкретні технічні проблеми ЦІЄЇ моделі, не загальні поради
- marketTip — конкретно: "на auto.ria шукай…", "уникай моторів…", "ціна нижче $X — питай чому"
- Якщо бюджет "до $8 000" — тільки авто в цьому діапазоні, не пропонуй дорожчі`;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не налаштований" },
      { status: 503 },
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type має бути application/json" },
      { status: 415 },
    );
  }

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

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  if (
    !data.budget ||
    !data.purpose ||
    !data.body ||
    !data.fuel ||
    !data.priority
  ) {
    return NextResponse.json(
      { error: "Всі параметри підбору обов'язкові" },
      { status: 400 },
    );
  }

  const sanitized = {
    budget: String(data.budget).slice(0, 20),
    budgetLabel: String(data.budgetLabel || data.budget).slice(0, 40),
    purpose: String(data.purpose).slice(0, 20),
    purposeLabel: String(data.purposeLabel || data.purpose).slice(0, 40),
    body: String(data.body).slice(0, 20),
    bodyLabel: String(data.bodyLabel || data.body).slice(0, 40),
    fuel: String(data.fuel).slice(0, 20),
    fuelLabel: String(data.fuelLabel || data.fuel).slice(0, 40),
    priority: String(data.priority).slice(0, 20),
    priorityLabel: String(data.priorityLabel || data.priority).slice(0, 40),
    extraNotes: String(data.extraNotes || "").slice(0, 200),
  };

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPickPrompt(sanitized) }],
    });

    const raw = message.content[0]?.text ?? "";
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

    // Clamp all scores
    if (Array.isArray(result.cars)) {
      result.cars = result.cars.map((car) => ({
        ...car,
        scores: car.scores
          ? Object.fromEntries(
              Object.entries(car.scores).map(([k, v]) => [
                k,
                Math.max(1, Math.min(10, Number(v) || 5)),
              ]),
            )
          : { reliability: 5, economy: 5, comfort: 5, dynamics: 5, safety: 5 },
      }));
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/pick] Claude error:", err?.message);
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
