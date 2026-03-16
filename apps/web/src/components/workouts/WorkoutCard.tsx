"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Activity, Clock3, Flame, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/units";
import { Button } from "@/components/common/button";
import { AppBadge } from "@/components/app-shell/AppBadge";
import SaveAsTemplateButton from "@/components/templates/SaveAsTemplateButton";
import ShareButton from "@/components/sharing/ShareButton";
import PrivacyToggle from "@/components/sharing/PrivacyToggle";

interface WorkoutCardProps {
  workout: {
    _id: Id<"workouts">;
    name?: string;
    status: string;
    startedAt?: number;
    completedAt?: number;
    durationSeconds?: number;
    isPublic?: boolean;
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

export default function WorkoutCard({ workout }: WorkoutCardProps) {
  const deleteWorkoutMutation = useMutation(api.workouts.deleteWorkout);
  const exercises = useQuery(api.workoutExercises.listExercisesForWorkout, {
    workoutId: workout._id,
  });
  const exerciseCount = exercises?.length ?? 0;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${workout.name || "Workout"}"? This will remove all exercises and sets.`,
    );
    if (!confirmed) return;

    await deleteWorkoutMutation({ id: workout._id });
  };

  return (
    <div
      className={cn(
        "workout-surface group flex h-full flex-col p-5 transition-all duration-200",
        workout.status === "inProgress" ? "workout-surface--accent" : "workout-surface--cool hover:-translate-y-0.5",
      )}
      data-workout-card
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone={workout.status === "inProgress" ? "warning" : "neutral"}>
              {workout.status === "inProgress" ? "In progress" : "Completed"}
            </AppBadge>
            {workout.startedAt && (
              <span className="workout-section-label">{formatDate(workout.startedAt)}</span>
            )}
          </div>

          <div>
            <h3 className="truncate text-lg font-semibold tracking-[-0.04em] text-slate-950 transition-colors group-hover:text-primary">
              {workout.name || "Workout"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {workout.status === "inProgress"
                ? "Resume active logging without losing rest timing, exercise order, or PR surfacing."
                : "Saved session summary with privacy, sharing, and template actions kept inline."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {workout.durationSeconds != null && (
              <span className="workout-kpi-pill workout-kpi-pill--cool">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDuration(workout.durationSeconds)}
              </span>
            )}

            <span className="workout-kpi-pill">
              <Activity className="h-3.5 w-3.5" />
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
            </span>

            {workout.status === "inProgress" && (
              <span className="workout-kpi-pill workout-kpi-pill--warning">
                <Flame className="h-3.5 w-3.5" />
                Live session
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {workout.status === "completed" && (
            <>
              <PrivacyToggle
                workoutId={workout._id}
                isPublic={workout.isPublic ?? true}
              />
              {workout.isPublic !== false && (
                <ShareButton workoutId={workout._id} />
              )}
              <SaveAsTemplateButton
                workoutId={workout._id}
                workoutName={workout.name || "Workout"}
              />
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/68 text-slate-400 hover:bg-white hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete workout"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
