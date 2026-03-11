"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ChallengeType = "totalReps" | "totalVolume" | "workoutCount" | "maxWeight";
type ChallengeStatus = "pending" | "active" | "completed" | "cancelled";
type StatusFilter = "active" | "completed" | "my";

/** Typed shape returned by listChallenges (Convex infers a union — narrow it). */
interface ChallengeListItem {
  _id: Id<"challenges">;
  _creationTime: number;
  creatorId: string;
  title: string;
  description?: string;
  type: ChallengeType;
  exerciseId?: Id<"exercises">;
  status: ChallengeStatus;
  startAt: number;
  endAt: number;
  winnerId?: string;
  completedAt?: number;
  createdAt: number;
  participantCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "active" as const, label: "Active" },
  { value: "completed" as const, label: "Completed" },
  { value: "my" as const, label: "My Challenges" },
];

const CHALLENGE_TYPES = [
  { value: "totalReps" as const, label: "Total Reps" },
  { value: "totalVolume" as const, label: "Total Volume" },
  { value: "workoutCount" as const, label: "Workout Count" },
  { value: "maxWeight" as const, label: "Max Weight" },
];

const TYPE_LABELS: Record<ChallengeType, string> = {
  totalReps: "Total Reps",
  totalVolume: "Total Volume",
  workoutCount: "Workout Count",
  maxWeight: "Max Weight",
};

const TYPE_COLORS: Record<ChallengeType, string> = {
  totalReps: "bg-purple-100 text-purple-700",
  totalVolume: "bg-green-100 text-green-700",
  workoutCount: "bg-blue-100 text-blue-700",
  maxWeight: "bg-orange-100 text-orange-700",
};

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeRemaining(endAt: number): string {
  const diff = endAt - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function formatScore(value: number, type: ChallengeType): string {
  switch (type) {
    case "totalReps":
      return `${value} reps`;
    case "totalVolume":
      return `${Math.round(value * 10) / 10} kg`;
    case "workoutCount":
      return `${value} workouts`;
    case "maxWeight":
      return `${Math.round(value * 10) / 10} kg`;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg
        className="h-5 w-5 animate-spin text-gray-400"
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
    </div>
  );
}

// ── StatusPicker ─────────────────────────────────────────────────────────────

function StatusPicker({
  selected,
  onChange,
}: {
  selected: StatusFilter;
  onChange: (s: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Challenge filter">
      {STATUS_FILTERS.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === s.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── TypePicker (for create form) ─────────────────────────────────────────────

function TypePicker({
  selected,
  onChange,
}: {
  selected: ChallengeType;
  onChange: (t: ChallengeType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Challenge type">
      {CHALLENGE_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === t.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── CreateChallengeForm ──────────────────────────────────────────────────────

function CreateChallengeForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChallengeType>("totalReps");
  const [exerciseId, setExerciseId] = useState<string>("");
  const [startAt, setStartAt] = useState(() => toDateInputValue(Date.now()));
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createChallenge = useMutation(api.challenges.createChallenge);
  const exercises = useQuery(api.exercises.listExercises, {});

  const needsExercise = type !== "workoutCount";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate
      if (!title.trim()) {
        setError("Title is required");
        return;
      }
      if (!endAt) {
        setError("End date is required");
        return;
      }

      const startMs = new Date(startAt).getTime();
      const endMs = new Date(endAt).getTime();

      if (endMs <= startMs) {
        setError("End date must be after start date");
        return;
      }
      if (endMs <= Date.now()) {
        setError("End date must be in the future");
        return;
      }
      if (needsExercise && !exerciseId) {
        setError("An exercise is required for this challenge type");
        return;
      }

      setSubmitting(true);
      try {
        await createChallenge({
          title: title.trim(),
          type,
          exerciseId: needsExercise
            ? (exerciseId as Id<"exercises">)
            : undefined,
          startAt: startMs,
          endAt: endMs,
        });
        // Reset form
        setTitle("");
        setType("totalReps");
        setExerciseId("");
        setStartAt(toDateInputValue(Date.now()));
        setEndAt("");
        onCreated();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create challenge");
      } finally {
        setSubmitting(false);
      }
    },
    [title, type, exerciseId, startAt, endAt, needsExercise, createChallenge, onCreated],
  );

  return (
    <div data-challenge-create className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Challenge</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="challenge-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="challenge-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Most Pull-ups This Week"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Type picker */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Type</span>
          <TypePicker selected={type} onChange={setType} />
        </div>

        {/* Exercise selector (conditional) */}
        {needsExercise && (
          <div>
            <label htmlFor="challenge-exercise" className="block text-sm font-medium text-gray-700 mb-1">
              Exercise
            </label>
            {exercises === undefined ? (
              <div className="h-10 w-full max-w-xs animate-pulse rounded-lg bg-gray-200" />
            ) : (
              <select
                id="challenge-exercise"
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select an exercise</option>
                {exercises.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Start date */}
        <div>
          <label htmlFor="challenge-start" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            id="challenge-start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* End date */}
        <div>
          <label htmlFor="challenge-end" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            id="challenge-end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Error display */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
            submitting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          {submitting ? "Creating…" : "Create Challenge"}
        </button>
      </form>
    </div>
  );
}

// ── ChallengeDetail ──────────────────────────────────────────────────────────

function ChallengeDetail({
  challengeId,
  onBack,
}: {
  challengeId: Id<"challenges">;
  onBack: () => void;
}) {
  const { user } = useUser();
  const standings = useQuery(api.challenges.getChallengeStandings, { challengeId });
  const joinChallenge = useMutation(api.challenges.joinChallenge);
  const leaveChallenge = useMutation(api.challenges.leaveChallenge);
  const cancelChallenge = useMutation(api.challenges.cancelChallenge);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  if (standings === undefined) return <Spinner />;

  const { challenge, participants } = standings;
  const currentUserId = user?.id;
  const isCreator = currentUserId === challenge.creatorId;
  const isParticipant = participants.some((p) => p.userId === currentUserId);
  const canJoin =
    !isParticipant &&
    (challenge.status === "pending" || challenge.status === "active");
  const canLeave =
    isParticipant &&
    !isCreator &&
    (challenge.status === "pending" || challenge.status === "active");
  const canCancel =
    isCreator &&
    (challenge.status === "pending" || challenge.status === "active");

  const handleAction = async (action: "join" | "leave" | "cancel") => {
    setActionError(null);
    setActing(true);
    try {
      if (action === "join") await joinChallenge({ challengeId });
      else if (action === "leave") await leaveChallenge({ challengeId });
      else if (action === "cancel") await cancelChallenge({ challengeId });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  // Resolve exercise name from standings data
  const exerciseName = challenge.exerciseId ? "Exercise-specific" : null;

  return (
    <div data-challenge-detail className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to challenges
      </button>

      {/* Challenge info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{challenge.title}</h2>
            {challenge.description && (
              <p className="mt-1 text-sm text-gray-500">{challenge.description}</p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              STATUS_COLORS[challenge.status as ChallengeStatus],
            )}
          >
            {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              TYPE_COLORS[challenge.type as ChallengeType],
            )}
          >
            {TYPE_LABELS[challenge.type as ChallengeType]}
          </span>
          {exerciseName && (
            <span className="text-gray-500">{exerciseName}</span>
          )}
          <span>📅 {formatDate(challenge.startAt)} – {formatDate(challenge.endAt)}</span>
          <span>👥 {participants.length} participants</span>
        </div>

        {/* Winner display for completed challenges */}
        {challenge.status === "completed" && challenge.winnerId && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <span className="text-lg">🏆</span>{" "}
            <span className="font-semibold text-gray-900">
              Winner:{" "}
              {participants.find((p) => p.userId === challenge.winnerId)?.displayName ??
                "Unknown"}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          {canJoin && (
            <button
              data-challenge-join
              type="button"
              disabled={acting}
              onClick={() => handleAction("join")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                acting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
              )}
            >
              Join Challenge
            </button>
          )}
          {canLeave && (
            <button
              type="button"
              disabled={acting}
              onClick={() => handleAction("leave")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                acting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              Leave Challenge
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={acting}
              onClick={() => handleAction("cancel")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                acting
                  ? "bg-red-200 text-red-400 cursor-not-allowed"
                  : "bg-red-100 text-red-700 hover:bg-red-200",
              )}
            >
              Cancel Challenge
            </button>
          )}
        </div>

        {actionError && (
          <p className="mt-2 text-sm text-red-600">{actionError}</p>
        )}
      </div>

      {/* Standings table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <h3 className="px-6 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">
          Standings
        </h3>
        {participants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No participants yet</p>
          </div>
        ) : (
          <table data-challenge-standings className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 w-12">#</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, idx) => {
                const isCurrentUser = p.userId === currentUserId;
                return (
                  <tr
                    key={p._id}
                    className={cn(
                      "border-b border-gray-50 last:border-0",
                      isCurrentUser ? "bg-blue-50" : "hover:bg-gray-50",
                    )}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{p.displayName}</span>
                        <span className="ml-1.5 text-gray-400">@{p.username}</span>
                        {isCurrentUser && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-700">
                      {formatScore(p.currentValue, challenge.type as ChallengeType)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ChallengesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<Id<"challenges"> | null>(null);

  // Derive query params from filter
  const queryArgs = useMemo(() => {
    if (statusFilter === "my") return { myOnly: true as const };
    return { status: statusFilter as "active" | "completed" };
  }, [statusFilter]);

  const rawChallenges = useQuery(api.challenges.listChallenges, queryArgs);
  // Cast: Convex generates a union of all table types, but listChallenges always
  // returns challenge docs with participantCount.
  const challenges = rawChallenges as ChallengeListItem[] | undefined;

  // If viewing a detail, show that instead of the list
  if (selectedChallengeId) {
    return (
      <main className="min-h-screen bg-gray-50" data-challenge-page>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <ChallengeDetail
            challengeId={selectedChallengeId}
            onBack={() => setSelectedChallengeId(null)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" data-challenge-page>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/workouts"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to workouts
        </Link>

        {/* Page header */}
        <div className="mt-6 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Challenges</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compete with friends in time-limited fitness challenges
          </p>
        </div>

        {/* Status filter + create button row */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <StatusPicker selected={statusFilter} onChange={setStatusFilter} />
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              showCreateForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-blue-600 text-white hover:bg-blue-700",
            )}
          >
            {showCreateForm ? "Cancel" : "Create Challenge"}
          </button>
        </div>

        {/* Create form (expandable) */}
        {showCreateForm && (
          <div className="mb-6">
            <CreateChallengeForm onCreated={() => setShowCreateForm(false)} />
          </div>
        )}

        {/* Challenge list */}
        <div data-challenge-list className="space-y-4">
          {challenges === undefined ? (
            <Spinner />
          ) : challenges.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">No challenges found</p>
              <p className="mt-1 text-xs text-gray-400">
                Create one to get started!
              </p>
            </div>
          ) : (
            challenges.map((challenge) => (
              <button
                key={challenge._id}
                type="button"
                onClick={() => setSelectedChallengeId(challenge._id)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {challenge.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          TYPE_COLORS[challenge.type as ChallengeType],
                        )}
                      >
                        {TYPE_LABELS[challenge.type as ChallengeType]}
                      </span>
                      <span className="text-xs text-gray-500">
                        👥 {challenge.participantCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {challenge.status === "active" && (
                      <span className="text-xs font-medium text-green-600">
                        {formatTimeRemaining(challenge.endAt)}
                      </span>
                    )}
                    {challenge.status === "completed" && challenge.winnerId && (
                      <span className="text-xs text-gray-500">🏆 Winner declared</span>
                    )}
                    {challenge.status === "completed" && !challenge.winnerId && (
                      <span className="text-xs text-gray-500">Completed</span>
                    )}
                    {challenge.status === "cancelled" && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS.cancelled,
                        )}
                      >
                        Cancelled
                      </span>
                    )}
                    {challenge.status === "pending" && (
                      <span className="text-xs text-yellow-600">
                        Starts {formatDate(challenge.startAt)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
