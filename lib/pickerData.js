// ============================================================
//  FreeCar Top — Car Picker Database
//  Ukrainian market data, 2024-2025
// ============================================================

export const BUDGETS = [
  { key: 'micro',   label: 'до $8 000',     min: 0,     max: 8000  },
  { key: 'mid',     label: '$8 000–15 000', min: 8000,  max: 15000 },
  { key: 'upper',   label: '$15 000–25 000', min: 15000, max: 25000 },
  { key: 'premium', label: '$25 000+',       min: 25000, max: 99999 },
];

export const PURPOSES = [
  { key: 'daily',    emoji: '🏙', label: 'Щодня по місту',   desc: 'Основне авто, пробки, парковка' },
  { key: 'family',   emoji: '👨‍👩‍👧', label: 'Сімейне авто',      desc: 'Дітки, поїздки, багаж' },
  { key: 'offroad',  emoji: '🏔', label: 'Позашляховик',     desc: 'Погані дороги, виїзди на природу' },
  { key: 'status',   emoji: '✨', label: 'Статус / комфорт', desc: 'Бізнес, представницьке авто' },
  { key: 'economy',  emoji: '💼', label: 'Мінімум витрат',   desc: 'Дешево обслуговувати, мало їздити' },
];

export const BODY_TYPES = [
  { key: 'sedan',   emoji: '🚗', label: 'Седан',           desc: 'Класика, хороша керованість' },
  { key: 'suv',     emoji: '🚙', label: 'Кросовер / SUV',  desc: 'Висока посадка, простір' },
  { key: 'hatch',   emoji: '🚘', label: 'Хетч / Комбі',    desc: 'Містко і маневрено' },
  { key: 'minivan', emoji: '🚐', label: 'Мінівен',          desc: 'Максимум пасажирів і вантажу' },
];

export const FUELS = [
  { key: 'gasoline', emoji: '⛽', label: 'Бензин',  desc: 'Дешевше ТО, менше ризику взимку' },
  { key: 'diesel',   emoji: '🛢', label: 'Дизель',  desc: 'Економніший на трасі, дорожче обслуговування' },
  { key: 'hybrid',   emoji: '🔋', label: 'Гібрид',  desc: 'Менше витрати в місті' },
  { key: 'electric', emoji: '⚡', label: 'Електро', desc: 'Нульові витрати на пальне' },
];

export const PRIORITIES = [
  { key: 'reliability', emoji: '🔧', label: 'Надійність',  desc: 'Не хочу до СТО щомісяця' },
  { key: 'economy',     emoji: '💰', label: 'Економія',    desc: 'Мінімум витрат на пальне і ТО' },
  { key: 'comfort',     emoji: '🛋', label: 'Комфорт',     desc: 'Тиша, м\'яка підвіска, простір' },
  { key: 'dynamics',    emoji: '🏎', label: 'Динаміка',    desc: 'Спортивний стиль водіння' },
  { key: 'safety',      emoji: '🛡', label: 'Безпека',     desc: 'Максимальна пасивна і активна безпека' },
];

// ── CAR DATABASE ─────────────────────────────────────────────
// Scores: reliability (0-10), economy (0-10), comfort (0-10),
//         dynamics (0-10), safety (0-10)
//         Also: suitable[] for budget/purpose/body/fuel keys

export const CARS = [
  // ════════ MICRO BUDGET ════════
  {
    id: 'corolla-06',
    make: 'Toyota', model: 'Corolla', generation: '2006–2012',
    budget: ['micro'],
    purpose: ['daily', 'economy'],
    body: ['sedan', 'hatch'],
    fuel: ['gasoline'],
    priceRange: '$4 500–8 000',
    scores: { reliability: 10, economy: 8, comfort: 5, dynamics: 4, safety: 5 },
    pros: ['Легендарна надійність', 'Дешеве ТО', 'Запчастини скрізь', 'Помірний пробіг за вік'],
    cons: ['Скромний салон', 'Слабка динаміка', 'Багато на ринку битих'],
    watchOut: ['Перевір поперечні важелі', 'Іржа під капотом у старших', 'Дивись пробіг — класика для скручування'],
    icon: '🇯🇵',
  },
  {
    id: 'skoda-a5',
    make: 'Skoda', model: 'Octavia A5', generation: '2004–2013',
    budget: ['micro'],
    purpose: ['daily', 'family', 'economy'],
    body: ['sedan', 'hatch'],
    fuel: ['gasoline', 'diesel'],
    priceRange: '$4 500–8 000',
    scores: { reliability: 7, economy: 8, comfort: 7, dynamics: 5, safety: 6 },
    pros: ['Просторий салон за гроші', 'Комбі-версія ідеальна для родини', 'Зручний у трафіку'],
    cons: ['Дорожчий ремонт за японців', 'VAG "хвороби" — DSG, пневма', 'Іржа порогів'],
    watchOut: ['Уникай DSG (автомат) у старших', 'Перевір пневмопідвіску', 'DSG до 2009 — ненадійна'],
    icon: '🇨🇿',
  },
  {
    id: 'mazda3-old',
    make: 'Mazda', model: '3', generation: '2008–2013',
    budget: ['micro'],
    purpose: ['daily', 'economy'],
    body: ['sedan', 'hatch'],
    fuel: ['gasoline'],
    priceRange: '$5 000–8 000',
    scores: { reliability: 9, economy: 8, comfort: 6, dynamics: 7, safety: 6 },
    pros: ['Спортивна їздова динаміка', 'Дуже надійний мотор', 'Яскравий стиль'],
    cons: ['Гамірний на трасі', 'Твердіша підвіска', 'Тісний задній ряд'],
    watchOut: ['Іржа арок і порогів', 'Перевір підвіску — стуки типові', 'Пробіг — популярна для скручування'],
    icon: '🇯🇵',
  },

  // ════════ MID BUDGET ════════
  {
    id: 'camry-08',
    make: 'Toyota', model: 'Camry', generation: '2006–2014',
    budget: ['mid'],
    purpose: ['daily', 'family', 'status'],
    body: ['sedan'],
    fuel: ['gasoline'],
    priceRange: '$8 500–14 000',
    scores: { reliability: 10, economy: 7, comfort: 9, dynamics: 5, safety: 7 },
    pros: ['Найнадійніший седан у класі', 'Просторий і комфортний', 'Дешевий у обслуговуванні', 'Великий попит при перепродажу'],
    cons: ['Розмитий дизайн', 'Посередня динаміка', 'Завищена ціна через репутацію'],
    watchOut: ['Мотор 2.4 — слабке місце масло в охолодженні', 'Типова іржа порогів', 'Автомат — перевір роботу'],
    icon: '🇯🇵',
  },
  {
    id: 'sportage-12',
    make: 'Kia', model: 'Sportage', generation: '2010–2016',
    budget: ['mid'],
    purpose: ['family', 'offroad', 'daily'],
    body: ['suv'],
    fuel: ['gasoline', 'diesel'],
    priceRange: '$8 500–14 000',
    scores: { reliability: 7, economy: 7, comfort: 7, dynamics: 6, safety: 7 },
    pros: ['Хороший клас за гроші', 'Повний привід доступний', 'Зручний для родини'],
    cons: ['Дизель — капризний на холоді', 'Ланцюг ГРМ — перевіряй', 'Пластик салону простуватий'],
    watchOut: ['Ланцюг ГРМ мотора 2.0 — міняй до 150k', 'Іржа рами у старших', 'Гальмівні суппорти — типова проблема'],
    icon: '🇰🇷',
  },
  {
    id: 'octavia-a7',
    make: 'Skoda', model: 'Octavia A7', generation: '2013–2020',
    budget: ['mid'],
    purpose: ['daily', 'family', 'economy'],
    body: ['sedan', 'hatch'],
    fuel: ['gasoline', 'diesel'],
    priceRange: '$9 500–16 000',
    scores: { reliability: 7, economy: 8, comfort: 8, dynamics: 7, safety: 8 },
    pros: ['Відмінне співвідношення ціна/комфорт', 'Просторний багажник', 'Приємна керованість'],
    cons: ['DSG — ненадійна до 2015', 'Коксування мотора TSI', 'Дорогий ремонт у VAG-сервісах'],
    watchOut: ['DSG 7 (DQ200) — "суха" — уникай', 'TSI мотори — коксування клапанів', 'Перевір підтікання масла'],
    icon: '🇨🇿',
  },
  {
    id: 'rav4-10',
    make: 'Toyota', model: 'RAV4', generation: '2005–2012',
    budget: ['mid'],
    purpose: ['offroad', 'family'],
    body: ['suv'],
    fuel: ['gasoline'],
    priceRange: '$9 000–14 000',
    scores: { reliability: 9, economy: 6, comfort: 6, dynamics: 5, safety: 6 },
    pros: ['Дуже надійний', 'Повний привід без проблем', 'Популярний — легко знайти СТО'],
    cons: ['Гамірний на швидкості', 'Дорожнє просвітлення середнє', 'Простий салон'],
    watchOut: ['Іржа кузова у старших', 'Перевір AWD муфту', 'Пробіг — популярний для скручування'],
    icon: '🇯🇵',
  },

  // ════════ UPPER BUDGET ════════
  {
    id: 'camry-17',
    make: 'Toyota', model: 'Camry', generation: '2017–2021',
    budget: ['upper'],
    purpose: ['daily', 'family', 'status'],
    body: ['sedan'],
    fuel: ['gasoline', 'hybrid'],
    priceRange: '$17 000–24 000',
    scores: { reliability: 10, economy: 8, comfort: 9, dynamics: 6, safety: 9 },
    pros: ['Найкраще ТО у класі', 'Розкішний салон', 'Безпека 5★ NCAP', 'Гібрид — 5–6 л/100 в місті'],
    cons: ['Висока ціна для об\'єму', 'Гібрид — дорожчий ремонт акумулятора з часом', 'Спортивне водіння — не про нього'],
    watchOut: ['Ціна вища за ринок — торгуйся', 'Перевір ДТП через VIN', 'Гібрид — стан батареї'],
    icon: '🇯🇵',
  },
  {
    id: 'rav4-18',
    make: 'Toyota', model: 'RAV4', generation: '2013–2018',
    budget: ['upper'],
    purpose: ['family', 'offroad', 'daily'],
    body: ['suv'],
    fuel: ['gasoline', 'hybrid'],
    priceRange: '$16 000–23 000',
    scores: { reliability: 9, economy: 7, comfort: 8, dynamics: 5, safety: 8 },
    pros: ['Надійний повний привід', 'Просторий і практичний', 'Гарний ресурс двигуна'],
    cons: ['Нудний дизайн 2013–2015', 'Жорсткувата підвіска', 'Зростаюча ціна через попит'],
    watchOut: ['CVT автомат — перевір роботу', 'Іржа порогів у першого покоління', 'Пробіг'],
    icon: '🇯🇵',
  },
  {
    id: 'kodiaq-17',
    make: 'Skoda', model: 'Kodiaq', generation: '2017–2021',
    budget: ['upper'],
    purpose: ['family', 'offroad'],
    body: ['suv', 'minivan'],
    fuel: ['gasoline', 'diesel'],
    priceRange: '$18 000–25 000',
    scores: { reliability: 7, economy: 8, comfort: 9, dynamics: 6, safety: 9 },
    pros: ['7 місць', 'Відмінний інтер\'єр', 'Активні системи безпеки', 'Великий багажник'],
    cons: ['DSG — ненадійна', 'Дорогий ремонт', 'Запчастини дорогі'],
    watchOut: ['DSG 7 (DQ200) — обов\'язково перевір', 'TSI мотор — коксування', 'Пневмопідвіска — дорога'],
    icon: '🇨🇿',
  },
  {
    id: 'passat-b8',
    make: 'Volkswagen', model: 'Passat B8', generation: '2015–2020',
    budget: ['upper'],
    purpose: ['daily', 'status', 'economy'],
    body: ['sedan', 'hatch'],
    fuel: ['gasoline', 'diesel'],
    priceRange: '$15 000–22 000',
    scores: { reliability: 7, economy: 8, comfort: 9, dynamics: 7, safety: 9 },
    pros: ['Представницький салон', 'Комфортна їзда', 'Хороші системи безпеки'],
    cons: ['Дорогий у ремонті', 'DSG проблеми', 'Дорогі запчастини VAG'],
    watchOut: ['DSG — перевіряй', 'Типова іржа порогів Passat', 'Сервісна книжка обов\'язкова'],
    icon: '🇩🇪',
  },

  // ════════ PREMIUM BUDGET ════════
  {
    id: 'rav4-20',
    make: 'Toyota', model: 'RAV4', generation: '2019+',
    budget: ['premium'],
    purpose: ['family', 'offroad', 'daily'],
    body: ['suv'],
    fuel: ['gasoline', 'hybrid'],
    priceRange: '$28 000–38 000',
    scores: { reliability: 9, economy: 8, comfort: 9, dynamics: 6, safety: 10 },
    pros: ['Нове покоління — агресивний дизайн', 'Найкращий клас безпеки', 'Надійний гібрид 40 MPG', 'Великий ресурс'],
    cons: ['Висока ціна', 'CVT гібрида — специфіка', 'Запчастини поки дорогі'],
    watchOut: ['Перевір VIN — популярний для ДТП', 'Дивись стан батареї гібрида'],
    icon: '🇯🇵',
  },
  {
    id: 'camry-21',
    make: 'Toyota', model: 'Camry', generation: '2021+',
    budget: ['premium'],
    purpose: ['daily', 'status', 'family'],
    body: ['sedan'],
    fuel: ['gasoline', 'hybrid'],
    priceRange: '$28 000–38 000',
    scores: { reliability: 10, economy: 8, comfort: 10, dynamics: 7, safety: 10 },
    pros: ['Розкішний салон нового покоління', 'Безпека 5★', 'Гібрид — дуже економний', 'Легендарна надійність Toyota'],
    cons: ['Максимальна ціна в класі', 'Тільки для тих кому не потрібен SUV'],
    watchOut: ['Ринок UA — часто з США, перевіряй CARFAX', 'Гібрид — стан батареї'],
    icon: '🇯🇵',
  },
  {
    id: 'sportage-22',
    make: 'Kia', model: 'Sportage', generation: '2022+',
    budget: ['premium'],
    purpose: ['daily', 'family', 'offroad'],
    body: ['suv'],
    fuel: ['gasoline', 'hybrid'],
    priceRange: '$26 000–34 000',
    scores: { reliability: 8, economy: 8, comfort: 9, dynamics: 7, safety: 10 },
    pros: ['Топовий дизайн нового покоління', 'Технологічний салон', 'Повний набір безпеки'],
    cons: ['Ще молодий — мало відгуків про ресурс', 'Дорогий', 'Підвіска трохи жорстка'],
    watchOut: ['Нове авто — менше ризиків, але перевір ДТП'],
    icon: '🇰🇷',
  },
];

/**
 * Підбирає топ-3 авто під параметри
 * @param {{ budget, purpose, body, fuel, priority }} prefs
 * @returns {Car[]} — відсортований список максимум 3 авто
 */
export function pickCars(prefs) {
  const { budget, purpose, body, fuel, priority } = prefs;

  const scored = CARS.map(car => {
    let score = 0;

    // Hard filters — must match
    const budgetMatch  = car.budget.includes(budget);
    const purposeMatch = car.purpose.includes(purpose);
    const bodyMatch    = car.body.includes(body);
    const fuelMatch    = car.fuel.includes(fuel);

    // Count matches — more matches = higher chance of recommendation
    if (budgetMatch)  score += 40;
    if (purposeMatch) score += 25;
    if (bodyMatch)    score += 20;
    if (fuelMatch)    score += 15;

    // Priority score
    const ps = car.scores;
    if (priority && ps[priority] !== undefined) {
      score += ps[priority] * 3; // Weight priority score heavily
    }

    // Total scores bonus
    const avg = Object.values(ps).reduce((a, b) => a + b, 0) / Object.values(ps).length;
    score += avg * 1.5;

    return { ...car, _score: score, _matches: { budgetMatch, purposeMatch, bodyMatch, fuelMatch } };
  });

  // Must match budget at minimum
  const budgetFiltered = scored.filter(c => c._matches.budgetMatch);

  // Sort by score
  budgetFiltered.sort((a, b) => b._score - a._score);

  // Return top 3
  return budgetFiltered.slice(0, 3);
}
