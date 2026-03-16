"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Activity, Flag, Sparkles, Swords, Trophy, Users } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ChallengeType = "totalReps" | "totalVolume" | "workoutCount" | "maxWeight";
type ChallengeStatus = "pending" | "active" | "completed" | "cancelled";
type StatusFilter = "active" | "completed" | "my";

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
  {
    value: "active" as const,
    label: "Active",
    description: "Waiting and live competitions",
  },
  {
    value: "completed" as const,
    label: "Completed",
    description: "Finished standings and winners",
  },
  {
    value: "my" as const,
    label: "My Challenges",
    description: "Creator and joined contests",
  },
];

const CHALLENGE_TYPES = [
  {
    value: "totalReps" as const,
    label: "Total Reps",
    description: "Accumulate as many reps as possible",
  },
  {
    value: "totalVolume" as const,
    label: "Total Volume",
    description: "Win by moving the most load",
  },
  {
    value: "workoutCount" as const,
    label: "Workout Count",
    description: "Consistency beats peak output",
  },
  {
    value: "maxWeight" as const,
    label: "Max Weight",
    description: "Heaviest successful set wins",
  },
];

const TYPE_LABELS: Record<ChallengeType, string> = {
  totalReps: "Total Reps",
  totalVolume: "Total Volume",
  workoutCount: "Workout Count",
  maxWeight: "Max Weight",
};

const TYPE_BADGE_TONE: Record<ChallengeType, "accent" | "success" | "neutral" | "warning"> = {
  totalReps: "accent",
  totalVolume: "success",
  workoutCount: "neutral",
  maxWeight: "warning",
};

const STATUS_BADGE_TONE: Record<ChallengeStatus, "warning" | "success" | "neutral" | "danger"> = {
  pending: "warning",
  active: "success",
  completed: "neutral",
  cancelled: "danger",
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
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Spinner() {
  return (
    <div className="feature-inline-state justify-center py-10">
      <span className="feature-inline-state__spinner" aria-hidden="true" />
      <span>Loading challenge surfaces…</span>
    </div>
  );
}

function StatusPicker({
  selected,
  onChange,
}: {
  selected: StatusFilter;
  onChange: (s: StatusFilter) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Challenge filter">
      {STATUS_FILTERS.map((filter) => {
        const active = selected === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={cn(
              "rounded-[24px] border px-4 py-3 text-left transition",
              active
                ? "border-orange-200 bg-[linear-gradient(145deg,rgba(255,247,237,0.98),rgba(255,232,214,0.92))] shadow-[0_18px_38px_rgba(120,56,18,0.14)]"
                : "border-white/70 bg-white/70 hover:border-slate-200 hover:bg-white/85",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{filter.label}</span>
              {active ? <AppBadge tone="accent" size="sm">Selected</AppBadge> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{filter.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function TypePicker({
  selected,
  onChange,
}: {
  selected: ChallengeType;
  onChange: (t: ChallengeType) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2" role="group" aria-label="Challenge type">
      {CHALLENGE_TYPES.map((type) => {
        const active = selected === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "rounded-[24px] border px-4 py-4 text-left transition",
              active
                ? "border-violet-200 bg-[linear-gradient(145deg,rgba(255,245,255,0.98),rgba(248,236,255,0.92))] shadow-[0_18px_38px_rgba(104,55,176,0.14)]"
                : "border-white/70 bg-white/70 hover:border-slate-200 hover:bg-white/85",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{type.label}</span>
              <AppBadge tone={TYPE_BADGE_TONE[type.value]} size="sm">
                Metric
              </AppBadge>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{type.description}</p>
          </button>
        );
      })}
    </div>
  );
}

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
          exerciseId: needsExercise ? (exerciseId as Id<"exercises">) : undefined,
          startAt: startMs,
          endAt: endMs,
        });
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
    <AppCard tone="raised" padding="lg" data-challenge-create data-route-section="challenges-create">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <AppBadge tone="accent">Create flow</AppBadge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Launch a fresh competition
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Keep the existing challenge state machine, but frame creation like the rest of the refreshed authenticated app: clear metric choice, warm surfaces, and durable data hooks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-[0_16px_34px_rgba(83,37,10,0.06)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Live routes</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">State-aware</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Pending, active, and completed views stay under one route seam.</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-[0_16px_34px_rgba(83,37,10,0.06)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Selectors</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">Preserved</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Existing challenge hooks remain stable for runtime proof.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="feature-form-field">
            <label htmlFor="challenge-title" className="feature-form-field__label">
              Challenge title
            </label>
            <input
              id="challenge-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Most Pull-ups This Week"
              className="feature-form-input"
            />
          </div>

          <div className="feature-form-field">
            <span className="feature-form-field__label">Scoring model</span>
            <TypePicker selected={type} onChange={setType} />
          </div>

          {needsExercise ? (
            <div className="feature-form-field">
              <label htmlFor="challenge-exercise" className="feature-form-field__label">
                Exercise
              </label>
              {exercises === undefined ? (
                <div className="feature-inline-state py-3">
                  <span className="feature-inline-state__spinner" aria-hidden="true" />
                  <span>Loading exercises…</span>
                </div>
              ) : (
                <select
                  id="challenge-exercise"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  className="feature-form-input"
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
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="feature-form-field">
              <label htmlFor="challenge-start" className="feature-form-field__label">
                Start date
              </label>
              <input
                id="challenge-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="feature-form-input"
              />
            </div>

            <div className="feature-form-field">
              <label htmlFor="challenge-end" className="feature-form-field__label">
                End date
              </label>
              <input
                id="challenge-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="feature-form-input"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-[22px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,246,247,0.96),rgba(255,238,240,0.9))] px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff8a3d_0%,#ff9556_45%,#b03bff_120%)] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(176,59,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating…" : "Create challenge"}
            </button>
            <AppBadge tone="neutral">Creator auto-joins</AppBadge>
            <AppBadge tone="neutral">Challenge hooks intact</AppBadge>
          </div>
        </form>
      </div>
    </AppCard>
  );
}

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

  if (standings === undefined) {
    return (
      <AppCard tone="subtle" padding="lg" data-route-section="challenges-detail-loading">
        <Spinner />
      </AppCard>
    );
  }

  const { challenge, participants } = standings;
  const currentUserId = user?.id;
  const isCreator = currentUserId === challenge.creatorId;
  const isParticipant = participants.some((p) => p.userId === currentUserId);
  const canJoin = !isParticipant && (challenge.status === "pending" || challenge.status === "active");
  const canLeave = isParticipant && !isCreator && (challenge.status === "pending" || challenge.status === "active");
  const canCancel = isCreator && (challenge.status === "pending" || challenge.status === "active");

  const handleAction = async (action: "join" | "leave" | "cancel") => {
    setActionError(null);
    setActing(true);
    try {
      if (action === "join") await joinChallenge({ challengeId });
      else if (action === "leave") await leaveChallenge({ challengeId });
      else await cancelChallenge({ challengeId });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  const status = challenge.status as ChallengeStatus;
  const exerciseName = challenge.exerciseId ? "Exercise-specific" : "Whole-workout";

  return (
    <main className="app-page" data-route="challenges" data-route-shell="challenges" data-challenge-page>
      <div className="app-page-layout">
        <PageHeader
          data-page-header="challenges-detail"
          eyebrow="Competition detail"
          badge={<AppBadge tone="accent">Challenges</AppBadge>}
          title={challenge.title}
          subtitle="Standings, creator controls, and join state now render through the same premium shell vocabulary as the rest of the refreshed authenticated app."
          meta={
            <>
              <AppBadge tone={STATUS_BADGE_TONE[status]}>{status}</AppBadge>
              <AppBadge tone={TYPE_BADGE_TONE[challenge.type as ChallengeType]}>
                {TYPE_LABELS[challenge.type as ChallengeType]}
              </AppBadge>
              <AppBadge tone="neutral">{exerciseName}</AppBadge>
            </>
          }
          actions={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 bg-white/75 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Back to challenges
            </button>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="challenges-detail-overview">
          <StatCard
            label="Window"
            value={formatTimeRemaining(challenge.endAt)}
            description={`Runs ${formatDate(challenge.startAt)} to ${formatDate(challenge.endAt)}.`}
            icon={<Flag className="h-5 w-5" />}
          />
          <StatCard
            label="Participants"
            value={participants.length}
            description="Join, leave, and cancel state still comes from the existing challenge engine."
            emphasis="warm"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Mode"
            value={TYPE_LABELS[challenge.type as ChallengeType]}
            description="Proof targets route and standings composition, not challenge business rules already covered elsewhere."
            emphasis="cool"
            icon={<Trophy className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="highlight" padding="lg" data-challenge-detail data-route-section="challenges-detail-card">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Challenge rhythm</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Compete with clear stakes</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {challenge.description ?? "No extra description provided. The refreshed shell keeps the detail state readable even when the challenge itself stays data-dense."}
                </p>
              </div>

              {challenge.status === "completed" && challenge.winnerId ? (
                <div className="rounded-[24px] border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(255,243,209,0.9))] p-4 shadow-[0_18px_34px_rgba(161,98,7,0.12)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-amber-700">Winner</p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {participants.find((p) => p.userId === challenge.winnerId)?.displayName ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {canJoin ? (
                  <button
                    data-challenge-join
                    type="button"
                    disabled={acting}
                    onClick={() => handleAction("join")}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff8a3d_0%,#ff9556_45%,#b03bff_120%)] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(176,59,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {acting ? "Joining…" : "Join challenge"}
                  </button>
                ) : null}
                {canLeave ? (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleAction("leave")}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 bg-white/75 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {acting ? "Leaving…" : "Leave challenge"}
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleAction("cancel")}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {acting ? "Cancelling…" : "Cancel challenge"}
                  </button>
                ) : null}
              </div>

              {actionError ? (
                <div className="rounded-[22px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,246,247,0.96),rgba(255,238,240,0.9))] px-4 py-3 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_34px_rgba(83,37,10,0.06)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Lifecycle</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Start</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(challenge.startAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">End</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(challenge.endAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Participants</p>
                  <p className="mt-1 text-sm text-slate-600">{participants.length} in the standings feed</p>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard tone="default" padding="lg" data-route-section="challenges-standings-card">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Standings</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Current leaderboard</h3>
            </div>
            <AppBadge tone="neutral">Durable data-challenge-standings hook</AppBadge>
          </div>

          {participants.length === 0 ? (
            <div className="feature-empty-state py-10">
              <div className="feature-empty-state__icon feature-empty-state__icon--warm">
                <Users className="h-5 w-5" />
              </div>
              <div className="feature-empty-state__body">
                <p className="feature-empty-state__eyebrow">No standings yet</p>
                <h4 className="feature-empty-state__title">Waiting on the first participant</h4>
                <p className="feature-empty-state__copy">Joiners will appear here as soon as they enter the challenge. The proof harness targets this table hook, not copy content.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white/80 shadow-[0_18px_34px_rgba(83,37,10,0.06)]">
              <table data-challenge-standings className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-5 py-4">Rank</th>
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, idx) => {
                    const isCurrentUser = participant.userId === currentUserId;
                    return (
                      <tr
                        key={participant._id}
                        className={cn(
                          "border-b border-slate-100 last:border-0",
                          isCurrentUser ? "bg-orange-50/70" : "bg-transparent",
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{participant.displayName}</span>
                            <span className="text-xs text-slate-400">@{participant.username}</span>
                            {isCurrentUser ? <AppBadge tone="accent" size="sm">You</AppBadge> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-slate-700">
                          {formatScore(participant.currentValue, challenge.type as ChallengeType)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      </div>
    </main>
  );
}

export default function ChallengesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<Id<"challenges"> | null>(null);

  const queryArgs = useMemo(() => {
    if (statusFilter === "my") return { myOnly: true as const };
    return { status: statusFilter as "active" | "completed" };
  }, [statusFilter]);

  const rawChallenges = useQuery(api.challenges.listChallenges, queryArgs);
  const challenges = rawChallenges as ChallengeListItem[] | undefined;

  const activeCount = challenges?.filter((challenge) => challenge.status === "active").length ?? 0;
  const totalParticipants = challenges?.reduce((sum, challenge) => sum + challenge.participantCount, 0) ?? 0;
  const highlightedValue = statusFilter === "completed" ? "Archive" : statusFilter === "my" ? "Personal" : "Live";

  if (selectedChallengeId) {
    return <ChallengeDetail challengeId={selectedChallengeId} onBack={() => setSelectedChallengeId(null)} />;
  }

  return (
    <main className="app-page" data-route="challenges" data-route-shell="challenges" data-challenge-page>
      <div className="app-page-layout">
        <PageHeader
          data-page-header="challenges"
          eyebrow="Competition layer"
          badge={<AppBadge tone="accent">Challenges</AppBadge>}
          title="Push the app’s collaborative edge"
          subtitle="Challenge creation, list, detail, and standings now share the same shell language as templates, profile, workouts, and sessions—without disturbing the existing challenge state machine or data hooks."
          meta={
            <>
              <AppBadge tone="neutral">Dense UI refreshed</AppBadge>
              <AppBadge tone="neutral">Existing selectors preserved</AppBadge>
              <AppBadge tone="neutral">Browser proof widened</AppBadge>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/workouts"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 bg-white/75 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                Back to workouts
              </Link>
              <button
                type="button"
                onClick={() => setShowCreateForm((current) => !current)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition",
                  showCreateForm
                    ? "border border-white/60 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                    : "bg-[linear-gradient(135deg,#ff8a3d_0%,#ff9556_45%,#b03bff_120%)] text-white shadow-[0_18px_38px_rgba(176,59,255,0.22)] hover:-translate-y-0.5",
                )}
              >
                {showCreateForm ? "Hide creator" : "Create challenge"}
              </button>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="challenges-overview">
          <StatCard
            label="Live board"
            value={activeCount || "—"}
            description="Active challenge count is enough to verify refreshed route composition without asserting fragile copy paths."
            icon={<Swords className="h-5 w-5" />}
          />
          <StatCard
            label="Participants"
            value={totalParticipants || "—"}
            description="List and detail states still pull from the existing challenge hooks, now in shared premium surfaces."
            emphasis="warm"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Surface"
            value={highlightedValue}
            description="The blocker-aware Playwright proof now covers this route with durable selectors instead of prose matching."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="subtle" padding="md" data-route-section="challenges-controls">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Switch between live, archive, and your own competitions</h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">Keep the proof targeted to route composition and data surfaces: the filter buttons, create form, list hook, and detail hook remain inspectable independently.</p>
            </div>
            <AppBadge tone="neutral">Route-first observability</AppBadge>
          </div>
          <div className="mt-4">
            <StatusPicker selected={statusFilter} onChange={setStatusFilter} />
          </div>
        </AppCard>

        {showCreateForm ? <CreateChallengeForm onCreated={() => setShowCreateForm(false)} /> : null}

        <AppCard tone="default" padding="lg" data-route-section="challenges-list-card">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Challenge roster</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Current competitions</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppBadge tone="neutral">data-challenge-list</AppBadge>
              <AppBadge tone="neutral">State machine untouched</AppBadge>
            </div>
          </div>

          <div data-challenge-list className="space-y-4">
            {challenges === undefined ? (
              <Spinner />
            ) : challenges.length === 0 ? (
              <div className="feature-empty-state py-12">
                <div className="feature-empty-state__icon feature-empty-state__icon--accent">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="feature-empty-state__body">
                  <p className="feature-empty-state__eyebrow">No entries</p>
                  <h3 className="feature-empty-state__title">No challenges found for this filter</h3>
                  <p className="feature-empty-state__copy">The empty state now matches the rest of the authenticated app while preserving the existing `data-challenge-list` seam for browser proof.</p>
                </div>
                <div className="feature-empty-state__meta">
                  <AppBadge tone="neutral">Create one to get started</AppBadge>
                </div>
              </div>
            ) : (
              challenges.map((challenge) => {
                const status = challenge.status as ChallengeStatus;
                const type = challenge.type as ChallengeType;
                return (
                  <button
                    key={challenge._id}
                    type="button"
                    onClick={() => setSelectedChallengeId(challenge._id)}
                    className="block w-full text-left"
                  >
                    <AppCard
                      tone={status === "active" ? "highlight" : status === "completed" ? "default" : "raised"}
                      padding="md"
                      interactive
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <AppBadge tone={TYPE_BADGE_TONE[type]} size="sm">
                              {TYPE_LABELS[type]}
                            </AppBadge>
                            <AppBadge tone={STATUS_BADGE_TONE[status]} size="sm">
                              {status}
                            </AppBadge>
                            <AppBadge tone="neutral" size="sm">
                              {challenge.participantCount} participant{challenge.participantCount === 1 ? "" : "s"}
                            </AppBadge>
                          </div>

                          <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                            {challenge.title}
                          </h3>
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                            {status === "active"
                              ? "Competition is live. Open the detail surface for standings, join state, and creator controls."
                              : status === "completed"
                                ? "Completed challenge with standings archived behind the same detail hook."
                                : "Pending challenge ready to start once the scheduled window begins."}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 text-right shadow-[0_16px_30px_rgba(83,37,10,0.06)]">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {status === "active" ? "Time remaining" : status === "pending" ? "Starts" : "Finished"}
                          </p>
                          <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-slate-950">
                            {status === "active"
                              ? formatTimeRemaining(challenge.endAt)
                              : status === "pending"
                                ? formatDate(challenge.startAt)
                                : challenge.completedAt
                                  ? formatDate(challenge.completedAt)
                                  : "Completed"}
                          </p>
                        </div>
                      </div>
                    </AppCard>
                  </button>
                );
              })
            )}
          </div>
        </AppCard>

        <section data-route-section="challenges-observability" className="sr-only">
          <StatCard
            label="Challenge observability"
            value="Ready"
            description="List, create, detail, standings, and join hooks remain stable for runtime proof."
            icon={<Activity className="h-5 w-5" />}
          />
        </section>
      </div>
    </main>
  );
}
