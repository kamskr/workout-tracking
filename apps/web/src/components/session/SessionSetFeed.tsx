"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/lib/units";

/** Deterministic color from a user ID string for participant badges. */
const BADGE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700",
];

function badgeColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

interface SessionSetFeedProps {
  sessionId: Id<"groupSessions">;
}

export default function SessionSetFeed({ sessionId }: SessionSetFeedProps) {
  const sessionSets = useQuery(api.sessions.getSessionSets, { sessionId });
  const preferences = useQuery(api.userPreferences.getPreferences);
  const unit: WeightUnit = preferences?.weightUnit ?? "kg";

  if (sessionSets === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-gray-100 p-4">
            <div className="h-4 w-32 rounded bg-gray-200 mb-2" />
            <div className="h-3 w-48 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  // Flatten all exercises with sets into a single feed grouped by exercise
  type FeedEntry = {
    exerciseId: string;
    exerciseName: string;
    entries: {
      participantName: string;
      participantUserId: string;
      weight: number | undefined;
      reps: number | undefined;
      rpe: number | undefined;
      setNumber: number;
      completedAt: number | undefined;
    }[];
  };

  const exerciseMap = new Map<string, FeedEntry>();

  for (const participant of sessionSets) {
    for (const exercise of participant.exercises) {
      if (exercise.sets.length === 0) continue;

      let entry = exerciseMap.get(exercise.exerciseId);
      if (!entry) {
        entry = {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          entries: [],
        };
        exerciseMap.set(exercise.exerciseId, entry);
      }

      for (let i = 0; i < exercise.sets.length; i++) {
        const s = exercise.sets[i];
        entry.entries.push({
          participantName: participant.participantName,
          participantUserId: participant.participantUserId,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          setNumber: i + 1,
          completedAt: s.completedAt,
        });
      }
    }
  }

  // Sort entries within each exercise by completedAt (newest first)
  exerciseMap.forEach((entry) => {
    entry.entries.sort(
      (a: FeedEntry["entries"][number], b: FeedEntry["entries"][number]) =>
        (b.completedAt ?? 0) - (a.completedAt ?? 0),
    );
  });

  const feedGroups = Array.from(exerciseMap.values());

  // Empty state
  if (feedGroups.length === 0) {
    return (
      <div data-session-sets className="text-center py-12">
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
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-900">
          No sets logged yet
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Start your workout! Sets from all participants will appear here.
        </p>
      </div>
    );
  }

  return (
    <div data-session-sets className="space-y-6">
      {feedGroups.map((group) => (
        <div
          key={group.exerciseId}
          className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          {/* Exercise header */}
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">
              {group.exerciseName}
            </h4>
          </div>

          {/* Set entries */}
          <div className="divide-y divide-gray-50">
            {group.entries.map((entry, idx) => (
              <div
                key={`${entry.participantUserId}-${entry.setNumber}-${idx}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* Participant badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor(entry.participantUserId)}`}
                >
                  {entry.participantName}
                </span>

                {/* Set details */}
                <span className="text-sm text-gray-700">
                  {entry.weight != null ? formatWeight(entry.weight, unit) : "—"}
                  {" × "}
                  {entry.reps ?? "—"}
                  {entry.rpe != null && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      RPE {entry.rpe}
                    </span>
                  )}
                </span>

                {/* Set number */}
                <span className="ml-auto text-xs text-gray-400">
                  Set {entry.setNumber}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
