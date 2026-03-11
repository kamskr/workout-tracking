"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/units";
import { Button } from "@/components/common/button";
import UnitToggle from "./UnitToggle";

interface ActiveWorkoutHeaderProps {
  workoutId: Id<"workouts">;
  name: string;
  startedAt: number;
}

export default function ActiveWorkoutHeader({
  workoutId,
  name,
  startedAt,
}: ActiveWorkoutHeaderProps) {
  const router = useRouter();
  const finishWorkout = useMutation(api.workouts.finishWorkout);
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );
  const [isFinishing, setIsFinishing] = useState(false);

  // Running duration timer — ticks every second
  useEffect(() => {
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick(); // sync immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await finishWorkout({ id: workoutId });
      router.push("/workouts");
    } catch (err) {
      console.error("Failed to finish workout:", err);
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-gray-900">
          {name}
        </h1>
        <div className="mt-1 flex items-center gap-3">
          {/* Duration timer */}
          <div
            className="flex items-center gap-1.5 text-sm text-gray-500"
            aria-label="Workout duration"
            aria-live="polite"
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
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="font-mono tabular-nums" data-testid="workout-timer">
              {formatDuration(elapsed)}
            </span>
          </div>

          {/* Status badge */}
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            In Progress
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UnitToggle />
        <Button
          onClick={handleFinish}
          disabled={isFinishing}
          className="shrink-0"
        >
          {isFinishing ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
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
              Finishing…
            </>
          ) : (
            <>
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
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Finish Workout
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
