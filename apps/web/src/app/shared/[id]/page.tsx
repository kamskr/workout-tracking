"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import SharedWorkoutView from "@/components/sharing/SharedWorkoutView";
import CloneButton from "@/components/sharing/CloneButton";
import Link from "next/link";

export default function SharedWorkoutPage() {
  const params = useParams<{ id: string }>();
  const feedItemId = params.id as Id<"feedItems">;
  const { isSignedIn } = useUser();

  const sharedWorkout = useQuery(
    api.sharing.getSharedWorkout,
    feedItemId ? { feedItemId } : "skip",
  );

  // Loading state
  if (sharedWorkout === undefined) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
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
              <span className="text-sm font-medium">Loading shared workout…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Null result — workout not available
  if (sharedWorkout === null) {
    return (
      <main className="min-h-screen bg-gray-50" data-shared-workout>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="text-center py-24">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-8 w-8 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">
              Workout not available
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This workout may be private, deleted, or the link may be invalid.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
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
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              Go to homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Data available — render shared workout
  return (
    <main className="min-h-screen bg-gray-50" data-shared-workout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Shared Workout
            </p>
          </div>
          {isSignedIn && (
            <CloneButton
              feedItemId={feedItemId}
              workoutName={sharedWorkout.workout.name}
            />
          )}
        </div>

        <SharedWorkoutView data={sharedWorkout} />
      </div>
    </main>
  );
}
