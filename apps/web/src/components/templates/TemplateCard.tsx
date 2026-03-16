"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Clock3, Dumbbell, Play, Trash2 } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/button";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";

interface TemplateCardProps {
  template: {
    _id: Id<"workoutTemplates">;
    name: string;
    description?: string;
    _creationTime: number;
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const data = useQuery(api.templates.getTemplateWithExercises, {
    templateId: template._id,
  });
  const startWorkout = useMutation(api.templates.startWorkoutFromTemplate);
  const deleteTemplateMutation = useMutation(api.templates.deleteTemplate);

  const exerciseNames =
    data?.exercises
      .map((e) => e.exercise?.name)
      .filter((n): n is string => !!n) ?? [];
  const exerciseCount = data?.exercises.length ?? 0;
  const isLoadingExercises = data === undefined;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startWorkout({ templateId: template._id });
      router.push("/workouts/active");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start workout from template";
      window.alert(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete template "${template.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteTemplateMutation({ templateId: template._id });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete template";
      window.alert(message);
    }
  };

  const MAX_DISPLAY_EXERCISES = 4;
  const displayNames = exerciseNames.slice(0, MAX_DISPLAY_EXERCISES);
  const remainingCount = exerciseNames.length - MAX_DISPLAY_EXERCISES;

  return (
    <AppCard
      tone="raised"
      padding="lg"
      className={cn(
        "template-card group flex h-full flex-col gap-5 overflow-hidden border-white/65",
        "transition-transform duration-200 hover:-translate-y-1",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,181,133,0.26),transparent_72%)] opacity-80" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="accent" size="sm">
              Template
            </AppBadge>
            <AppBadge tone="neutral" size="sm">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {formatDate(template._creationTime)}
              </span>
            </AppBadge>
          </div>

          <div>
            <h3 className="text-balance text-lg font-semibold tracking-[-0.04em] text-slate-950">
              {template.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {template.description?.trim() ||
                "Reusable workout flow built from a completed session so you can launch it again without rebuilding the structure."}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="relative z-10 h-10 w-10 shrink-0 rounded-full border border-white/65 bg-white/70 text-slate-500 shadow-[0_12px_24px_rgba(83,37,10,0.08)] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          onClick={handleDelete}
          aria-label="Delete template"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative grid gap-4 rounded-[24px] border border-white/65 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Workout structure
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              {exerciseCount}
            </p>
            <p className="text-sm text-slate-600">
              exercise{exerciseCount !== 1 ? "s" : ""} ready to launch
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(145deg,rgba(255,247,239,0.96),rgba(255,229,214,0.88))] text-[var(--color-app-shell-accent-strong)] shadow-[0_12px_24px_rgba(117,58,24,0.12)]">
            <Dumbbell className="h-5 w-5" />
          </div>
        </div>

        {isLoadingExercises ? (
          <div className="feature-inline-state">
            <span className="feature-inline-state__spinner" aria-hidden="true" />
            <span>Loading exercise list…</span>
          </div>
        ) : displayNames.length > 0 ? (
          <ul className="grid gap-2">
            {displayNames.map((name, i) => (
              <li
                key={`${template._id}-${name}-${i}`}
                className="template-card__exercise-row flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.62)] px-3 py-2 text-sm text-slate-700"
              >
                <span className="truncate font-medium">{name}</span>
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-app-shell-accent)]" />
              </li>
            ))}
            {remainingCount > 0 && (
              <li className="text-sm font-medium text-slate-500">
                +{remainingCount} more exercise{remainingCount !== 1 ? "s" : ""}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No exercise details available yet.</p>
        )}
      </div>

      <div className="relative mt-auto flex items-center gap-3">
        <Button
          className="h-11 flex-1 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition hover:bg-slate-900"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
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
              Starting…
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start workout
            </>
          )}
        </Button>
      </div>
    </AppCard>
  );
}
