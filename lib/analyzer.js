// ============================================================
//  FreeCar Top — Risk Analyzer Logic
//  Pure functions, no React dependencies
// ============================================================

export const CURRENT_YEAR = new Date().getFullYear();
export const AVG_KM_PER_YEAR = 15000; // Ukrainian average

export const IMPORT_OPTIONS = [
  { value: 'ua',    label: '🇺🇦 Україна',    riskNote: null },
  { value: 'eu',    label: '🇪🇺 ЄС',          riskNote: null },
  { value: 'de',    label: '🇩🇪 Німеччина',   riskNote: null },
  { value: 'usa',   label: '🇺🇸 США',          riskNote: 'ризик ДТП/крадіжки (CARFAX обов\'язково)' },
  { value: 'other', label: '🌍 Інша країна',  riskNote: 'невідоме походження' },
];

/**
 * @param {object} input
 * @param {number} input.year
 * @param {number} input.claimedMileage
 * @param {number} [input.prevMileage1]
 * @param {number} [input.prevMileage2]
 * @param {number} input.owners
 * @param {number} [input.regYear]        — рік першої реєстрації в UA
 * @param {string} input.importCountry    — 'ua' | 'eu' | 'de' | 'usa' | 'other'
 * @param {number} input.priceAsked       — в доларах
 * @param {number} [input.marketPrice]    — ринкова ціна подібних авто ($)
 * @param {number} [input.weeksOnSale]    — тижнів в оголошенні
 * @param {boolean} [input.fastReReg]     — швидке переоформлення
 * @param {boolean} [input.vinChecked]    — VIN перевірено
 * @returns {{ score, flags, positives, verdict, verdictColor, verdictEmoji }}
 */
export function analyzeRisk(input) {
  const {
    year,
    claimedMileage,
    prevMileage1 = 0,
    prevMileage2 = 0,
    owners,
    regYear,
    importCountry = 'ua',
    priceAsked = 0,
    marketPrice = 0,
    weeksOnSale = 0,
    fastReReg = false,
    vinChecked = false,
  } = input;

  const carAge     = CURRENT_YEAR - year;
  const yearsInUA  = regYear ? CURRENT_YEAR - regYear : carAge;
  const expected   = carAge * AVG_KM_PER_YEAR;

  let score = 100;
  const flags     = [];
  const positives = [];

  // ── 1. MILEAGE ROLLBACK ───────────────────────────────────────
  const prevs = [prevMileage1, prevMileage2].filter(v => v > 0);
  if (prevs.length > 0) {
    const maxPrev = Math.max(...prevs);
    if (maxPrev > claimedMileage) {
      const diff = maxPrev - claimedMileage;
      const cut  = diff > 100_000 ? 65 : diff > 50_000 ? 55 : diff > 20_000 ? 45 : 35;
      score -= cut;
      flags.push({
        severity: 'critical',
        icon: '🔢',
        title: `Пробіг скручений на ${Math.round(diff / 1000)}k км`,
        detail: `Раніше було ${maxPrev.toLocaleString('uk-UA')} км, зараз "чесних" ${claimedMileage.toLocaleString('uk-UA')} км`,
      });
    } else {
      // Previous records exist and confirm current mileage
      positives.push({ icon: '✅', text: `Попередній пробіг (${maxPrev.toLocaleString('uk-UA')} км) підтверджує поточний` });
    }
  }

  // ── 2. MILEAGE PLAUSIBILITY (only if no rollback found) ───────
  if (claimedMileage > 0 && carAge >= 3) {
    const ratio = claimedMileage / expected;

    if (ratio < 0.25 && prevs.length === 0) {
      // Suspiciously low AND no prior records to validate
      score -= 15;
      flags.push({
        severity: 'high',
        icon: '🤔',
        title: `Підозріло малий пробіг (${claimedMileage.toLocaleString('uk-UA')} км / ${carAge} р.)`,
        detail: `Очікуваний середній: ~${expected.toLocaleString('uk-UA')} км. Без записів пробігу — перевір в архівах auto.ria або через сервісну книжку`,
      });
    } else if (ratio > 2.3) {
      score -= 8;
      flags.push({
        severity: 'medium',
        icon: '💨',
        title: `Великий пробіг — ${claimedMileage.toLocaleString('uk-UA')} км`,
        detail: `Понад удвічі більше за середній. Рахуй витрати на капремонт і запчастини`,
      });
    } else if (ratio >= 0.65 && ratio <= 1.4 && prevs.length === 0) {
      positives.push({ icon: '✅', text: `Пробіг відповідає віку (${claimedMileage.toLocaleString('uk-UA')} км / ${carAge} р.)` });
    }
  }

  // ── 3. OWNERS ─────────────────────────────────────────────────
  if (owners >= 4) {
    score -= 25;
    flags.push({
      severity: 'high',
      icon: '👥',
      title: `${owners} власники за ${yearsInUA} р. — занадто багато`,
      detail: 'Часта зміна власників = приховані проблеми або "перекупство". Перевіряй кожного',
    });
  } else if (owners === 3) {
    score -= 15;
    flags.push({
      severity: 'medium',
      icon: '👥',
      title: `${owners} власники за ${yearsInUA} р.`,
      detail: 'Більше двох — варто з\'ясувати причини зміни кожного власника',
    });
  } else if (owners === 2) {
    score -= 3;
    flags.push({
      severity: 'low',
      icon: '👥',
      title: `${owners} власники — прийнятно`,
      detail: '',
    });
  } else if (owners === 1) {
    positives.push({ icon: '✅', text: 'Один власник — найкраще' });
  }

  // ── 4. FAST RE-REGISTRATION ───────────────────────────────────
  if (fastReReg) {
    score -= 16;
    flags.push({
      severity: 'high',
      icon: '🔄',
      title: 'Швидке переоформлення',
      detail: 'Власник намагався якнайшвидше позбутись авто — що він знав? Дуже погана ознака',
    });
  }

  // ── 5. IMPORT COUNTRY ─────────────────────────────────────────
  if (importCountry === 'usa') {
    score -= 15;
    flags.push({
      severity: 'high',
      icon: '🇺🇸',
      title: 'Авто з США',
      detail: 'Ризик прихованих пошкоджень після ДТП або крадіжки. Обов\'язково перевір CARFAX / AutoCheck перед переговорами',
    });
  } else if (importCountry === 'other') {
    score -= 5;
    flags.push({
      severity: 'low',
      icon: '🌍',
      title: 'Авто з невідомої країни',
      detail: 'З\'ясуй повну історію імпорту',
    });
  } else if (importCountry === 'eu' || importCountry === 'de') {
    positives.push({ icon: '✅', text: `Авто з ${importCountry === 'de' ? 'Німеччини' : 'ЄС'} — хороша ознака` });
  } else {
    positives.push({ icon: '✅', text: 'Авто без перетину кордону' });
  }

  // ── 6. LONG LISTING ───────────────────────────────────────────
  if (weeksOnSale >= 104) {
    score -= 22;
    flags.push({
      severity: 'critical',
      icon: '📅',
      title: `Продається ${Math.round(weeksOnSale / 4.3)} місяців — ніхто не бере`,
      detail: 'Ринок відмовляється від цього авто. Задайся питанням: чому ніхто не купив за 2 роки?',
    });
  } else if (weeksOnSale >= 52) {
    score -= 14;
    flags.push({
      severity: 'high',
      icon: '📅',
      title: `Продається ${Math.round(weeksOnSale / 4.3)} місяців`,
      detail: 'Довго не може знайти покупця. Є привід для серйозного торгу або сховані проблеми',
    });
  } else if (weeksOnSale >= 24) {
    score -= 6;
    flags.push({
      severity: 'medium',
      icon: '📅',
      title: `Продається ~${Math.round(weeksOnSale / 4.3)} місяці`,
      detail: 'Помірно довго. Можна торгуватись',
    });
  } else if (weeksOnSale > 0 && weeksOnSale <= 3) {
    positives.push({ icon: '✅', text: 'Свіже оголошення' });
  }

  // ── 7. PRICE vs MARKET ────────────────────────────────────────
  if (marketPrice > 0 && priceAsked > 0) {
    const pct = (priceAsked - marketPrice) / marketPrice;

    if (pct > 0.3) {
      score -= 15;
      flags.push({
        severity: 'high',
        icon: '💰',
        title: `Ціна завищена на ${Math.round(pct * 100)}% від ринку`,
        detail: `Просять $${priceAsked.toLocaleString()}, ринок $${marketPrice.toLocaleString()}. Або не розуміє ринок, або сподівається на наївного покупця`,
      });
    } else if (pct > 0.12) {
      score -= 8;
      flags.push({
        severity: 'medium',
        icon: '💰',
        title: `Ціна вища за ринок (+${Math.round(pct * 100)}%)`,
        detail: `Є простір для торгу до ~$${marketPrice.toLocaleString()}`,
      });
    } else if (pct < -0.22) {
      score -= 20;
      flags.push({
        severity: 'critical',
        icon: '💸',
        title: `Ціна НИЖЧА за ринок на ${Math.round(Math.abs(pct) * 100)}% — ПІДОЗРІЛО!`,
        detail: `Занадто дешево ($${priceAsked.toLocaleString()} vs ринок $${marketPrice.toLocaleString()}) — або приховані проблеми, або власник хоче терміново зникнути`,
      });
    } else if (pct < -0.08) {
      score -= 5;
      flags.push({
        severity: 'medium',
        icon: '💸',
        title: `Ціна нижча за ринок — перевіряй причину`,
        detail: 'Привабливо, але з\'ясуй чому дешевше перед покупкою',
      });
    } else {
      positives.push({ icon: '✅', text: `Ціна ринкова (~$${marketPrice.toLocaleString()})` });
    }
  }

  // ── 8. VIN ────────────────────────────────────────────────────
  if (vinChecked) {
    positives.push({ icon: '✅', text: 'VIN перевірено — правильний підхід' });
  } else {
    score -= 5;
    flags.push({
      severity: 'low',
      icon: '🔍',
      title: 'VIN ще не перевірявся',
      detail: 'Перевір на carvertical.com, auto.ria.com або carfax.com перед зустріччю',
    });
  }

  // ── FINAL SCORE ───────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  let verdict, verdictColor, verdictEmoji;

  if (score >= 80) {
    verdict      = 'Можна дивитись — стандартна перевірка';
    verdictColor = 'green';
    verdictEmoji = '✅';
  } else if (score >= 60) {
    verdict      = 'Обережно — торгуйся і перевіряй ретельно';
    verdictColor = 'yellow';
    verdictEmoji = '⚠️';
  } else if (score >= 35) {
    verdict      = 'Дуже підозріло — краще пропустити';
    verdictColor = 'orange';
    verdictEmoji = '🔴';
  } else {
    verdict      = 'ТІКАЙ — класична пастка';
    verdictColor = 'red';
    verdictEmoji = '☠️';
  }

  return { score, flags, positives, verdict, verdictColor, verdictEmoji };
}

/**
 * Генерує шерабельний текст у стилі Instagram-постів
 */
export function generateShareText(carInfo, result, marketPrice) {
  const { make, model, year, claimedMileage, priceAsked, owners } = carInfo;
  const { score, flags, verdict, verdictEmoji, positives } = result;

  const critical = flags.filter(f => f.severity === 'critical');
  const high     = flags.filter(f => f.severity === 'high');
  const medium   = flags.filter(f => f.severity === 'medium');

  const lines = [];

  lines.push(`${make} ${model} ${year} — аналіз від freecartop 🚘`);
  lines.push(`що ми маємо? 👇`);
  lines.push('');

  let counter = 1;

  critical.forEach(f => {
    lines.push(`${counter}. ${f.title}`);
    counter++;
  });
  high.forEach(f => {
    lines.push(`${counter}. ${f.title}`);
    counter++;
  });
  medium.forEach(f => {
    lines.push(`${counter}. ${f.title}`);
    counter++;
  });

  if (marketPrice > 0 && priceAsked > 0) {
    lines.push('');
    const diff = Math.round(((priceAsked - marketPrice) / marketPrice) * 100);
    if (Math.abs(diff) > 5) {
      lines.push(
        diff > 0
          ? `💰 Просять $${priceAsked.toLocaleString()} при ринку ~$${marketPrice.toLocaleString()} (+${diff}%)`
          : `💸 Просять $${priceAsked.toLocaleString()} при ринку ~$${marketPrice.toLocaleString()} (${diff}%)`,
      );
    } else {
      lines.push(`💰 Ціна: $${priceAsked.toLocaleString()} (~ринок $${marketPrice.toLocaleString()})`);
    }
  }

  lines.push('');
  lines.push(`📊 Рейтинг довіри: ${score}/100`);
  lines.push(`${verdictEmoji} Вердикт: ${verdict}`);
  lines.push('');
  lines.push('Перевірено на freecartop.vercel.app');

  return lines.join('\n');
}
