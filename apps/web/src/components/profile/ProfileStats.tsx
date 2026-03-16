"use client";

import { useQuery } from "convex/react";
import { Activity, Flame, Layers3, TrendingUp } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";
import { AppCard } from "@/components/app-shell/AppCard";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { StatCard } from "@/components/app-shell/StatCard";

interface ProfileStatsProps {
  userId: string;
  weightUnit?: WeightUnit;
}

export default function ProfileStats({
  userId,
  weightUnit = "kg",
}: ProfileStatsProps) {
  const stats = useQuery(api.profiles.getProfileStats, { userId });

  if (stats === undefined) {
    return (
      <div data-profile-stats>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AppCard key={i} tone="subtle" padding="md" className="animate-pulse">
              <div className="h-3 w-20 rounded-full bg-slate-200/80" />
              <div className="mt-4 h-8 w-24 rounded-full bg-slate-200/80" />
              <div className="mt-3 h-3 w-28 rounded-full bg-slate-200/70" />
            </AppCard>
          ))}
        </div>
      </div>
    );
  }

  const hasWorkouts = stats.totalWorkouts > 0;

  return (
    <div data-profile-stats className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workouts"
          value={stats.totalWorkouts.toString()}
          description="Completed sessions recorded on your profile"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Current Streak"
          value={
            stats.currentStreak > 0
              ? `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`
              : "—"
          }
          description="Consecutive days with logged training"
          emphasis="warm"
          icon={<Flame className="h-5 w-5" />}
        />
        <StatCard
          label="Total Volume"
          value={
            stats.totalVolume > 0
              ? formatWeight(stats.totalVolume, weightUnit)
              : "—"
          }
          description="All-time lifted volume across completed workouts"
          emphasis="cool"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Tracked Exercises"
          value={
            stats.topExercises.length > 0
              ? stats.topExercises.length.toString()
              : "—"
          }
          description="Exercises with enough data to surface here"
          icon={<Layers3 className="h-5 w-5" />}
        />
      </div>

      {hasWorkouts && stats.topExercises.length > 0 && (
        <AppCard tone="raised" padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Top exercises
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                Highest-volume movements
              </p>
            </div>
            <AppBadge tone="neutral">All time</AppBadge>
          </div>

          <ul className="grid gap-3">
            {stats.topExercises
              .slice(0, 5)
              .map((exercise: { exerciseName: string; totalVolume: number }, index) => (
                <li
                  key={exercise.exerciseName}
                  className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/58 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      #{index + 1}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {exercise.exerciseName}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-600">
                    {formatWeight(exercise.totalVolume, weightUnit)}
                  </p>
                </li>
              ))}
          </ul>
        </AppCard>
      )}

      {!hasWorkouts && (
        <AppCard tone="subtle" padding="lg" className="feature-empty-state py-10 text-center">
          <div className="feature-empty-state__body">
            <p className="feature-empty-state__eyebrow">Workout stats</p>
            <p className="feature-empty-state__title">No workout data yet</p>
            <p className="feature-empty-state__copy">
              Complete a workout and your profile stats will appear here with the same shell-driven structure as the rest of the app.
            </p>
          </div>
        </AppCard>
      )}
    </div>
  );
}
