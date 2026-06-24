// ============================================================
//  FreeCar Top — UA Market Data
//  Static price database + model weaknesses for simulation
//  Prices: average USD from AUTO.RIA/OLX, June 2025
// ============================================================

// ── Normalize make/model to lookup key ──────────────────────
function norm(s) {
  return (s || '').toLowerCase().trim().replace(/[-\s/\.]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function getMarketKey(make, model) {
  return norm(make) + '_' + norm(model);
}

// Fuzzy aliases: handles common user inputs that differ from canonical key
const KEY_ALIASES = {
  // BMW
  bmw_5series:          'bmw_5_series',
  bmw_5_series_f10:     'bmw_5_series',
  bmw_5_series_g30:     'bmw_5_series',
  bmw_530d:             'bmw_5_series',
  bmw_528i:             'bmw_5_series',
  bmw_520d:             'bmw_5_series',
  bmw_3series:          'bmw_3_series',
  bmw_3_series_f30:     'bmw_3_series',
  bmw_320i:             'bmw_3_series',
  bmw_328i:             'bmw_3_series',
  bmw_320d:             'bmw_3_series',
  // Toyota
  toyota_rav_4:         'toyota_rav4',
  toyota_land_cruiser:  'toyota_land_cruiser_prado',
  toyota_prado:         'toyota_land_cruiser_prado',
  toyota_lc_prado:      'toyota_land_cruiser_prado',
  toyota_lc_200:        'toyota_land_cruiser_200',
  toyota_land_cruiser_200_series: 'toyota_land_cruiser_200',
  // Honda
  honda_cr_v:           'honda_crv',
  honda_crv_5th:        'honda_crv',
  // Nissan
  nissan_x_trail_t32:   'nissan_x_trail',
  nissan_xtrail:        'nissan_x_trail',
  nissan_rogue_sport:   'nissan_rogue',
  // Mercedes
  mercedes_benz_c_class:    'mercedes_c_class',
  mercedes_benz_e_class:    'mercedes_e_class',
  mercedes_c:           'mercedes_c_class',
  mercedes_e:           'mercedes_e_class',
  mercedes_benz_gle:    'mercedes_gle',
  // Audi
  audi_q_5:             'audi_q5',
  audi_a_4:             'audi_a4',
  audi_a_6:             'audi_a6',
  // VW
  volkswagen_passat_b8: 'volkswagen_passat',
  volkswagen_golf_7:    'volkswagen_golf',
  volkswagen_golf_8:    'volkswagen_golf',
  volkswagen_tiguan_2:  'volkswagen_tiguan',
  // Hyundai/Kia
  hyundai_tucson_3:     'hyundai_tucson',
  kia_sportage_4:       'kia_sportage',
  // Subaru
  subaru_outback_bs:    'subaru_outback',
  subaru_forester_sj:   'subaru_forester',
  subaru_forester_sk:   'subaru_forester',
};

export function resolveMarketKey(make, model) {
  const raw = getMarketKey(make, model);
  if (MARKET_PRICES[raw]) return raw;
  if (KEY_ALIASES[raw])   return KEY_ALIASES[raw];

  // Partial match: scan keys for prefix match on make + model fragment
  const makeNorm = norm(make);
  const modelNorm = norm(model);
  for (const key of Object.keys(MARKET_PRICES)) {
    if (key.startsWith(makeNorm + '_') && key.includes(modelNorm.slice(0, 4))) return key;
  }
  return null;
}

// ── Market price table (USD, AUTO.RIA/OLX average, June 2025) ──

export const MARKET_PRICES = {
  toyota_camry: {
    2012: 8000,  2013: 9500,  2014: 11000,
    2015: 12500, 2016: 14000, 2017: 16000,
    2018: 19500, 2019: 22000, 2020: 26000,
    2021: 30000, 2022: 35000,
  },
  toyota_rav4: {
    2013: 13500, 2014: 15000, 2015: 17000,
    2016: 19000, 2017: 21500, 2018: 24500,
    2019: 27500, 2020: 31000, 2021: 36000, 2022: 41000,
  },
  toyota_corolla: {
    2014: 8000,  2015: 9000,  2016: 10000,
    2017: 11500, 2018: 13000, 2019: 15500,
    2020: 18000, 2021: 21000, 2022: 24500,
  },
  toyota_highlander: {
    2014: 17000, 2015: 19500, 2016: 22000,
    2017: 24000, 2018: 27500, 2019: 31500,
    2020: 36000, 2021: 41000,
  },
  toyota_land_cruiser_prado: {
    2013: 27000, 2014: 29000, 2015: 32000,
    2016: 36000, 2017: 40000, 2018: 45000,
    2019: 50000, 2020: 57000, 2021: 64000,
  },
  toyota_land_cruiser_200: {
    2012: 38000, 2014: 46000, 2016: 57000,
    2018: 68000, 2020: 78000, 2021: 88000,
  },
  honda_crv: {
    2014: 12000, 2015: 13500, 2016: 15500,
    2017: 17500, 2018: 20000, 2019: 23000,
    2020: 26500, 2021: 30000,
  },
  honda_accord: {
    2014: 9000,  2015: 10500, 2016: 11500,
    2017: 13500, 2018: 15500, 2019: 17500,
    2020: 20500, 2021: 24000,
  },
  bmw_3_series: {
    2013: 9500,  2014: 11000, 2015: 13000,
    2016: 15500, 2017: 18000, 2018: 22000,
    2019: 26000, 2020: 31000, 2021: 36000,
  },
  bmw_5_series: {
    2013: 11000, 2014: 13000, 2015: 15500,
    2016: 18000, 2017: 22000, 2018: 27000,
    2019: 33000, 2020: 40000, 2021: 46000,
  },
  bmw_x5: {
    2014: 23000, 2015: 26000, 2016: 29000,
    2017: 34000, 2018: 41000, 2019: 49000,
    2020: 58000, 2021: 67000,
  },
  bmw_x3: {
    2015: 16000, 2016: 18500, 2017: 22000,
    2018: 28000, 2019: 33500, 2020: 40000,
  },
  mercedes_c_class: {
    2015: 15000, 2016: 18000, 2017: 22000,
    2018: 26000, 2019: 30000, 2020: 35500,
    2021: 42000,
  },
  mercedes_e_class: {
    2015: 18000, 2016: 21500, 2017: 27000,
    2018: 31500, 2019: 37000, 2020: 44000,
    2021: 52000,
  },
  mercedes_gle: {
    2015: 31000, 2016: 36000, 2017: 42000,
    2018: 49000, 2019: 57000, 2020: 66000,
    2021: 77000,
  },
  audi_a4: {
    2015: 13000, 2016: 16500, 2017: 20000,
    2018: 24000, 2019: 28500, 2020: 34000,
    2021: 40500,
  },
  audi_a6: {
    2014: 14500, 2015: 17000, 2016: 20000,
    2017: 24000, 2018: 29000, 2019: 35000,
    2020: 43000,
  },
  audi_q5: {
    2016: 22000, 2017: 26000, 2018: 31000,
    2019: 37000, 2020: 44500, 2021: 53000,
  },
  volkswagen_passat: {
    2015: 11000, 2016: 12500, 2017: 14500,
    2018: 17500, 2019: 21000, 2020: 25000,
  },
  volkswagen_tiguan: {
    2016: 15500, 2017: 18000, 2018: 21500,
    2019: 26000, 2020: 30000, 2021: 35000,
  },
  volkswagen_golf: {
    2015: 9000,  2016: 10500, 2017: 12500,
    2018: 15000, 2019: 18500, 2020: 22000,
  },
  skoda_octavia: {
    2015: 9000,  2016: 10500, 2017: 12000,
    2018: 14500, 2019: 18000, 2020: 21500,
    2021: 25500,
  },
  skoda_superb: {
    2016: 15000, 2017: 17500, 2018: 21000,
    2019: 25000, 2020: 29500, 2021: 35000,
  },
  hyundai_tucson: {
    2016: 12000, 2017: 14000, 2018: 16500,
    2019: 20500, 2020: 25000, 2021: 30000,
  },
  hyundai_santa_fe: {
    2016: 15500, 2017: 18000, 2018: 21500,
    2019: 26000, 2020: 31000, 2021: 37000,
  },
  kia_sportage: {
    2016: 11500, 2017: 13500, 2018: 16000,
    2019: 19500, 2020: 23500, 2021: 28000,
  },
  kia_stinger: {
    2017: 15000, 2018: 18000, 2019: 21500,
    2020: 25500, 2021: 30000,
  },
  subaru_outback: {
    2015: 16000, 2016: 18000, 2017: 20000,
    2018: 22500, 2019: 26500, 2020: 31000,
    2021: 36500,
  },
  subaru_forester: {
    2014: 13500, 2015: 15500, 2016: 17500,
    2017: 19500, 2018: 22500, 2019: 26000,
    2020: 30000, 2021: 35000,
  },
  nissan_x_trail: {
    2014: 12500, 2015: 14000, 2016: 15500,
    2017: 17500, 2018: 20500, 2019: 24000,
    2020: 28000, 2021: 32500,
  },
  nissan_rogue: {
    2015: 12000, 2016: 13500, 2017: 15500,
    2018: 18000, 2019: 21500, 2020: 25500,
  },
};

// ── Model-specific annual depreciation rates [y1..y5] ────────
// Derived from market price table + UA demand data
export const DEPRECIATION_PROFILES = {
  toyota_camry:              [0.09, 0.08, 0.07, 0.06, 0.05],
  toyota_rav4:               [0.10, 0.09, 0.08, 0.07, 0.06],
  toyota_corolla:            [0.10, 0.09, 0.08, 0.07, 0.06],
  toyota_highlander:         [0.10, 0.09, 0.08, 0.07, 0.06],
  toyota_land_cruiser_prado: [0.07, 0.06, 0.06, 0.05, 0.04],
  toyota_land_cruiser_200:   [0.06, 0.05, 0.05, 0.04, 0.04],
  honda_crv:                 [0.11, 0.10, 0.09, 0.08, 0.07],
  honda_accord:              [0.11, 0.10, 0.09, 0.08, 0.07],
  bmw_3_series:              [0.16, 0.14, 0.12, 0.11, 0.09],
  bmw_5_series:              [0.17, 0.15, 0.13, 0.12, 0.10],
  bmw_x5:                    [0.15, 0.13, 0.12, 0.11, 0.10],
  bmw_x3:                    [0.15, 0.13, 0.12, 0.11, 0.09],
  mercedes_c_class:          [0.16, 0.14, 0.12, 0.11, 0.10],
  mercedes_e_class:          [0.17, 0.15, 0.13, 0.12, 0.10],
  mercedes_gle:              [0.14, 0.13, 0.12, 0.11, 0.09],
  audi_a4:                   [0.15, 0.13, 0.12, 0.11, 0.09],
  audi_a6:                   [0.16, 0.14, 0.13, 0.12, 0.10],
  audi_q5:                   [0.15, 0.13, 0.12, 0.11, 0.09],
  volkswagen_passat:         [0.13, 0.12, 0.10, 0.09, 0.08],
  volkswagen_tiguan:         [0.13, 0.12, 0.10, 0.09, 0.08],
  volkswagen_golf:           [0.12, 0.11, 0.10, 0.09, 0.08],
  skoda_octavia:             [0.11, 0.10, 0.09, 0.08, 0.07],
  skoda_superb:              [0.12, 0.11, 0.10, 0.09, 0.08],
  hyundai_tucson:            [0.12, 0.11, 0.10, 0.09, 0.08],
  hyundai_santa_fe:          [0.12, 0.11, 0.10, 0.09, 0.08],
  kia_sportage:              [0.12, 0.11, 0.10, 0.09, 0.08],
  kia_stinger:               [0.14, 0.13, 0.12, 0.11, 0.10],
  subaru_outback:            [0.11, 0.10, 0.09, 0.08, 0.07],
  subaru_forester:           [0.11, 0.10, 0.09, 0.08, 0.07],
  nissan_x_trail:            [0.12, 0.11, 0.10, 0.10, 0.09],
  nissan_rogue:              [0.12, 0.11, 0.10, 0.10, 0.09],
};

// ── Known model weaknesses (for AI prompt enrichment) ────────
export const MODEL_WEAKNESSES = {
  toyota_camry: {
    engines:  ['2AZ-FE 2.4L', '2GR-FE 3.5L', 'A25A-FXS Hybrid'],
    issues: [
      '2AZ-FE: масловживання після 120k км ($0-300 долив), натяжник ланцюга ($200-400)',
      'Рульова рейка: закисання в UA умовах — $300-600',
      'Передні амортизатори: 100-130k км — $400-600 пара',
      'Клапанні сальники: після 100k — $150-300',
    ],
    strengths: 'АКПП U660E служить 250k+ без капремонту. Один з найнадійніших UA ринку.',
    avgCosts: { y1: 200, y3: 500, y5: 900 },
  },
  toyota_rav4: {
    engines: ['2AZ-FE 2.4L', '2GR-FKS 3.5L', 'A25A-FXS Hybrid'],
    issues: [
      '2AZ-FE: масловживання — аналогічно Camry',
      'Передня підвіска: кульові опори, стійки від 80k — $200-400',
      'Роздавальна коробка: обслуговування кожні 40k важливо',
    ],
    strengths: 'Рамна конструкція і надійний привод. Топ UA ринку за сукупністю якостей.',
    avgCosts: { y1: 250, y3: 600, y5: 1100 },
  },
  bmw_5_series: {
    engines: ['N52 2.5/3.0', 'N54 3.0T', 'N55 3.0T', 'N63 4.4TT', 'N57 3.0d'],
    issues: [
      'N54/N55: HPFP паливний насос ($600-1200), патрубок інтеркулера ($200)',
      'Система охолодження: термостат + помпа кожні 60-80k — $400-700',
      'N57d: свічки розжарювання, завихрювачі, EGR клапан ($400-800)',
      'Ланцюг ГРМ N63: рекомендовано до 60k — $1500-2500',
      'VANOS: клацання на холодну, гідроопори ($600-1000)',
    ],
    strengths: 'АКПП 8HP ZF надійна. При правильному обслуговуванні — 200k без проблем.',
    avgCosts: { y1: 500, y3: 1200, y5: 2500 },
  },
  bmw_3_series: {
    engines: ['N20 2.0T', 'N52 2.5/3.0', 'N55 3.0T', 'B48 2.0T', 'N47d 2.0d'],
    issues: [
      'N47d: ланцюг ГРМ ззаду двигуна! Замінити до 100k — $2000-3500',
      'N20: помпа водяна, термостат кожні 60k — $400-600',
      'B48: надійніший, але своєчасне ТО критично',
      'Рульова рейка EPS: течі від 80k — $800-1500',
    ],
    strengths: 'B48 + АКПП 8HP — найкраща комбінація. Уникай N47d після 90k.',
    avgCosts: { y1: 400, y3: 900, y5: 2000 },
  },
  bmw_x5: {
    engines: ['N55 3.0T', 'N57 3.0d', 'N63 4.4TT', 'B58 3.0T'],
    issues: [
      'Пневмопідвіска: компресор $600-1000, ресивер $400 (кожні 80-100k)',
      'N57: DPF регенерація, EGR клапан, форсунки дизельні $400-800',
      'Роздавальна коробка: соленоїд від 100k — $400-700',
      'N63: масловживання, вакуумна система — дорогий мотор',
    ],
    strengths: 'Потужний і комфортний. Бюджет на обслуговування $1000-2000/рік.',
    avgCosts: { y1: 700, y3: 1800, y5: 3500 },
  },
  mercedes_c_class: {
    engines: ['M274 2.0T', 'M270 1.6T', 'OM651 2.1d', 'M276 3.0'],
    issues: [
      'M274: ланцюг ГРМ СПЕРЕДІ — заміна до 80k ($1200-2000) і помпа кожні 60k',
      'OM651: балансировочний вал ($600-1200), EGR, форсунки',
      '7G-Tronic: ATF заміна кожні 60k критична для ресурсу',
      'Електрика: після 80k — зручний сервіс потрібен',
    ],
    strengths: 'Статусний автомобіль. M274 при обслуговуванні надійний.',
    avgCosts: { y1: 500, y3: 1300, y5: 2800 },
  },
  mercedes_e_class: {
    engines: ['M274 2.0T', 'M276 3.0', 'OM651 2.2d', 'OM654 2.0d'],
    issues: [
      'M274: ланцюг ГРМ ($1000-2000) — та сама проблема що у C-Class',
      'OM651: складний мотор, форсунки від 150k ($700-1500), DPF',
      'OM654: значно надійніший, рекомендований',
      '9G-Tronic: якість ATF критична, заміна кожні 60k',
    ],
    strengths: 'OM654 дизель + 9G-Tronic — найкраща комбінація для UA.',
    avgCosts: { y1: 600, y3: 1500, y5: 3000 },
  },
  audi_a4: {
    engines: ['EA888 1.8TFSI', 'EA888 2.0TFSI', 'TDI 2.0'],
    issues: [
      'EA888 Gen1/2: масловживання (0.3-0.5L/1000km), ланцюг ГРМ ($400-900)',
      'DSG DQ200 7-ступінь сухий: ривки при рушанні, мехатроніка $700-1500',
      'DSG DQ250 6-ступінь мокрий: надійніший, ATF кожні 60k',
      'TDI: ремінь ГРМ СТРОГО по регламенту! Форсунки, DPF після 150k',
      'Quattro Haldex: обслуговування кожні 40k',
    ],
    strengths: 'DQ250 + EA888 Gen3 — найкраща комбінація. Уникай DQ200 на пробках.',
    avgCosts: { y1: 500, y3: 1100, y5: 2200 },
  },
  audi_q5: {
    engines: ['EA888 2.0TFSI', 'TDI 2.0', 'TDI 3.0'],
    issues: [
      'EA888: ланцюг ГРМ, масловживання — аналогічно A4',
      'Quattro Torsen/Haldex: обслуговування кожні 40k важливо',
      'DSG: DQ200 ті ж проблеми',
    ],
    strengths: 'Практичний кросовер. Обирай TDI + S-tronic 7-ступінь.',
    avgCosts: { y1: 600, y3: 1300, y5: 2500 },
  },
  volkswagen_passat: {
    engines: ['EA888 1.8TSI', 'EA888 2.0TSI', 'TDI 2.0'],
    issues: [
      'EA888: ланцюг ГРМ ($400-700), масловживання 0.3-0.5L/1000km',
      'DSG DQ200 7-ступінь: ривки при рушанні, мехатроніка $800-1500',
      'Кузов: іржа! Арки і пороги на EU-автомобілях',
      'Підрамник: закисання болтів у UA умовах — $200-400',
    ],
    strengths: 'Практичний і просторий. 2.0 TDI + DQ250 — найнадійніша версія.',
    avgCosts: { y1: 450, y3: 1000, y5: 2100 },
  },
  volkswagen_golf: {
    engines: ['EA111 1.2/1.4TSI', 'EA888 1.8/2.0TSI', 'TDI 2.0'],
    issues: [
      'EA111 1.2TSI: ланцюг ГРМ ($600-1000) — критично після 60k',
      '1.4TSI EA211: надійніший, але помпа кожні 60k',
      'DSG DQ200 7-ступінь: знайомі проблеми з сухим зчепленням',
    ],
    strengths: '1.4TSI + механіка або DQ250 — оптимально. Практичний хетчбек.',
    avgCosts: { y1: 350, y3: 800, y5: 1600 },
  },
  skoda_octavia: {
    engines: ['EA111 1.2TSI', 'EA888 1.8TSI', 'TDI 2.0'],
    issues: [
      'EA111 1.2TSI: ланцюг ГРМ — критично (той самий що Golf)',
      'DSG DQ200: аналогічні ризики VW Group',
      'Підвіска: ресурсна, але якість обслуговування важлива',
    ],
    strengths: 'Найкраще співвідношення ціна/якість сегменту. Рекомендовано.',
    avgCosts: { y1: 300, y3: 700, y5: 1400 },
  },
  honda_crv: {
    engines: ['R20A 2.0', 'K24 2.4', 'L15B7 1.5T'],
    issues: [
      'L15B7 1.5T (2017-2020): розбавлення масла бензином в холодному кліматі — КРИТИЧНО для UA зим!',
      'CVT: ресурс 160-200k, заміна $1500-2500',
      'Задня підвіска: важелі від 100k — $300-500',
    ],
    strengths: 'R20A і K24 мотори винятково надійні. Для UA обирай до 2017 або 2020+.',
    avgCosts: { y1: 250, y3: 700, y5: 1500 },
  },
  hyundai_tucson: {
    engines: ['G4KD 2.0 MPI', 'G4NA 2.0 GDI', 'D4HA 2.0 CRDI'],
    issues: [
      'G4NA Theta II GDI 2.0: ризик задиру поршнів і клинення мотору! Рекламаційна програма Hyundai',
      'GDI: карбонові відкладення на впуску — промивка кожні 50k',
      'Задні гальмівні диски: швидко іржавіють у UA умовах — $150-250',
    ],
    strengths: 'Дизельна версія D4HA значно надійніша за G4NA GDI.',
    avgCosts: { y1: 350, y3: 800, y5: 1600 },
  },
  kia_sportage: {
    engines: ['G4KD 2.0 MPI', 'G4NA 2.0 GDI', 'D4HA 2.0 CRDI'],
    issues: [
      'G4NA Theta II GDI: той самий ризик що у Tucson — задир/клинення двигуна',
      'АКПП 6-ступінь: ATF заміна кожні 60k важлива',
    ],
    strengths: 'Практичний кросовер. 2.0 MPI АКПП надійніший за GDI версії.',
    avgCosts: { y1: 300, y3: 750, y5: 1500 },
  },
  subaru_outback: {
    engines: ['EJ255 2.5', 'FB25 2.5', 'FA24DIT 2.4T'],
    issues: [
      'EJ255/EJ25: прокладка ГБЦ ($600-1200) — класична проблема Subaru',
      'Масловживання EJ: 0.3-0.8L/1000km — нормально для боксерів',
      'CVT Lineartronic: заміна після 160k — $2000-3500',
      'FB25: надійніший за EJ, але CVT ризик залишається',
    ],
    strengths: 'FA24DIT 2020+ найнадійніший двигун в лінійці. Унікальний повнопривод.',
    avgCosts: { y1: 400, y3: 950, y5: 2000 },
  },
  subaru_forester: {
    engines: ['EJ20 2.0', 'EJ25 2.5', 'FB20 2.0', 'FB25 2.5'],
    issues: [
      'EJ20/EJ25: прокладка ГБЦ ($600-1200) — перевіряй антифриз',
      'CVT: заміна від 150k — $2000-3000',
    ],
    strengths: 'FB20/FB25 мотори значно надійніші за EJ. CVT — ключовий ризик.',
    avgCosts: { y1: 350, y3: 850, y5: 1800 },
  },
  nissan_x_trail: {
    engines: ['MR20DE 2.0', 'QR25DE 2.5', 'M9R 2.0d'],
    issues: [
      'CVT Jatco RE0F09B: масове ламання після 100-140k км! Заміна $2000-4000',
      'MR20DE: ланцюг ГРМ, масловживання після 120k',
      'Система 4WD ALL MODE: кутова передача, обслуговування кожні 40k',
    ],
    strengths: 'Доступна ціна. CVT — головний ризик. З механікою значно надійніший.',
    avgCosts: { y1: 300, y3: 900, y5: 2200 },
  },
  nissan_rogue: {
    engines: ['QR25DE 2.5', 'MR20DE 2.0'],
    issues: [
      'CVT Jatco: аналогічна проблема що і X-Trail',
      'Авто з США: перевіряй підраму і порогові балки на корозію',
    ],
    strengths: 'USA-версія часом дешевша при ввезенні. CVT — ключовий ризик.',
    avgCosts: { y1: 350, y3: 900, y5: 2000 },
  },
};

// ── Market news (curated, UA-focused) ───────────────────────
export const MARKET_NEWS = [
  {
    date:     '2025-06',
    category: 'ціни',
    title:    'Toyota Camry та RAV4 — ціни стабільно зростають',
    summary:  'Попит на "надійні японці" зміцнів. Camry XV55 2017р. тримається на $15k-17k. RAV4 CA40 — мінімальна амортизація серед кросоверів.',
    impact:   'positive',
    keys:     ['toyota_camry', 'toyota_rav4'],
    emoji:    '📈',
  },
  {
    date:     '2025-05',
    category: 'технічне',
    title:    'Hyundai/Kia Theta II GDI — нагадування про ризик',
    summary:  'G4NA 2.0 GDI (Tucson 2016-2019, Sportage 2016-2018) — ризик клинення двигуна. Перевірте рекламаційну програму. Ціни нижчі за ринок через репутацію.',
    impact:   'negative',
    keys:     ['hyundai_tucson', 'kia_sportage'],
    emoji:    '⚠️',
  },
  {
    date:     '2025-05',
    category: 'імпорт',
    title:    'BMW F-серія і Mercedes W205/W213 — нові партії з ЄС',
    summary:  'Черговий потік авто з Литви та Польщі. BMW F10 5-серія і Mercedes C-Class W205 — ціни на $1,500-3,000 нижче ніж у березні.',
    impact:   'positive',
    keys:     ['bmw_5_series', 'mercedes_c_class'],
    emoji:    '🚢',
  },
  {
    date:     '2025-04',
    category: 'технічне',
    title:    'CVT Jatco у Nissan — масові відмови після 100k',
    summary:  'X-Trail T32 і Rogue 2014-2018 з варіатором RE0F09B/CF8A. Заміна CVT — $2000-4000. Ціни впали на $1,500-2,500 з початку 2025.',
    impact:   'negative',
    keys:     ['nissan_x_trail', 'nissan_rogue'],
    emoji:    '💀',
  },
  {
    date:     '2025-04',
    category: 'ринок',
    title:    'Honda CR-V 1.5T (2017-2020) — небезпечна для UA зими',
    summary:  'Розбавлення масла бензином при часто коротких поїздках в холодну погоду. Honda не вирішила повністю. UA зима — ідеальні умови для дефекту.',
    impact:   'negative',
    keys:     ['honda_crv'],
    emoji:    '🥶',
  },
  {
    date:     '2025-03',
    category: 'ціни',
    title:    'Skoda Octavia A7 — лідер ціна/якість 2025',
    summary:  'Октавія залишається кращим вибором у сегменті $9k-18k. Малий пробіг EU + 1.8TSI + DSG DQ250 — золотий стандарт.',
    impact:   'positive',
    keys:     ['skoda_octavia'],
    emoji:    '🏆',
  },
  {
    date:     '2025-03',
    category: 'ринок',
    title:    'BMW N47d: нагадуйте про ланцюг ГРМ',
    summary:  'N47 дизельний мотор в BMW 3 Series (F30) і 5 Series (F10) — ланцюг ГРМ ззаду двигуна. До 100k обов\'язково. Ціна питання $2000-3500.',
    impact:   'negative',
    keys:     ['bmw_3_series', 'bmw_5_series'],
    emoji:    '⛓',
  },
  {
    date:     '2025-02',
    category: 'ціни',
    title:    'Land Cruiser Prado 150 — дефіцит тримає ціну',
    summary:  'Prado 2015-2019 в хорошому стані коштує $32k-45k. Попит перевищує пропозицію. Одне з небагатьох авто що не дешевшає.',
    impact:   'positive',
    keys:     ['toyota_land_cruiser_prado'],
    emoji:    '💎',
  },
];

// ── Lookup helpers ───────────────────────────────────────────

export function getMarketPrice(make, model, carYear) {
  const key = resolveMarketKey(make, model);
  if (!key) return null;
  const table = MARKET_PRICES[key];
  if (!table) return null;
  const year = parseInt(carYear);
  if (table[year]) return { avg: table[year], key };

  // Interpolate between adjacent years
  const years = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (year < years[0])  return { avg: table[years[0]], key, note: 'oldest' };
  if (year > years[years.length - 1]) return { avg: table[years[years.length - 1]], key, note: 'newest' };

  const lo  = years.reduce((prev, y) => (y <= year ? y : prev), years[0]);
  const hi  = years.find(y => y > year) ?? years[years.length - 1];
  if (lo === hi) return { avg: table[lo], key };

  const t   = (year - lo) / (hi - lo);
  const avg = Math.round(table[lo] + t * (table[hi] - table[lo]));
  return { avg, key };
}

export function getDepreciation(make, model) {
  const key = resolveMarketKey(make, model);
  return key ? (DEPRECIATION_PROFILES[key] ?? null) : null;
}

export function getWeaknesses(make, model) {
  const key = resolveMarketKey(make, model);
  return key ? (MODEL_WEAKNESSES[key] ?? null) : null;
}

export function getWeaknessPromptText(make, model) {
  const w = getWeaknesses(make, model);
  if (!w) return '';
  return [
    `\nВІДОМІ СЛАБКІ МІСЦЯ ${make.toUpperCase()} ${model.toUpperCase()}:`,
    `Двигуни: ${w.engines.join(', ')}`,
    ...w.issues.map(i => `- ${i}`),
    `Переваги: ${w.strengths}`,
    `Середні витрати: р.1 ~$${w.avgCosts.y1}, р.3 ~$${w.avgCosts.y3}, р.5 ~$${w.avgCosts.y5}`,
  ].join('\n');
}

// Returns news items relevant to a make/model
export function getNewsForModel(make, model) {
  const key = resolveMarketKey(make, model);
  if (!key) return MARKET_NEWS.slice(0, 4);
  const relevant = MARKET_NEWS.filter(n => n.keys.includes(key));
  const other    = MARKET_NEWS.filter(n => !n.keys.includes(key));
  return [...relevant, ...other].slice(0, 6);
}

// Popular models list for the market dashboard
export const POPULAR_MODELS = [
  { make: 'Toyota',     model: 'Camry',      key: 'toyota_camry',              emoji: '🇯🇵', badge: 'Топ продаж' },
  { make: 'Toyota',     model: 'RAV4',       key: 'toyota_rav4',               emoji: '🇯🇵', badge: 'Мін. знос' },
  { make: 'Toyota',     model: 'Land Cruiser Prado', key: 'toyota_land_cruiser_prado', emoji: '🇯🇵', badge: 'Дефіцит' },
  { make: 'Skoda',      model: 'Octavia',    key: 'skoda_octavia',             emoji: '🇨🇿', badge: 'Ціна/якість' },
  { make: 'BMW',        model: '5 Series',   key: 'bmw_5_series',              emoji: '🇩🇪', badge: 'Преміум' },
  { make: 'BMW',        model: '3 Series',   key: 'bmw_3_series',              emoji: '🇩🇪', badge: '' },
  { make: 'Mercedes',   model: 'E-Class',    key: 'mercedes_e_class',          emoji: '🇩🇪', badge: '' },
  { make: 'Volkswagen', model: 'Passat',     key: 'volkswagen_passat',         emoji: '🇩🇪', badge: '' },
  { make: 'Hyundai',    model: 'Tucson',     key: 'hyundai_tucson',            emoji: '🇰🇷', badge: '⚠️ G4NA' },
  { make: 'Honda',      model: 'CR-V',       key: 'honda_crv',                 emoji: '🇯🇵', badge: '' },
  { make: 'Audi',       model: 'A4',         key: 'audi_a4',                   emoji: '🇩🇪', badge: '' },
  { make: 'Subaru',     model: 'Outback',    key: 'subaru_outback',            emoji: '🇯🇵', badge: '' },
  { make: 'Nissan',     model: 'X-Trail',    key: 'nissan_x_trail',            emoji: '🇯🇵', badge: '⚠️ CVT' },
  { make: 'Kia',        model: 'Sportage',   key: 'kia_sportage',              emoji: '🇰🇷', badge: '' },
  { make: 'Volkswagen', model: 'Tiguan',     key: 'volkswagen_tiguan',         emoji: '🇩🇪', badge: '' },
];
