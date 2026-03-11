/** Weight unit type used across the app. */
export type WeightUnit = "kg" | "lbs";

/** Conversion constant: 1 kg = 2.20462 lbs */
export const KG_TO_LBS = 2.20462;

/** Convert kilograms to pounds, rounded to 1 decimal place. */
export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

/** Convert pounds to kilograms. No rounding — preserves precision for storage. */
export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS;
}

/** Return the numeric weight value in the requested display unit. */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kgToLbs(kg);
}

/**
 * Format a weight for display with its unit label.
 * Examples: "60 kg", "132.3 lbs"
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = displayWeight(kg, unit);
  return `${value} ${unit}`;
}

/**
 * Format rest time in seconds to "M:SS" format.
 * Examples: 90 → "1:30", 5 → "0:05", 0 → "0:00", 125 → "2:05"
 */
export function formatRestTime(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format a duration in seconds to a human-readable string.
 * - 0 seconds → "0m"
 * - 45 seconds → "0m" (rounds down to minutes)
 * - 90 seconds → "1m"
 * - 3600 seconds → "1h 0m"
 * - 4980 seconds → "1h 23m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return "0m";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
