"use client";

import { Activity, PlayCircle, Sparkles } from "lucide-react";
import ActiveWorkout from "@/components/workouts/ActiveWorkout";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function ActiveWorkoutPage() {
  return (
    <main className="app-page" data-route="workouts-active" data-route-shell="workouts-active">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="workouts-active"
          eyebrow="Live logging"
          badge={<AppBadge tone="accent">Active workout</AppBadge>}
          title="Current workout"
          subtitle="The active logging flow now lives inside the shared authenticated shell while the workout component keeps ownership of timers, sets, and progression logic."
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="workout-active-overview">
          <StatCard
            label="Mode"
            value="Live"
            description="Track sets in real time without route-local layout chrome getting in the way."
            icon={<PlayCircle className="h-5 w-5" />}
          />
          <StatCard
            label="Focus"
            value="Training"
            description="The route layer now contributes just the shell seam, overview hooks, and page framing."
            emphasis="warm"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Diagnostics can distinguish shell regressions from active-workout component issues."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="default" padding="lg" data-route-section="workout-active-flow">
          <ActiveWorkout />
        </AppCard>
      </div>
    </main>
  );
}
