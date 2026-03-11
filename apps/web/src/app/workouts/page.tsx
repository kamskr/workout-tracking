"use client";

import WorkoutHistory from "@/components/workouts/WorkoutHistory";

export default function WorkoutsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Workout History
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your past workouts.
          </p>
        </div>
        <WorkoutHistory />
      </div>
    </main>
  );
}
