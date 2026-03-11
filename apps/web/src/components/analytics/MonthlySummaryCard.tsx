"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";

// ── Types ────────────────────────────────────────────────────────────────────

interface MonthlySummaryCardProps {
  weightUnit: WeightUnit;
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatCompactVolume(kg: number, unit: WeightUnit): string {
  return formatWeight(kg, unit);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MonthlySummaryCard({ weightUnit }: MonthlySummaryCardProps) {
  const summary = useQuery(api.analytics.getMonthlySummary);

  // Loading state
  if (summary === undefined) {
    return (
      <div
        data-analytics-summary-monthly
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-400">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = summary.workoutCount === 0;

  return (
    <div
      data-analytics-summary-monthly
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        This Month
      </h3>

      {isEmpty ? (
        <p className="text-sm text-gray-500 py-4">No workouts this month</p>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Workouts</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.workoutCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Volume</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCompactVolume(summary.totalVolume, weightUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sets</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totalSets}
              </p>
            </div>
          </div>

          {/* Top exercises */}
          {summary.topExercises.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Top Exercises
              </p>
              <ul className="space-y-1.5">
                {summary.topExercises.map((ex, i) => (
                  <li
                    key={ex.exerciseName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                      {ex.exerciseName}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatCompactVolume(ex.totalVolume, weightUnit)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
