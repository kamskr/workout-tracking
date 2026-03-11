"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { WeightUnit } from "@/lib/units";
import ActiveWorkoutHeader from "./ActiveWorkoutHeader";
import WorkoutExerciseList from "./WorkoutExerciseList";
import ExercisePicker from "./ExercisePicker";

export default function ActiveWorkout() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createdWorkoutId, setCreatedWorkoutId] = useState<Id<"workouts"> | null>(null);
  const createAttempted = useRef(false);

  const createWorkout = useMutation(api.workouts.createWorkout);

  // Check for existing in-progress workout
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);

  // Determine the active workout ID (existing or just-created)
  const workoutId = activeWorkout?._id ?? createdWorkoutId;

  // Auto-create workout if none exists
  useEffect(() => {
    if (activeWorkout !== undefined && activeWorkout === null && !createAttempted.current && !createdWorkoutId) {
      createAttempted.current = true;
      void createWorkout({ name: "Workout" }).then((id) => {
        setCreatedWorkoutId(id);
      }).catch((err) => {
        console.error("Failed to create workout:", err);
        createAttempted.current = false;
      });
    }
  }, [activeWorkout, createdWorkoutId, createWorkout]);

  // Load workout details once we have an ID
  const workoutDetails = useQuery(
    api.workouts.getWorkoutWithDetails,
    workoutId ? { id: workoutId } : "skip",
  );

  // Load user preferences for unit
  const preferences = useQuery(api.userPreferences.getPreferences);
  const unit: WeightUnit = preferences?.weightUnit ?? "kg";

  // Loading state: waiting for active workout check
  if (activeWorkout === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
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
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  // Creating workout state
  if (!workoutId) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
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
          <span className="text-sm font-medium">Starting workout…</span>
        </div>
      </div>
    );
  }

  // Loading workout details
  if (!workoutDetails) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
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
          <span className="text-sm font-medium">Loading workout…</span>
        </div>
      </div>
    );
  }

  const { workout, exercises } = workoutDetails;

  return (
    <div className="space-y-6">
      <ActiveWorkoutHeader
        workoutId={workout._id}
        name={workout.name ?? "Workout"}
        startedAt={workout.startedAt!}
      />

      <WorkoutExerciseList
        exercises={exercises}
        unit={unit}
        onAddExercise={() => setPickerOpen(true)}
      />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        workoutId={workout._id}
      />
    </div>
  );
}
