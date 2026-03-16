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
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_16px_30px_rgba(83,37,10,0.06)]">
            <div className="mb-3 h-4 w-32 rounded bg-slate-200" />
            <div className="space-y-2">
              <div className="h-3 w-48 rounded bg-slate-200" />
              <div className="h-3 w-36 rounded bg-slate-200" />
            </div>
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
      <div data-session-sets className="feature-empty-state rounded-[28px] border border-dashed border-[rgba(138,91,57,0.2)] bg-[linear-gradient(180deg,rgba(255,250,245,0.9),rgba(255,245,237,0.76))] px-6 py-12 text-center">
        <div className="feature-empty-state__icon feature-empty-state__icon--warm">
          <svg
            className="h-6 w-6"
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
        <div className="feature-empty-state__body">
          <p className="feature-empty-state__eyebrow">Live feed idle</p>
          <h3 className="feature-empty-state__title">No sets logged yet</h3>
          <p className="feature-empty-state__copy">
            Start your workout. Sets from all participants will appear here with the existing collaboration hooks intact.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-session-sets className="space-y-5">
      {feedGroups.map((group) => (
        <div
          key={group.exerciseId}
          className="workout-surface overflow-hidden rounded-[28px]"
        >
          <div className="border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,252,248,0.92),rgba(255,243,232,0.72))] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Exercise stream</p>
                <h4 className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">
                  {group.exerciseName}
                </h4>
              </div>
              <span className="workout-kpi-pill">{group.entries.length} set{group.entries.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="divide-y divide-white/60">
            {group.entries.map((entry, idx) => (
              <div
                key={`${entry.participantUserId}-${entry.setNumber}-${idx}`}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColor(entry.participantUserId)}`}
                >
                  {entry.participantName}
                </span>

                <span className="text-sm font-medium text-slate-700">
                  {entry.weight != null ? formatWeight(entry.weight, unit) : "—"}
                  {" × "}
                  {entry.reps ?? "—"}
                  {entry.rpe != null ? (
                    <span className="ml-2 text-xs uppercase tracking-[0.12em] text-slate-400">RPE {entry.rpe}</span>
                  ) : null}
                </span>

                <span className="ml-auto text-xs uppercase tracking-[0.12em] text-slate-400">
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
