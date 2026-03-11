"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/units";
import { Button } from "@/components/common/button";
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
        "group rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        "transition-all hover:border-gray-300 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {workout.name || "Workout"}
          </h3>

          {workout.startedAt && (
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(workout.startedAt)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {/* Duration badge */}
            {workout.durationSeconds != null && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {formatDuration(workout.durationSeconds)}
              </span>
            )}

            {/* Status badge */}
            {workout.status === "inProgress" && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                In Progress
              </span>
            )}

            {/* Exercise count badge */}
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
            className="h-8 w-8 text-gray-400 hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete workout"
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
