"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { WeightUnit } from "@/lib/units";
import SetRow from "./SetRow";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

interface SetData {
  _id: Id<"sets">;
  setNumber: number;
  weight?: number;
  reps?: number;
  isWarmup: boolean;
}

interface ExerciseItemData {
  workoutExercise: {
    _id: Id<"workoutExercises">;
    exerciseId: Id<"exercises">;
    order: number;
  };
  exercise: {
    _id: Id<"exercises">;
    name: string;
    primaryMuscleGroup: string;
    equipment: string;
  } | null;
  sets: SetData[];
}

interface WorkoutExerciseItemProps {
  data: ExerciseItemData;
  unit: WeightUnit;
}

export default function WorkoutExerciseItem({
  data,
  unit,
}: WorkoutExerciseItemProps) {
  const logSet = useMutation(api.sets.logSet);
  const removeExercise = useMutation(
    api.workoutExercises.removeExerciseFromWorkout,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddSet = useCallback(async () => {
    await logSet({
      workoutExerciseId: data.workoutExercise._id,
    });
  }, [logSet, data.workoutExercise._id]);

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

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity",
        isRemoving && "pointer-events-none opacity-50",
      )}
    >
      {/* Exercise header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
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
          <span className="flex-1 text-[10px] font-medium uppercase text-gray-400">
            Weight
          </span>
          <span className="flex-1 text-[10px] font-medium uppercase text-gray-400">
            Reps
          </span>
          <span className="w-8" />
          <span className="w-7" />
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
