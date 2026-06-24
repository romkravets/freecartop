import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || e.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  return ++e.count <= 5;
}

// ── Label maps ────────────────────────────────────────────────
const PURPOSE_LABELS = {
  daily: 'Місто / щодня',
  family: 'Сімейне авто',
  offroad: 'Позашляховик / погані дороги',
  status: 'Статус / бізнес',
  economy: 'Мінімум витрат / рідко їздити',
  highway: 'Траса / відрядження',
};
const BODY_LABELS = {
  any: 'будь-який',
  sedan: 'седан',
  suv: 'кросовер / SUV',
  hatch: 'хетчбек / комбі',
  minivan: 'мінівен',
  coupe: 'купе',
};
const FUEL_LABELS = {
  any: 'будь-яке',
  gasoline: 'бензин',
  diesel: 'дизель',
  hybrid: 'гібрид',
  electric: 'електро',
};
const PRIORITY_LABELS = {
  reliability: 'надійність (не ламатись)',
  economy: 'економність (пальне + ТО)',
  comfort: 'комфорт (тихо, плавно)',
  safety: 'безпека (краш-тести, ADAS)',
  dynamics: 'динаміка / потужність',
  cargo: 'місткість / великий багажник',
  resale: 'висока ціна продажу',
};
const TRANSMISSION_LABELS = {
  any: 'будь-яка',
  auto: 'тільки автоматична КПП',
  manual: 'механічна КПП',
  no_dsg: 'без DSG / CVT (проблемних роботів)',
};
const IMPORT_LABELS = {
  any: 'будь-яка',
  jp_eu: 'бажано з Японії або ЄС',
  no_usa: 'уникати авто зі США (страхові ризики)',
  ukraine: 'тільки з українським пробігом',
};

function buildPickPrompt(p) {
  const budgetStr = p.budgetMax >= 60000
    ? `$${p.budgetMin.toLocaleString('uk-UA')} – $60 000+`
    : `$${p.budgetMin.toLocaleString('uk-UA')} – $${p.budgetMax.toLocaleString('uk-UA')}`;

  const purposeStr   = p.purposes.map(k => PURPOSE_LABELS[k] ?? k).join(', ');
  const bodyStr      = p.bodies.includes('any')  ? 'будь-який кузов' : p.bodies.map(k => BODY_LABELS[k] ?? k).join(', ');
  const fuelStr      = p.fuels.includes('any')   ? 'будь-яке пальне' : p.fuels.map(k => FUEL_LABELS[k] ?? k).join(', ');
  const prioStr      = p.priorities.length > 0
    ? p.priorities.map((k, i) => `${i + 1}. ${PRIORITY_LABELS[k] ?? k}`).join('; ')
    : 'не зазначено';

  const transmStr    = TRANSMISSION_LABELS[p.transmission] ?? p.transmission;
  const importStr    = IMPORT_LABELS[p.importPref] ?? p.importPref;
  const similarLine  = p.similarTo ? `\n- Схоже на / орієнтир: ${p.similarTo}` : '';
  const notesLine    = p.extraNotes ? `\n- Особливі побажання: ${p.extraNotes}` : '';

  return `Ти — досвідчений автоексперт українського ринку. Підбери 3 найкращих авто під конкретні потреби покупця.

ПАРАМЕТРИ ПОКУПЦЯ:
- Бюджет: ${budgetStr}
- Мета: ${purposeStr}
- Тип кузова: ${bodyStr}
- Пальне: ${fuelStr}
- Пріоритети (за важливістю): ${prioStr}
- Коробка: ${transmStr}
- Країна ввезення: ${importStr}${similarLine}${notesLine}

ЗАВДАННЯ: Підбери рівно 3 варіанти авто. Враховуй:
- Тільки авто які є на UA ринку в зазначеному бюджеті (перевір ціну!)
- Якщо вказані пріоритети — ранжуй кандидатів по них у зазначеному порядку
- Якщо вказано "схоже на X" — підбери аналоги до тієї моделі або дешевші альтернативи
- Якщо "без DSG/CVT" — не пропонуй VW DSG, Nissan CVT, Subaru Lineartronic
- Якщо "без авто зі США" — уникай авто що типово везуть з США (Lexus, американські версії)
- Якщо гібрид обраний — враховуй вартість батареї
- Якщо електро — враховуй ціни зарядки і доступність авто в UA в цьому бюджеті

Відповідь ТІЛЬКИ у JSON (без markdown, без будь-якого тексту навколо):
{
  "intro": "<1-2 речення чому саме ці 3 варіанти підходять для цих параметрів>",
  "cars": [
    {
      "make": "<марка>",
      "model": "<модель>",
      "generation": "<роки, наприклад 2017-2021>",
      "icon": "<emoji прапор країни виробника>",
      "priceRange": "<наприклад $9 000–14 000>",
      "whyBest": "<1 речення чому саме цей варіант #N для цих параметрів>",
      "scores": {
        "reliability": <1-10>,
        "economy": <1-10>,
        "comfort": <1-10>,
        "dynamics": <1-10>,
        "safety": <1-10>
      },
      "pros": ["<плюс 1>", "<плюс 2>", "<плюс 3>"],
      "cons": ["<мінус 1>", "<мінус 2>"],
      "watchOut": ["<конкретна технічна проблема ЦІЄЇ моделі>", "<що перевірити при огляді>"],
      "marketTip": "<конкретна порада: де шукати на UA ринку, які мотори кращі, від яких років уникати>"
    }
  ]
}

Правила:
- Scores ніколи не 0, тільки 1-10
- watchOut — конкретно для ЦІЄЇ моделі, не загальні поради
- marketTip — конкретно: мотор, рік, що насторожити
- Не пропонуй авто дорожчі за верхній бюджет`;
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY не налаштований" }, { status: 503 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type має бути application/json" }, { status: 415 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Забагато запитів. Спробуй через 10 хвилин." }, { status: 429 });
  }

  let data;
  try { data = await req.json(); }
  catch { return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 }); }

  // Support both new format (budgetMin/budgetMax/purposes[]) and legacy format
  const isNewFormat = Array.isArray(data.purposes);

  if (isNewFormat && (!data.budgetMin || !data.budgetMax || !data.purposes?.length)) {
    return NextResponse.json({ error: "Вкажи бюджет і мету" }, { status: 400 });
  }

  let sanitized;
  if (isNewFormat) {
    sanitized = {
      budgetMin:    Math.max(0,     Math.min(60000, parseInt(data.budgetMin)  || 5000)),
      budgetMax:    Math.max(1000,  Math.min(60000, parseInt(data.budgetMax)  || 20000)),
      purposes:     (data.purposes  || []).slice(0, 6).map(s => String(s).slice(0, 20)),
      bodies:       (data.bodies    || ['any']).slice(0, 6).map(s => String(s).slice(0, 20)),
      fuels:        (data.fuels     || ['any']).slice(0, 5).map(s => String(s).slice(0, 20)),
      priorities:   (data.priorities || []).slice(0, 3).map(s => String(s).slice(0, 20)),
      transmission: String(data.transmission || 'any').slice(0, 20),
      importPref:   String(data.importPref   || 'any').slice(0, 20),
      similarTo:    String(data.similarTo    || '').slice(0, 100),
      extraNotes:   String(data.extraNotes   || '').slice(0, 300),
    };
  } else {
    // Legacy single-value format from old AICarPicker
    sanitized = {
      budgetMin:    0,
      budgetMax:    60000,
      purposes:     [String(data.purpose  || 'daily').slice(0, 20)],
      bodies:       [String(data.body     || 'any').slice(0, 20)],
      fuels:        [String(data.fuel     || 'any').slice(0, 20)],
      priorities:   data.priority ? [String(data.priority).slice(0, 20)] : [],
      transmission: 'any',
      importPref:   'any',
      similarTo:    '',
      extraNotes:   String(data.extraNotes || '').slice(0, 300),
    };
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPickPrompt(sanitized) }],
    });

    const raw = message.content[0]?.text ?? "";
    const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI не повернув коректний JSON. Спробуй ще раз." }, { status: 502 });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      // Repair trailing commas
      try {
        const repaired = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
        result = JSON.parse(repaired);
      } catch {
        return NextResponse.json({ error: "Помилка парсингу відповіді AI." }, { status: 502 });
      }
    }

    // Clamp scores 1-10
    if (Array.isArray(result.cars)) {
      result.cars = result.cars.map((car) => ({
        ...car,
        scores: car.scores
          ? Object.fromEntries(
              Object.entries(car.scores).map(([k, v]) => [k, Math.max(1, Math.min(10, Number(v) || 5))])
            )
          : { reliability: 5, economy: 5, comfort: 5, dynamics: 5, safety: 5 },
      }));
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/pick] error:", err?.message);
    if (err?.status === 401) {
      return NextResponse.json({ error: "Невалідний ANTHROPIC_API_KEY" }, { status: 401 });
    }
    return NextResponse.json({ error: "Помилка AI. Спробуй ще раз." }, { status: 502 });
  }
}
