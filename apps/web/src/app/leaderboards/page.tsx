"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// ── Metric Picker ────────────────────────────────────────────────────────────

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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Metric">
      {METRICS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === m.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Period Picker ────────────────────────────────────────────────────────────

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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Time period">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === p.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Value Formatter ──────────────────────────────────────────────────────────

function formatValue(value: number, metric: Metric): string {
  if (metric === "reps") return `${value} reps`;
  return `${Math.round(value * 10) / 10} kg`;
}

// ── Loading Spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg
        className="h-5 w-5 animate-spin text-gray-400"
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardsPage() {
  const { user } = useUser();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedMetric, setSelectedMetric] = useState<Metric>("e1rm");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("allTime");

  // Fetch exercises that have leaderboard entries
  const exercises = useQuery(api.leaderboards.getLeaderboardExercises);

  // Auto-select first exercise when data loads
  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(exercises[0]._id);
    }
  }, [exercises, selectedExerciseId]);

  // Fetch leaderboard data
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

  // Fetch current user's rank
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

  // Get current user's profile for username link
  const myProfile = useQuery(
    api.profiles.getProfile,
    user?.id ? { userId: user.id } : "skip",
  );

  return (
    <main className="min-h-screen bg-gray-50" data-leaderboard-page>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
        <div className="mt-6 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Leaderboards
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            See how you stack up against other lifters
          </p>
        </div>

        {/* Exercise selector */}
        <div className="mb-6">
          <label
            htmlFor="exercise-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Exercise
          </label>
          {exercises === undefined ? (
            <div className="h-10 w-full max-w-xs animate-pulse rounded-lg bg-gray-200" />
          ) : exercises.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">
                No exercises with rankings yet
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Complete a workout to start seeing leaderboard data
              </p>
            </div>
          ) : (
            <select
              id="exercise-select"
              data-leaderboard-exercise-select
              value={selectedExerciseId ?? ""}
              onChange={(e) => setSelectedExerciseId(e.target.value || null)}
              className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {exercises.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Only show pickers + table when we have exercises */}
        {exercises && exercises.length > 0 && (
          <>
            {/* Metric + Period pickers */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">
                  Metric
                </span>
                <MetricPicker
                  selected={selectedMetric}
                  onChange={setSelectedMetric}
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">
                  Period
                </span>
                <PeriodPicker
                  selected={selectedPeriod}
                  onChange={setSelectedPeriod}
                />
              </div>
            </div>

            {/* Leaderboard table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {leaderboardData === undefined ? (
                <Spinner />
              ) : leaderboardData.entries.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">No rankings yet</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Be the first to set a record for this exercise
                  </p>
                </div>
              ) : (
                <table
                  data-leaderboard-table
                  className="w-full text-sm text-left"
                >
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 w-12">#</th>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.id;
                      return (
                        <tr
                          key={entry.userId}
                          className={cn(
                            "border-b border-gray-50 last:border-0",
                            isCurrentUser
                              ? "bg-blue-50"
                              : "hover:bg-gray-50",
                          )}
                        >
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-3">
                            <div>
                              <span className="font-medium text-gray-900">
                                {entry.displayName}
                              </span>
                              <span className="ml-1.5 text-gray-400">
                                @{entry.username}
                              </span>
                              {isCurrentUser && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-gray-700">
                            {formatValue(entry.value, selectedMetric)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* My Rank callout */}
            <div
              data-leaderboard-rank
              className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              {myRank === undefined ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your Rank
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      #{myRank.rank}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your Best
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-700 font-mono">
                      {formatValue(myRank.value!, selectedMetric)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500">
                    Not ranked —{" "}
                    <Link
                      href={
                        myProfile?.username
                          ? `/profile/${myProfile.username}`
                          : "/profile"
                      }
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      opt in on your profile
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
