"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import WorkoutHistory from "@/components/workouts/WorkoutHistory";

export default function WorkoutsPage() {
  const router = useRouter();
  const createSession = useMutation(api.sessions.createSession);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGroupSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const { sessionId } = await createSession();
      router.push(`/workouts/session/${sessionId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      console.error("[WorkoutsPage] createSession error:", err);
      setError(message);
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Workout History
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage your past workouts.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              data-start-group-session
              onClick={handleStartGroupSession}
              disabled={isCreating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Start Group Session"}
            </button>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
        <WorkoutHistory />
      </div>
    </main>
  );
}
