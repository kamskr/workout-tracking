"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { formatWeight, formatDuration } from "@/lib/units";

// ---------------------------------------------------------------------------
// Badge colors for participant cards
// ---------------------------------------------------------------------------

const CARD_COLORS = [
  "border-blue-200 bg-blue-50",
  "border-green-200 bg-green-50",
  "border-purple-200 bg-purple-50",
  "border-amber-200 bg-amber-50",
  "border-pink-200 bg-pink-50",
  "border-teal-200 bg-teal-50",
  "border-red-200 bg-red-50",
  "border-indigo-200 bg-indigo-50",
];

function cardColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

// ---------------------------------------------------------------------------
// Stat item helper
// ---------------------------------------------------------------------------

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionSummaryProps {
  sessionId: Id<"groupSessions">;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SessionSummary({ sessionId }: SessionSummaryProps) {
  const summary = useQuery(api.sessions.getSessionSummary, { sessionId });

  // Loading state
  if (summary === undefined) {
    return (
      <div data-session-summary className="workout-surface rounded-[28px] px-6 py-16">
        <div className="feature-inline-state justify-center">
          <span className="feature-inline-state__spinner" aria-hidden="true" />
          <span>Loading summary…</span>
        </div>
      </div>
    );
  }

  const completedTime = summary.completedAt
    ? new Date(summary.completedAt).toLocaleString()
    : "In progress";

  const totalParticipants = summary.participantSummaries.length;

  return (
    <div data-session-summary className="space-y-6">
      <div className="workout-surface workout-surface--accent rounded-[30px] p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/70 bg-white/88 shadow-[0_18px_34px_rgba(83,37,10,0.08)]">
          <svg
            className="h-8 w-8 text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Session recap</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Session Complete!</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {completedTime} · {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {summary.participantSummaries.map((p) => (
          <div
            key={p.userId}
            className={`rounded-[28px] border p-5 shadow-[0_20px_38px_rgba(83,37,10,0.08)] ${cardColor(p.userId)}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Participant</p>
                <h3 className="mt-1 truncate text-lg font-semibold tracking-[-0.04em] text-slate-950">
                  {p.displayName}
                </h3>
              </div>
              <span className="workout-kpi-pill">Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Exercises" value={String(p.exerciseCount)} />
              <StatItem label="Sets" value={String(p.setCount)} />
              <StatItem label="Volume" value={formatWeight(p.totalVolume, "kg")} />
              <StatItem label="Duration" value={formatDuration(p.durationSeconds)} />
            </div>
          </div>
        ))}
      </div>

      {totalParticipants === 0 ? (
        <div className="feature-empty-state py-8">
          <div className="feature-empty-state__body">
            <h3 className="feature-empty-state__title">No workout data was recorded</h3>
            <p className="feature-empty-state__copy">The summary shell still renders cleanly even if a session ends before anyone logs work.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
