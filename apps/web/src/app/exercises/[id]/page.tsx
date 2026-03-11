"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import ExerciseProgressChart from "@/components/exercises/ExerciseProgressChart";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

// ── Time Period Selector ─────────────────────────────────────────────────────

const PERIODS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "6mo", days: 180 },
  { label: "1yr", days: 365 },
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

// ── Badge (shared with ExerciseCard) ─────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  chest: "bg-blue-50 text-blue-700",
  back: "bg-indigo-50 text-indigo-700",
  shoulders: "bg-purple-50 text-purple-700",
  biceps: "bg-pink-50 text-pink-700",
  triceps: "bg-rose-50 text-rose-700",
  legs: "bg-green-50 text-green-700",
  core: "bg-yellow-50 text-yellow-700",
  fullBody: "bg-teal-50 text-teal-700",
  cardio: "bg-orange-50 text-orange-700",
  barbell: "bg-slate-50 text-slate-700",
  dumbbell: "bg-gray-50 text-gray-700",
  cable: "bg-zinc-50 text-zinc-700",
  machine: "bg-stone-50 text-stone-700",
  bodyweight: "bg-emerald-50 text-emerald-700",
  kettlebell: "bg-amber-50 text-amber-700",
  bands: "bg-lime-50 text-lime-700",
  other: "bg-neutral-50 text-neutral-700",
  strength: "bg-sky-50 text-sky-700",
  stretch: "bg-violet-50 text-violet-700",
  plyometric: "bg-fuchsia-50 text-fuchsia-700",
};

function Badge({ label }: { label: string }) {
  const colors = BADGE_COLORS[label] ?? "bg-gray-50 text-gray-600";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        colors,
      )}
    >
      {formatLabel(label)}
    </span>
  );
}

function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

// ── PR Summary ───────────────────────────────────────────────────────────────

interface PRRecord {
  type: "weight" | "volume" | "reps";
  value: number;
  setId: Id<"sets">;
  workoutId: Id<"workouts">;
  achievedAt: number;
}

const PR_LABELS: Record<string, string> = {
  weight: "Best Estimated 1RM",
  volume: "Best Session Volume",
  reps: "Best Single Set Reps",
};

function PRSummary({
  records,
  weightUnit,
}: {
  records: PRRecord[];
  weightUnit: WeightUnit;
}) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-500">No personal records yet</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {records.map((pr) => {
        let formattedValue: string;
        if (pr.type === "weight") {
          formattedValue = formatWeight(pr.value, weightUnit);
        } else if (pr.type === "volume") {
          formattedValue = formatWeight(pr.value, weightUnit);
        } else {
          formattedValue = `${pr.value} reps`;
        }

        const dateStr = new Date(pr.achievedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={pr.type}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500">
              {PR_LABELS[pr.type] ?? pr.type}
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formattedValue}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{dateStr}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const [periodDays, setPeriodDays] = useState<PeriodDays>(undefined);

  // Validate param presence
  const exerciseId = params.id as Id<"exercises"> | undefined;
  if (!exerciseId) {
    notFound();
  }

  const exercise = useQuery(api.exercises.getExercise, { id: exerciseId });
  const personalRecords = useQuery(api.personalRecords.getPersonalRecords, {
    exerciseId,
  });
  const preferences = useQuery(api.userPreferences.getPreferences);

  const weightUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  // Loading state: queries still pending
  const isLoading =
    exercise === undefined ||
    personalRecords === undefined ||
    preferences === undefined;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-400">
              <svg
                className="h-5 w-5 animate-spin"
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
              <span className="text-sm font-medium">Loading exercise…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Exercise not found (query resolved to null)
  if (exercise === null) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/exercises"
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
            Back to exercises
          </Link>
          <div className="mt-16 text-center">
            <p className="text-lg font-medium text-gray-900">
              Exercise not found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This exercise may have been removed or the link is invalid.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/exercises"
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
          Back to exercises
        </Link>

        {/* Exercise header */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {exercise.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge label={exercise.primaryMuscleGroup} />
            <Badge label={exercise.equipment} />
            <Badge label={exercise.exerciseType} />
          </div>
        </div>

        {/* Instructions */}
        {exercise.instructions && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700">
              Instructions
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {exercise.instructions}
            </p>
          </div>
        )}

        {/* Personal Records */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Personal Records
          </h2>
          <PRSummary records={personalRecords} weightUnit={weightUnit} />
        </div>

        {/* Progress Chart */}
        <div className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Progress Over Time
            </h2>
            <PeriodSelector selected={periodDays} onChange={setPeriodDays} />
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <ExerciseProgressChart
              exerciseId={exerciseId}
              periodDays={periodDays}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
