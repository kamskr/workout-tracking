"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/button";

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
    <div
      className={cn(
        "group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        "transition-all hover:border-gray-300 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {template.name}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {formatDate(template._creationTime)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-gray-400 hover:text-destructive"
          onClick={handleDelete}
          aria-label="Delete template"
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

      {/* Exercise list */}
      <div className="mt-3 flex-1">
        {isLoadingExercises ? (
          <div className="flex items-center gap-2 text-gray-400">
            <svg
              className="h-3.5 w-3.5 animate-spin"
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
            <span className="text-xs">Loading…</span>
          </div>
        ) : (
          <>
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 mb-2">
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
            </span>
            {displayNames.length > 0 && (
              <ul className="space-y-0.5">
                {displayNames.map((name, i) => (
                  <li key={i} className="truncate text-xs text-gray-500">
                    {name}
                  </li>
                ))}
                {remainingCount > 0 && (
                  <li className="text-xs text-gray-400">
                    +{remainingCount} more
                  </li>
                )}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Start Workout button */}
      <div className="mt-4">
        <Button
          className="w-full"
          size="sm"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <svg
                className="mr-1.5 h-3.5 w-3.5 animate-spin"
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
            "Start Workout"
          )}
        </Button>
      </div>
    </div>
  );
}
