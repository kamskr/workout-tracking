"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { WeightUnit } from "@/lib/units";
import WorkoutExerciseItem from "./WorkoutExerciseItem";
import { Button } from "@/components/common/button";

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

interface WorkoutExerciseListProps {
  exercises: ExerciseItemData[];
  unit: WeightUnit;
  onAddExercise: () => void;
}

export default function WorkoutExerciseList({
  exercises,
  unit,
  onAddExercise,
}: WorkoutExerciseListProps) {
  // Sort by order
  const sorted = [...exercises].sort(
    (a, b) => a.workoutExercise.order - b.workoutExercise.order,
  );

  return (
    <div className="space-y-4">
      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto h-8 w-8 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-500">
            No exercises yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Add an exercise to start logging sets.
          </p>
        </div>
      )}

      {sorted.map((item) => (
        <WorkoutExerciseItem
          key={item.workoutExercise._id}
          data={item}
          unit={unit}
        />
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={onAddExercise}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="mr-2 h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add Exercise
      </Button>
    </div>
  );
}
