"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { MuscleHeatmap } from "@/components/analytics/MuscleHeatmap";
import VolumeByMuscleGroupChart from "@/components/analytics/VolumeByMuscleGroupChart";
import WeeklySummaryCard from "@/components/analytics/WeeklySummaryCard";
import MonthlySummaryCard from "@/components/analytics/MonthlySummaryCard";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

// ── Time Period Selector ─────────────────────────────────────────────────────

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All Time", days: undefined },
] as const;

type PeriodDays = (typeof PERIODS)[number]["days"];

function PeriodSelector({
  selected,
  onChange,
}: {
  selected: PeriodDays;
  onChange: (days: PeriodDays) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Time period">
      {PERIODS.map((period) => (
        <button
          key={period.label}
          type="button"
          onClick={() => onChange(period.days)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === period.days
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  const volumeData = useQuery(api.analytics.getVolumeByMuscleGroup, {
    periodDays,
  });
  const preferences = useQuery(api.userPreferences.getPreferences);

  const weightUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  // Determine if there's truly no data (not just loading)
  const isVolumeLoaded = volumeData !== undefined;
  const isEmptyState = isVolumeLoaded && volumeData.length === 0;

  // Map volume data to heatmap format
  const heatmapData =
    volumeData?.map((item) => ({
      muscleGroup: item.muscleGroup,
      percentage: item.percentage,
    })) ?? [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/workouts"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to workouts
        </Link>

        {/* Page header */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Analytics
          </h1>
          <PeriodSelector selected={periodDays} onChange={setPeriodDays} />
        </div>

        {/* Empty state — no completed workouts at all */}
        {isEmptyState && (
          <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <svg
                className="h-8 w-8 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">
              Log your first workout to see analytics
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Complete a workout and your training data will appear here
            </p>
            <Link
              href="/workouts/active"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
            >
              Start Workout
            </Link>
          </div>
        )}

        {/* Dashboard content — only shown when there's data or still loading */}
        {!isEmptyState && (
          <>
            {/* Heatmap + Bar Chart — 2-column grid on desktop */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Muscle Heatmap */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Muscle Group Heatmap
                </h2>
                <MuscleHeatmap data={heatmapData} />
              </div>

              {/* Volume Bar Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Volume by Muscle Group
                </h2>
                <VolumeByMuscleGroupChart periodDays={periodDays} />
              </div>
            </div>

            {/* Summary Cards — 2-column grid */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <WeeklySummaryCard weightUnit={weightUnit} />
              <MonthlySummaryCard weightUnit={weightUnit} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
