"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Dumbbell, Sparkles, TimerReset } from "lucide-react";
import type { WeightUnit } from "@/lib/units";
import { AppBadge } from "@/components/app-shell/AppBadge";
import ActiveWorkoutHeader from "./ActiveWorkoutHeader";
import WorkoutExerciseList from "./WorkoutExerciseList";
import ExercisePicker from "./ExercisePicker";
import { RestTimerProvider } from "./RestTimerContext";
import RestTimerDisplay from "./RestTimerDisplay";

export default function ActiveWorkout() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createdWorkoutId, setCreatedWorkoutId] = useState<Id<"workouts"> | null>(null);
  const createAttempted = useRef(false);

  const createWorkout = useMutation(api.workouts.createWorkout);

  const activeWorkout = useQuery(api.workouts.getActiveWorkout);
  const workoutId = activeWorkout?._id ?? createdWorkoutId;

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

  const workoutDetails = useQuery(
    api.workouts.getWorkoutWithDetails,
    workoutId ? { id: workoutId } : "skip",
  );

  const preferences = useQuery(api.userPreferences.getPreferences);
  const unit: WeightUnit = preferences?.weightUnit ?? "kg";

  if (activeWorkout === undefined) {
    return (
      <div className="workout-surface workout-surface--muted p-6 sm:p-8">
        <div className="feature-inline-state justify-center py-14">
          <span className="feature-inline-state__spinner" aria-hidden="true" />
          <span className="text-sm font-medium">Loading active workout…</span>
        </div>
      </div>
    );
  }

  if (!workoutId) {
    return (
      <div className="workout-surface workout-surface--accent p-6 sm:p-8">
        <div className="feature-inline-state justify-center py-14">
          <span className="feature-inline-state__spinner" aria-hidden="true" />
          <span className="text-sm font-medium">Starting workout…</span>
        </div>
      </div>
    );
  }

  if (!workoutDetails) {
    return (
      <div className="workout-surface workout-surface--cool p-6 sm:p-8">
        <div className="feature-inline-state justify-center py-14">
          <span className="feature-inline-state__spinner" aria-hidden="true" />
          <span className="text-sm font-medium">Loading workout details…</span>
        </div>
      </div>
    );
  }

  const { workout, exercises } = workoutDetails;
  const userDefaultRestSeconds =
    preferences && "defaultRestSeconds" in preferences
      ? preferences.defaultRestSeconds
      : undefined;

  return (
    <RestTimerProvider>
      <div className="space-y-6" data-active-workout>
        <div className="workout-surface workout-surface--accent p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <AppBadge tone="warning">Active workout</AppBadge>
                <span className="workout-section-label">High-frequency logging flow</span>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2rem]">
                  Log sets, group supersets, and keep rest timing in one polished working surface.
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  The active flow now matches the refreshed browse and detail pages without changing mutations, timers, or PR wiring.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="workout-kpi-pill">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
                </span>
                <span className="workout-kpi-pill workout-kpi-pill--cool">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium shell carry-through
                </span>
                <span className="workout-kpi-pill workout-kpi-pill--warning">
                  <TimerReset className="h-3.5 w-3.5" />
                  Rest timer intact
                </span>
              </div>
            </div>
          </div>

          <ActiveWorkoutHeader
            workoutId={workout._id}
            name={workout.name ?? "Workout"}
            startedAt={workout.startedAt!}
          />
        </div>

        <RestTimerDisplay />

        <WorkoutExerciseList
          exercises={exercises}
          unit={unit}
          onAddExercise={() => setPickerOpen(true)}
          userDefaultRestSeconds={userDefaultRestSeconds}
        />

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          workoutId={workout._id}
        />
      </div>
    </RestTimerProvider>
  );
}
