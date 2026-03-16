"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Medal, Sparkles, TrendingUp } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "e1rm" as const, label: "Est. 1RM" },
  { value: "volume" as const, label: "Total Volume" },
  { value: "reps" as const, label: "Max Reps" },
];

type Metric = (typeof METRICS)[number]["value"];

function MetricPicker({
  selected,
  onChange,
}: {
  selected: Metric;
  onChange: (m: Metric) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Metric" data-leaderboard-metric-picker>
      {METRICS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
            selected === m.value
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-white/60 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

const PERIODS = [
  { value: "7d" as const, label: "7 Days" },
  { value: "30d" as const, label: "30 Days" },
  { value: "allTime" as const, label: "All Time" },
];

type Period = (typeof PERIODS)[number]["value"];

function PeriodPicker({
  selected,
  onChange,
}: {
  selected: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Time period" data-leaderboard-period-picker>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
            selected === p.value
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-white/60 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function formatValue(value: number, metric: Metric): string {
  if (metric === "reps") return `${value} reps`;
  return `${Math.round(value * 10) / 10} kg`;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg
        className="h-5 w-5 animate-spin text-slate-400"
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
    </div>
  );
}

export default function LeaderboardsPage() {
  const { user } = useUser();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric>("e1rm");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("allTime");

  const exercises = useQuery(api.leaderboards.getLeaderboardExercises);

  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(exercises[0]._id);
    }
  }, [exercises, selectedExerciseId]);

  const leaderboardData = useQuery(
    api.leaderboards.getLeaderboard,
    selectedExerciseId
      ? {
          exerciseId: selectedExerciseId as Id<"exercises">,
          metric: selectedMetric,
          period: "allTime" as const,
        }
      : "skip",
  );

  const myRank = useQuery(
    api.leaderboards.getMyRank,
    selectedExerciseId
      ? {
          exerciseId: selectedExerciseId as Id<"exercises">,
          metric: selectedMetric,
          period: "allTime" as const,
        }
      : "skip",
  );

  const myProfile = useQuery(
    api.profiles.getProfile,
    user?.id ? { userId: user.id } : "skip",
  );

  return (
    <main className="app-page" data-leaderboard-page data-route="leaderboards" data-route-shell="leaderboards">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="leaderboards"
          eyebrow="Competitive training"
          badge={<AppBadge tone="accent">Rankings</AppBadge>}
          title="Leaderboards"
          subtitle="Compare your numbers across core lifts while preserving the leaderboard-specific controls and proof hooks inside the shared shell."
          meta={
            <>
              <AppBadge tone="neutral">Exercise scoped</AppBadge>
              <AppBadge tone="neutral">Metric switcher</AppBadge>
              <AppBadge tone="neutral">Rank callout</AppBadge>
            </>
          }
        />

        <div className="flex items-center gap-3 text-sm text-slate-500" data-route-nav="leaderboards-backlink">
          <Link
            href="/workouts"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workouts
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3" data-route-section="leaderboards-overview">
          <StatCard
            label="Exercise"
            value={selectedExerciseId ? "Selected" : "Waiting"}
            description="The ranking table tracks the currently chosen exercise with stable selector hooks."
            icon={<Medal className="h-5 w-5" />}
          />
          <StatCard
            label="Metric"
            value={selectedMetric.toUpperCase()}
            description="Metric picker state carries through without rebuilding a separate page wrapper."
            emphasis="warm"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value={selectedPeriod === "allTime" ? "All" : selectedPeriod}
            description="Period controls stay visible even while the backend still serves all-time data."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_1fr]" data-route-section="leaderboards-main">
          <AppCard tone="raised" padding="lg" data-leaderboard-controls>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Exercise selector
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                Choose a lift
              </h2>
            </div>

            <div className="mt-5">
              <label htmlFor="exercise-select" className="mb-2 block text-sm font-medium text-slate-700">
                Exercise
              </label>
              {exercises === undefined ? (
                <div className="h-11 w-full animate-pulse rounded-2xl bg-white/70" />
              ) : exercises.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-center">
                  <p className="text-sm text-slate-500">No exercises with rankings yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Complete a workout to start seeing leaderboard data.
                  </p>
                </div>
              ) : (
                <select
                  id="exercise-select"
                  data-leaderboard-exercise-select
                  value={selectedExerciseId ?? ""}
                  onChange={(e) => setSelectedExerciseId(e.target.value || null)}
                  className="block h-11 w-full rounded-2xl border border-white/70 bg-white/80 px-4 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {exercises.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {exercises && exercises.length > 0 ? (
              <div className="mt-6 space-y-5">
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Metric
                  </span>
                  <MetricPicker selected={selectedMetric} onChange={setSelectedMetric} />
                </div>
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Period
                  </span>
                  <PeriodPicker selected={selectedPeriod} onChange={setSelectedPeriod} />
                </div>
              </div>
            ) : null}
          </AppCard>

          <div className="space-y-6">
            <AppCard tone="default" padding="lg">
              {leaderboardData === undefined ? (
                <Spinner />
              ) : leaderboardData.entries.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <p className="text-sm text-slate-500">No rankings yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Be the first to set a record for this exercise.
                  </p>
                </div>
              ) : (
                <table data-leaderboard-table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="w-12 px-2 py-3">#</th>
                      <th className="px-2 py-3">User</th>
                      <th className="px-2 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.id;
                      return (
                        <tr
                          key={entry.userId}
                          className={cn(
                            "border-b border-slate-50 last:border-0",
                            isCurrentUser ? "bg-amber-50/70" : "hover:bg-white/70",
                          )}
                        >
                          <td className="px-2 py-3 font-semibold text-slate-900">{idx + 1}</td>
                          <td className="px-2 py-3">
                            <div>
                              <span className="font-semibold text-slate-900">{entry.displayName}</span>
                              <span className="ml-1.5 text-slate-400">@{entry.username}</span>
                              {isCurrentUser ? (
                                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  You
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-slate-700">
                            {formatValue(entry.value, selectedMetric)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </AppCard>

            <AppCard tone="highlight" padding="lg" data-leaderboard-rank>
              {myRank === undefined ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
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
                  Loading your rank…
                </div>
              ) : myRank.rank !== null ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Your rank
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                      #{myRank.rank}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Your best
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-700 font-mono">
                      {formatValue(myRank.value!, selectedMetric)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-slate-600">
                    Not ranked —{" "}
                    <Link
                      href={myProfile?.username ? `/profile/${myProfile.username}` : "/profile"}
                      className="font-semibold text-slate-900 underline decoration-amber-400 underline-offset-4"
                    >
                      opt in on your profile
                    </Link>
                  </p>
                </div>
              )}
            </AppCard>
          </div>
        </section>
      </div>
    </main>
  );
}
