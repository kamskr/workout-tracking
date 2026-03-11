"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";

interface ProfileStatsProps {
  userId: string;
  weightUnit?: WeightUnit;
}

export default function ProfileStats({
  userId,
  weightUnit = "kg",
}: ProfileStatsProps) {
  const stats = useQuery(api.profiles.getProfileStats, { userId });

  // Loading skeleton
  if (stats === undefined) {
    return (
      <div data-profile-stats>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="mt-2 h-6 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasWorkouts = stats.totalWorkouts > 0;

  return (
    <div data-profile-stats>
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Workouts"
          value={stats.totalWorkouts.toString()}
        />
        <StatCard
          label="Current Streak"
          value={
            stats.currentStreak > 0
              ? `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`
              : "—"
          }
        />
        <StatCard
          label="Total Volume"
          value={
            stats.totalVolume > 0
              ? formatWeight(stats.totalVolume, weightUnit)
              : "—"
          }
        />
        <StatCard
          label="Exercises"
          value={
            stats.topExercises.length > 0
              ? stats.topExercises.length.toString()
              : "—"
          }
        />
      </div>

      {/* Top exercises */}
      {hasWorkouts && stats.topExercises.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700">Top Exercises</h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {stats.topExercises.slice(0, 5).map((exercise: { exerciseName: string; totalVolume: number }) => (
              <li
                key={exercise.exerciseName}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-gray-900">
                  {exercise.exerciseName}
                </span>
                <span className="text-sm text-gray-500">
                  {formatWeight(exercise.totalVolume, weightUnit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!hasWorkouts && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            No workout data yet. Complete a workout to see your stats!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
