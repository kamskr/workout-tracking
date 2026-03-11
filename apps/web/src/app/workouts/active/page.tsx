"use client";

import ActiveWorkout from "@/components/workouts/ActiveWorkout";

export default function ActiveWorkoutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <ActiveWorkout />
      </div>
    </main>
  );
}
