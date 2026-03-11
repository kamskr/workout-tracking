"use client";

import ExerciseList from "@/components/exercises/ExerciseList";

export default function ExercisesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Exercise Library
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and filter exercises by muscle group, equipment, or name.
          </p>
        </div>
        <ExerciseList />
      </div>
    </main>
  );
}
