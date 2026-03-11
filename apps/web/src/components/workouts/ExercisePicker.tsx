"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import ExerciseFilters, {
  type ExerciseFilterState,
} from "@/components/exercises/ExerciseFilters";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

const BADGE_COLORS: Record<string, string> = {
  chest: "bg-blue-50 text-blue-700",
  back: "bg-indigo-50 text-indigo-700",
  shoulders: "bg-purple-50 text-purple-700",
  biceps: "bg-pink-50 text-pink-700",
  triceps: "bg-rose-50 text-rose-700",
  legs: "bg-green-50 text-green-700",
  core: "bg-yellow-50 text-yellow-700",
  fullBody: "bg-teal-50 text-teal-700",
  cardio: "bg-orange-50 text-orange-700",
};

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  workoutId: Id<"workouts">;
}

export default function ExercisePicker({
  open,
  onClose,
  workoutId,
}: ExercisePickerProps) {
  const [filters, setFilters] = useState<ExerciseFilterState>({
    searchQuery: "",
    primaryMuscleGroup: "",
    equipment: "",
  });

  const addExercise = useMutation(api.workoutExercises.addExerciseToWorkout);

  // Build query args — only pass non-empty values
  const queryArgs: Record<string, string> = {};
  if (filters.searchQuery) queryArgs.searchQuery = filters.searchQuery;
  if (filters.primaryMuscleGroup)
    queryArgs.primaryMuscleGroup = filters.primaryMuscleGroup;
  if (filters.equipment) queryArgs.equipment = filters.equipment;

  const exercises = useQuery(api.exercises.listExercises, queryArgs);

  const handleSelect = useCallback(
    async (exerciseId: Id<"exercises">) => {
      await addExercise({ workoutId, exerciseId });
      onClose();
    },
    [addExercise, workoutId, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 mx-4 w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Exercise picker"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Add Exercise
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close exercise picker"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-100 px-5 py-3">
          <ExerciseFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Exercise list */}
        <div className="max-h-96 overflow-y-auto px-5 py-3">
          {exercises === undefined && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-400">
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
                <span className="text-sm">Loading exercises…</span>
              </div>
            </div>
          )}

          {exercises && exercises.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No exercises found. Try adjusting your filters.
            </div>
          )}

          {exercises && exercises.length > 0 && (
            <ul className="space-y-1" role="listbox" aria-label="Exercises">
              {exercises.map((exercise) => (
                <li key={exercise._id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                      "transition-colors hover:bg-gray-50 active:bg-gray-100",
                    )}
                    onClick={() =>
                      handleSelect(exercise._id as Id<"exercises">)
                    }
                    role="option"
                    aria-selected={false}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {exercise.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize",
                            BADGE_COLORS[exercise.primaryMuscleGroup] ??
                              "bg-gray-50 text-gray-600",
                          )}
                        >
                          {exercise.primaryMuscleGroup.replace(
                            /([a-z])([A-Z])/g,
                            "$1 $2",
                          )}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-gray-600">
                          {exercise.equipment}
                        </span>
                      </div>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4 shrink-0 text-gray-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
