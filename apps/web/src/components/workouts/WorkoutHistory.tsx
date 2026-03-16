"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import Link from "next/link";
import { Activity, BarChart3, LayoutTemplate, Sparkles } from "lucide-react";
import WorkoutCard from "./WorkoutCard";
import { Button } from "@/components/common/button";
import { AppBadge } from "@/components/app-shell/AppBadge";

export default function WorkoutHistory() {
  const workouts = useQuery(api.workouts.listWorkouts);
  const preferences = useQuery(api.userPreferences.getPreferences);

  const isLoading = workouts === undefined || preferences === undefined;
  const isEmpty = workouts !== undefined && workouts.length === 0;

  return (
    <div className="space-y-6" data-workout-history>
      <div className="workout-surface workout-surface--accent p-5 sm:p-6">
        <div className="workout-toolbar gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge tone="accent">Workout history</AppBadge>
              <span className="workout-section-label">Training archive</span>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2rem]">
                Browse every logged session in one premium stack.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                Recent workouts, saved templates, and analytics shortcuts now live inside the same warm shell language as active logging.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="workout-kpi-pill">
                <Activity className="h-3.5 w-3.5" />
                {workouts && workouts.length > 0
                  ? `${workouts.length} workout${workouts.length !== 1 ? "s" : ""}`
                  : "Training archive"}
              </span>
              <span className="workout-kpi-pill workout-kpi-pill--cool">
                <Sparkles className="h-3.5 w-3.5" />
                Shared shell refresh
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="rounded-full border-white/70 bg-white/75 shadow-sm hover:bg-white">
              <Link href="/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full border-white/70 bg-white/75 shadow-sm hover:bg-white">
              <Link href="/templates">
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Templates
              </Link>
            </Button>
            <Button asChild className="rounded-full px-5 shadow-[0_18px_36px_rgba(13,135,225,0.22)]">
              <Link href="/workouts/active">Start Workout</Link>
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="workout-surface workout-surface--muted p-6 sm:p-8">
          <div className="feature-inline-state justify-center py-10">
            <span className="feature-inline-state__spinner" aria-hidden="true" />
            <span className="text-sm font-medium">Loading workouts…</span>
          </div>
        </div>
      )}

      {!isLoading && isEmpty && (
        <div className="workout-empty-panel">
          <div className="workout-empty-panel__icon">
            <Activity className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">No workouts yet</p>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Start your first session to build history, unlock progress trends, and keep future PR cards grounded in real data.
            </p>
          </div>
          <Button asChild className="mt-2 rounded-full px-5">
            <Link href="/workouts/active">Start Workout</Link>
          </Button>
        </div>
      )}

      {workouts && workouts.length > 0 && (
        <div className="workout-collection grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout._id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
