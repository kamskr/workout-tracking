"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import Link from "next/link";
import WorkoutCard from "./WorkoutCard";
import { Button } from "@/components/common/button";

export default function WorkoutHistory() {
  const workouts = useQuery(api.workouts.listWorkouts);
  const preferences = useQuery(api.userPreferences.getPreferences);

  const isLoading = workouts === undefined || preferences === undefined;
  const isEmpty = workouts !== undefined && workouts.length === 0;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {workouts && workouts.length > 0
            ? `${workouts.length} workout${workouts.length !== 1 ? "s" : ""}`
            : ""}
        </p>
        <Button asChild>
          <Link href="/workouts/active">Start Workout</Link>
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
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
            <span className="text-sm font-medium">Loading workouts…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-3">
            <svg
              className="h-6 w-6 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No workouts yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Start your first workout to begin tracking your progress.
          </p>
          <Button asChild className="mt-4">
            <Link href="/workouts/active">Start Workout</Link>
          </Button>
        </div>
      )}

      {/* Workout list — already sorted desc by listWorkouts query */}
      {workouts && workouts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout._id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
