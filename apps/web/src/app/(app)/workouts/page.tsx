"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, RadioTower, Sparkles } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import WorkoutHistory from "@/components/workouts/WorkoutHistory";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function WorkoutsPage() {
  const router = useRouter();
  const createSession = useMutation(api.sessions.createSession);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGroupSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const { sessionId } = await createSession();
      router.push(`/workouts/session/${sessionId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      console.error("[WorkoutsPage] createSession error:", err);
      setError(message);
      setIsCreating(false);
    }
  };

  return (
    <main className="app-page" data-route="workouts" data-route-shell="workouts">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="workouts"
          eyebrow="Training log"
          badge={<AppBadge tone="accent">History</AppBadge>}
          title="Workout history"
          subtitle="Review completed sessions, jump back into training, and spin up a live group session without each page rebuilding its own chrome."
          actions={
            <div className="flex flex-col items-end gap-2">
              <button
                data-start-group-session
                onClick={handleStartGroupSession}
                disabled={isCreating}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Start Group Session"}
              </button>
              {error ? (
                <p data-workouts-group-session-error className="text-xs font-medium text-rose-600">
                  {error}
                </p>
              ) : null}
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="workouts-overview">
          <StatCard
            label="History"
            value="Sessions"
            description="Your completed workouts live below with analytics and template shortcuts preserved."
            icon={<Dumbbell className="h-5 w-5" />}
          />
          <StatCard
            label="Social"
            value="Live"
            description="Kick off a shared training room from the page header without leaving the shell."
            emphasis="warm"
            icon={<RadioTower className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="This page now inherits the app shell and shared primitives instead of a route-local wrapper."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <section data-route-content="workouts-history">
          <WorkoutHistory />
        </section>
      </div>
    </main>
  );
}
