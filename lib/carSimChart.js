// Pure functions for SVG chart generation — no React deps

/**
 * Converts array of year prices into SVG polyline points strings.
 * @param {number[]} prices  — array length SIM_YEARS+1 (index 0 = purchase price)
 * @param {number}   upTo    — draw solid line only up to this year index (inclusive)
 * @param {number}   W       — SVG viewBox width
 * @param {number}   H       — SVG viewBox height
 * @param {number}   maxP    — max price for Y-axis scaling
 * @returns {{ solid: string, dashed: string, points: string[], toX: Function, toY: Function }}
 */
export function buildChartPoints(prices, upTo, W, H, maxP) {
  const PAD = { top: 10, bottom: 10, left: 8, right: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = prices.length - 1;

  const toX = (i) => PAD.left + (i / n) * innerW;
  const toY = (p) => PAD.top + (1 - p / maxP) * innerH;

  const pts = prices.map((p, i) => `${toX(i)},${toY(p)}`);

  return {
    solid: pts.slice(0, upTo + 1).join(' '),
    dashed: pts.slice(upTo).join(' '),
    points: pts,
    toX,
    toY,
  };
}

/**
 * Returns event dot positions for years that have expensive events (cost > 400).
 * @param {object[]} years  — simData.years array
 * @param {number[]} prices — same prices array used in buildChartPoints
 * @param {Function} toX    — x-coordinate function from buildChartPoints
 * @param {Function} toY    — y-coordinate function from buildChartPoints
 */
export function buildEventDots(years, prices, toX, toY) {
  const dots = [];
  for (let i = 1; i < years.length; i++) {
    const expensiveEvents = (years[i].events ?? []).filter(e => (e.cost ?? 0) > 400);
    if (expensiveEvents.length > 0) {
      const totalCost = expensiveEvents.reduce((s, e) => s + e.cost, 0);
      const r = Math.min(8, Math.max(4, 4 + totalCost / 800));
      dots.push({ cx: toX(i), cy: toY(prices[i]), r, cost: totalCost, year: i });
    }
  }
  return dots;
}
