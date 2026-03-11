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
      <div data-session-summary className="flex items-center justify-center py-16">
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
          <span className="text-sm font-medium">Loading summary…</span>
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
      {/* ── Summary header ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-3">
          <svg
            className="h-7 w-7 text-green-600"
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
        <h2 className="text-lg font-bold text-gray-900">Session Complete!</h2>
        <p className="mt-1 text-sm text-gray-500">
          {completedTime} · {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Per-participant cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summary.participantSummaries.map((p) => (
          <div
            key={p.userId}
            className={`rounded-xl border p-4 shadow-sm ${cardColor(p.userId)}`}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-3 truncate">
              {p.displayName}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                label="Exercises"
                value={String(p.exerciseCount)}
              />
              <StatItem
                label="Sets"
                value={String(p.setCount)}
              />
              <StatItem
                label="Volume"
                value={formatWeight(p.totalVolume, "kg")}
              />
              <StatItem
                label="Duration"
                value={formatDuration(p.durationSeconds)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty state if no participants */}
      {totalParticipants === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            No workout data was recorded for this session.
          </p>
        </div>
      )}
    </div>
  );
}
