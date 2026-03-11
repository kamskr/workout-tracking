"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { formatWeight, type WeightUnit } from "@/lib/units";
import SetRow from "./SetRow";
import RestDurationConfig from "./RestDurationConfig";
import { useRestTimer } from "./RestTimerContext";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

interface SetData {
  _id: Id<"sets">;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isWarmup: boolean;
}

interface ExerciseItemData {
  workoutExercise: {
    _id: Id<"workoutExercises">;
    workoutId: Id<"workouts">;
    exerciseId: Id<"exercises">;
    order: number;
    supersetGroupId?: string;
    restSeconds?: number;
  };
  exercise: {
    _id: Id<"exercises">;
    name: string;
    primaryMuscleGroup: string;
    equipment: string;
    defaultRestSeconds?: number;
  } | null;
  sets: SetData[];
}

interface WorkoutExerciseItemProps {
  data: ExerciseItemData;
  unit: WeightUnit;
  /** Whether to show the selection checkbox for superset grouping. */
  selectable?: boolean;
  /** Whether this exercise is currently selected. */
  selected?: boolean;
  /** Called when the selection checkbox is toggled. */
  onSelectionChange?: (id: Id<"workoutExercises">, selected: boolean) => void;
  /** User-level default rest seconds from preferences (lowest priority in the chain). */
  userDefaultRestSeconds?: number;
}

/**
 * Summarise previous performance sets into a compact string.
 * Example: "3×10 @ 60 kg, 3×8 @ 65 kg"
 *
 * Groups consecutive sets with the same weight+reps and shows count prefix.
 */
function formatPreviousPerformance(
  sets: { weight?: number; reps?: number }[],
  unit: WeightUnit,
): string {
  if (sets.length === 0) return "";

  // Group consecutive identical (weight, reps) pairs
  const groups: { weight?: number; reps?: number; count: number }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight && last.reps === s.reps) {
      last.count++;
    } else {
      groups.push({ weight: s.weight, reps: s.reps, count: 1 });
    }
  }

  return groups
    .map((g) => {
      const repsStr = g.reps != null ? `${g.reps}` : "?";
      const setStr = `${g.count}×${repsStr}`;
      if (g.weight != null && g.weight > 0) {
        return `${setStr} @ ${formatWeight(g.weight, unit)}`;
      }
      return setStr;
    })
    .join(", ");
}

export default function WorkoutExerciseItem({
  data,
  unit,
  selectable = false,
  selected = false,
  onSelectionChange,
  userDefaultRestSeconds,
}: WorkoutExerciseItemProps) {
  const logSet = useMutation(api.sets.logSet);
  const removeExercise = useMutation(
    api.workoutExercises.removeExerciseFromWorkout,
  );
  const { startTimer } = useRestTimer();
  const [isRemoving, setIsRemoving] = useState(false);

  // Previous performance query
  const previousPerformance = useQuery(
    api.sets.getPreviousPerformance,
    data.workoutExercise.exerciseId
      ? { exerciseId: data.workoutExercise.exerciseId }
      : "skip",
  );

  // PR badge — subscribe to all PRs for this workout, filter for this exercise
  const workoutPRs = useQuery(api.personalRecords.getWorkoutPRs, {
    workoutId: data.workoutExercise.workoutId,
  });

  const exercisePRs = useMemo(() => {
    if (!workoutPRs) return [];
    return workoutPRs.filter(
      (pr) => pr.exerciseId === data.workoutExercise.exerciseId,
    );
  }, [workoutPRs, data.workoutExercise.exerciseId]);

  // Resolve rest duration via priority chain:
  // exercise-level override → exercise default → user preference → 60s fallback
  const resolvedRestSeconds =
    data.workoutExercise.restSeconds ??
    data.exercise?.defaultRestSeconds ??
    userDefaultRestSeconds ??
    60;

  const handleAddSet = useCallback(async () => {
    await logSet({
      workoutExerciseId: data.workoutExercise._id,
    });

    // Start rest timer after successful set log (duration 0 = disabled)
    if (resolvedRestSeconds > 0) {
      startTimer(resolvedRestSeconds, data.exercise?.name ?? "Exercise");
    }
  }, [logSet, data.workoutExercise._id, resolvedRestSeconds, startTimer, data.exercise?.name]);

  const handleRemoveExercise = useCallback(async () => {
    const confirmed = window.confirm(
      `Remove "${data.exercise?.name ?? "Exercise"}" and all its sets?`,
    );
    if (!confirmed) return;
    setIsRemoving(true);
    try {
      await removeExercise({
        workoutExerciseId: data.workoutExercise._id,
      });
    } catch {
      setIsRemoving(false);
    }
  }, [removeExercise, data.workoutExercise._id, data.exercise?.name]);

  const sortedSets = [...data.sets].sort((a, b) => a.setNumber - b.setNumber);

  const prevPerfSummary =
    previousPerformance && previousPerformance.sets.length > 0
      ? formatPreviousPerformance(previousPerformance.sets, unit)
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity",
        isRemoving && "pointer-events-none opacity-50",
        selected && "ring-2 ring-primary/40",
      )}
    >
      {/* Exercise header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) =>
                onSelectionChange?.(data.workoutExercise._id, e.target.checked)
              }
              className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary accent-primary"
              aria-label={`Select ${data.exercise?.name ?? "exercise"} for superset`}
            />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {data.exercise?.name ?? "Unknown Exercise"}
            </h3>
            {data.exercise && (
              <p className="mt-0.5 text-xs text-gray-500 capitalize">
                {data.exercise.primaryMuscleGroup.replace(
                  /([a-z])([A-Z])/g,
                  "$1 $2",
                )}{" "}
                · {data.exercise.equipment}
              </p>
            )}
            {/* Previous performance display (R007) */}
            {prevPerfSummary && (
              <p className="mt-0.5 text-xs text-blue-600/80">
                Last: {prevPerfSummary}
              </p>
            )}
            {/* First-time badge: show only when query has resolved and returned null */}
            {previousPerformance === null && (
              <p className="mt-0.5 text-xs text-emerald-600/70">
                First time! 🎉
              </p>
            )}
            {/* PR badges — appear reactively after a set triggers a PR */}
            {exercisePRs.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1" data-pr-badge>
                {exercisePRs.map((pr) => (
                  <span
                    key={pr.type}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5",
                      "bg-amber-50 text-amber-700 border border-amber-200/60",
                      "text-[11px] font-medium leading-tight",
                      "animate-[pr-badge-in_0.3s_ease-out]",
                    )}
                  >
                    🏆{" "}
                    {pr.type === "weight"
                      ? "Weight PR"
                      : pr.type === "volume"
                        ? "Volume PR"
                        : "Reps PR"}
                  </span>
                ))}
              </div>
            )}
            {/* Per-exercise rest duration config */}
            <RestDurationConfig
              workoutExerciseId={data.workoutExercise._id}
              currentRestSeconds={resolvedRestSeconds}
              isOverride={data.workoutExercise.restSeconds !== undefined}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-gray-400 hover:text-destructive"
          onClick={handleRemoveExercise}
          aria-label={`Remove ${data.exercise?.name ?? "exercise"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mr-1 h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
          Remove
        </Button>
      </div>

      {/* Set header row */}
      {sortedSets.length > 0 && (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <span className="w-8 text-center text-[10px] font-medium uppercase text-gray-400">
            Set
          </span>
          <span className="min-w-0 flex-[2] text-[10px] font-medium uppercase text-gray-400">
            Weight
          </span>
          <span className="min-w-0 flex-[2] text-[10px] font-medium uppercase text-gray-400">
            Reps
          </span>
          <span className="w-14 shrink-0 text-center text-[10px] font-medium uppercase text-gray-400">
            RPE
          </span>
          <span className="w-24 shrink-0 text-[10px] font-medium uppercase text-gray-400">
            Tempo
          </span>
          {/* Spacers for notes toggle, warmup toggle, delete button */}
          <span className="w-6 shrink-0" />
          <span className="w-8 shrink-0" />
          <span className="w-7 shrink-0" />
        </div>
      )}

      {/* Sets */}
      <div className="space-y-1 px-2 pb-2">
        {sortedSets.map((set) => (
          <SetRow key={set._id} set={set} unit={unit} />
        ))}
      </div>

      {/* Add set button */}
      <div className="border-t border-gray-100 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-500 hover:text-primary"
          onClick={handleAddSet}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mr-1.5 h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Set
        </Button>
      </div>
    </div>
  );
}

export type { ExerciseItemData, SetData };
