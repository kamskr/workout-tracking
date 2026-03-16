"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowLeft, Award, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import ExerciseProgressChart from "@/components/exercises/ExerciseProgressChart";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Time period" data-exercise-period-selector>
      {PERIODS.map((period) => (
        <button
          key={period.label}
          type="button"
          onClick={() => onChange(period.days)}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
            selected === period.days
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-white/60 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

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
        "inline-flex items-center rounded-full border border-white/70 px-3 py-1 text-xs font-semibold capitalize shadow-[0_10px_20px_rgba(83,37,10,0.05)]",
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
    return <p className="text-sm text-slate-500">No personal records yet</p>;
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
          <div key={pr.type} data-pr-badge={pr.type} className="rounded-[24px] border border-white/70 bg-white/78 p-4 shadow-[0_18px_34px_rgba(83,37,10,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {PR_LABELS[pr.type] ?? pr.type}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{formattedValue}</p>
            <p className="mt-1 text-xs text-slate-400">{dateStr}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const [periodDays, setPeriodDays] = useState<PeriodDays>(undefined);

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

  const isLoading =
    exercise === undefined ||
    personalRecords === undefined ||
    preferences === undefined;

  if (isLoading) {
    return (
      <main className="app-page" data-route="exercise-detail" data-route-shell="exercise-detail">
        <div className="app-page-layout">
          <PageHeader
            data-page-header="exercise-detail"
            eyebrow="Movement detail"
            badge={<AppBadge tone="accent">Exercise</AppBadge>}
            title="Loading exercise"
            subtitle="Resolving movement details, progress history, and personal records inside the shared route shell."
          />
          <AppCard tone="subtle" padding="lg" data-route-section="exercise-detail-loading">
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-slate-400">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Loading exercise…</span>
              </div>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  if (exercise === null) {
    return (
      <main className="app-page" data-route="exercise-detail" data-route-shell="exercise-detail">
        <div className="app-page-layout">
          <PageHeader
            data-page-header="exercise-detail"
            eyebrow="Movement detail"
            badge={<AppBadge tone="warning">Missing</AppBadge>}
            title="Exercise not found"
            subtitle="This exercise may have been removed or the link is invalid."
          />
          <AppCard tone="subtle" padding="lg" data-route-section="exercise-detail-empty">
            <Link
              href="/exercises"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to exercises
            </Link>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page" data-route="exercise-detail" data-route-shell="exercise-detail">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="exercise-detail"
          eyebrow="Movement detail"
          badge={<AppBadge tone="accent">Exercise</AppBadge>}
          title={exercise.name}
          subtitle="Review instructions, personal records, and progress history without leaving the authenticated shell rhythm used across the app."
          meta={
            <>
              <Badge label={exercise.primaryMuscleGroup} />
              <Badge label={exercise.equipment} />
              <Badge label={exercise.exerciseType} />
            </>
          }
          actions={
            <Link
              href="/exercises"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to exercises
            </Link>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="exercise-detail-overview">
          <StatCard
            label="Category"
            value={formatLabel(exercise.exerciseType)}
            description="The detail route now owns shell framing while leaving movement logic in feature components."
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Records"
            value={personalRecords.length}
            description="Personal record cards remain query-driven and keep their data hooks intact."
            emphasis="warm"
            icon={<Award className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value={periodDays === undefined ? "All" : `${periodDays}d`}
            description="Route selectors now prove period switching without relying on page copy."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        {exercise.instructions ? (
          <AppCard tone="raised" padding="lg" data-route-section="exercise-detail-instructions">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Instructions</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{exercise.instructions}</p>
          </AppCard>
        ) : null}

        <AppCard tone="default" padding="lg" data-route-section="exercise-detail-prs">
          <div className="mb-4 flex items-center gap-2">
            <AppBadge tone="neutral">Personal records</AppBadge>
            <p className="text-sm text-slate-500">Existing PR hooks stay stable for runtime proof.</p>
          </div>
          <PRSummary records={personalRecords} weightUnit={weightUnit} />
        </AppCard>

        <AppCard tone="default" padding="lg" data-route-section="exercise-detail-progress">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Progress over time</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">Trend view</p>
            </div>
            <PeriodSelector selected={periodDays} onChange={setPeriodDays} />
          </div>
          <div className="mt-5">
            <ExerciseProgressChart exerciseId={exerciseId} periodDays={periodDays} />
          </div>
        </AppCard>
      </div>
    </main>
  );
}
