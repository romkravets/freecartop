import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 });
  }

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ error: 'bad_content_type' }, { status: 415 });
  }

  let data;
  try { data = await req.json(); }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const { imageBase64, mediaType = 'image/jpeg', make, model, year } = data;

  if (!imageBase64) {
    return NextResponse.json({ error: 'no_image' }, { status: 400 });
  }

  // ~2MB limit on base64 string (~1.5MB binary)
  if (imageBase64.length > 2_800_000) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const safeType = validTypes.includes(mediaType) ? mediaType : 'image/jpeg';
  const carLabel = [make, model, year].filter(Boolean).join(' ') || 'автомобіля';

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Ти — досвідчений автоексперт і оцінщик стану авто. Аналізуй фото ${carLabel}.

Дай технічний аналіз по фото. Відповідь тільки у JSON (без markdown, без пояснень):
{
  "exteriorCondition": "<1-2 речення: загальний стан кузова, фарби, наявні пошкодження>",
  "rustSigns": "<іржа або корозія: де виявлена і наскільки серйозна, або 'не виявлено'>",
  "overallGrade": <число від 1 до 10>,
  "redFlags": ["<конкретний прапорець>"],
  "checkInPerson": "<що обов'язково перевірити при особистому огляді>"
}`,
          },
        ],
      }],
    });

    const raw = message.content[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'no_json' }, { status: 502 });

    let analysis;
    try { analysis = JSON.parse(match[0]); }
    catch { return NextResponse.json({ error: 'parse_error' }, { status: 502 }); }

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error('[/api/photo-analyze]', err?.message);
    return NextResponse.json({ error: 'ai_error' }, { status: 502 });
  }
}
