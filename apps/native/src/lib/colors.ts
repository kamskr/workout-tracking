/**
 * Color interpolation for the muscle heatmap.
 *
 * Maps a volume percentage (0-100) to a CSS hex color string.
 * 0% → light gray (#f3f4f6), 100% → saturated blue (#2563eb).
 *
 * Ported from apps/web/src/lib/colors.ts — identical pure math logic.
 */

const STOPS: [number, [number, number, number]][] = [
  [0, [243, 244, 246]],   // #f3f4f6 — gray-100
  [25, [191, 219, 254]],  // #bfdbfe — blue-200
  [50, [96, 165, 250]],   // #60a5fa — blue-400
  [75, [59, 130, 246]],   // #3b82f6 — blue-500
  [100, [37, 99, 235]],   // #2563eb — blue-600
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

export function interpolateHeatmapColor(percentage: number): string {
  const p = Math.max(0, Math.min(100, percentage));

  for (let i = 0; i < STOPS.length - 1; i++) {
    const [pLow, cLow] = STOPS[i]!;
    const [pHigh, cHigh] = STOPS[i + 1]!;
    if (p >= pLow && p <= pHigh) {
      const t = (p - pLow) / (pHigh - pLow);
      const r = lerp(cLow[0], cHigh[0], t);
      const g = lerp(cLow[1], cHigh[1], t);
      const b = lerp(cLow[2], cHigh[2], t);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }

  // Fallback — should not reach here given clamping above
  return "#2563eb";
}

/** The gradient stops used by the legend, exported for reuse. */
export const HEATMAP_GRADIENT_STOPS = STOPS;
