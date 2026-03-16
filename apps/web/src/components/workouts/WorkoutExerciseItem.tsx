"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Clock3, History, Sparkles, Trash2 } from "lucide-react";
import { formatWeight, type WeightUnit } from "@/lib/units";
import SetRow from "./SetRow";
import RestDurationConfig from "./RestDurationConfig";
import { useRestTimer } from "./RestTimerContext";
import { Button } from "@/components/common/button";
import { AppBadge } from "@/components/app-shell/AppBadge";
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
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (id: Id<"workoutExercises">, selected: boolean) => void;
  userDefaultRestSeconds?: number;
}

function formatPreviousPerformance(
  sets: { weight?: number; reps?: number }[],
  unit: WeightUnit,
): string {
  if (sets.length === 0) return "";

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

  const previousPerformance = useQuery(
    api.sets.getPreviousPerformance,
    data.workoutExercise.exerciseId
      ? { exerciseId: data.workoutExercise.exerciseId }
      : "skip",
  );

  const workoutPRs = useQuery(api.personalRecords.getWorkoutPRs, {
    workoutId: data.workoutExercise.workoutId,
  });

  const exercisePRs = useMemo(() => {
    if (!workoutPRs) return [];
    return workoutPRs.filter(
      (pr) => pr.exerciseId === data.workoutExercise.exerciseId,
    );
  }, [workoutPRs, data.workoutExercise.exerciseId]);

  const resolvedRestSeconds =
    data.workoutExercise.restSeconds ??
    data.exercise?.defaultRestSeconds ??
    userDefaultRestSeconds ??
    60;

  const handleAddSet = useCallback(async () => {
    await logSet({
      workoutExerciseId: data.workoutExercise._id,
    });

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
        "workout-surface flex flex-col transition-opacity duration-200",
        isRemoving && "pointer-events-none opacity-50",
        selected && "ring-2 ring-primary/35 ring-offset-2 ring-offset-[#fff7f0]",
      )}
      data-workout-exercise-item
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/65 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) =>
                onSelectionChange?.(data.workoutExercise._id, e.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary accent-primary"
              aria-label={`Select ${data.exercise?.name ?? "exercise"} for superset`}
            />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge tone="neutral">Exercise</AppBadge>
              {data.exercise && (
                <span className="workout-section-label capitalize">
                  {data.exercise.primaryMuscleGroup.replace(/([a-z])([A-Z])/g, "$1 $2")} · {data.exercise.equipment}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                {data.exercise?.name ?? "Unknown Exercise"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep set entry quick while surfacing previous performance, PR moments, and rest controls in the same card rhythm.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {prevPerfSummary && (
                <span className="workout-kpi-pill workout-kpi-pill--cool">
                  <History className="h-3.5 w-3.5" />
                  Last: {prevPerfSummary}
                </span>
              )}
              {previousPerformance === null && (
                <span className="workout-kpi-pill">
                  <Sparkles className="h-3.5 w-3.5" />
                  First time on this movement
                </span>
              )}
              <span className="workout-kpi-pill workout-kpi-pill--warning">
                <Clock3 className="h-3.5 w-3.5" />
                Rest {resolvedRestSeconds === 0 ? "Off" : `${Math.round(resolvedRestSeconds / 60)}m max`}
              </span>
            </div>

            {exercisePRs.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-pr-badge>
                {exercisePRs.map((pr) => (
                  <span
                    key={pr.type}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,248,232,0.98),rgba(255,236,199,0.9))] px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-[0_10px_18px_rgba(168,100,14,0.12)]",
                      "animate-[pr-badge-in_0.3s_ease-out]",
                    )}
                  >
                    🏆
                    {pr.type === "weight"
                      ? "Weight PR"
                      : pr.type === "volume"
                        ? "Volume PR"
                        : "Reps PR"}
                  </span>
                ))}
              </div>
            )}

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
          className="shrink-0 rounded-full bg-white/68 px-3 text-slate-500 hover:bg-white hover:text-destructive"
          onClick={handleRemoveExercise}
          aria-label={`Remove ${data.exercise?.name ?? "exercise"}`}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Remove
        </Button>
      </div>

      {sortedSets.length > 0 && (
        <div className="px-3 pt-4 sm:px-4">
          <div className="exercise-detail-panel flex items-center gap-2 px-3 py-2.5">
            <span className="w-8 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Set
            </span>
            <span className="min-w-0 flex-[2] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Weight
            </span>
            <span className="min-w-0 flex-[2] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Reps
            </span>
            <span className="w-14 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              RPE
            </span>
            <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Tempo
            </span>
            <span className="w-6 shrink-0" />
            <span className="w-8 shrink-0" />
            <span className="w-7 shrink-0" />
          </div>
        </div>
      )}

      <div className="space-y-2 px-2 py-3 sm:px-3">
        {sortedSets.map((set) => (
          <SetRow key={set._id} set={set} unit={unit} />
        ))}
      </div>

      <div className="border-t border-white/65 px-4 py-3 sm:px-5">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full rounded-full border-white/70 bg-white/72 text-slate-700 shadow-sm hover:bg-white"
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
