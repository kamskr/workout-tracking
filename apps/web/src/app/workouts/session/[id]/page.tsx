"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import SessionParticipantList from "@/components/session/SessionParticipantList";
import SessionSetFeed from "@/components/session/SessionSetFeed";
import SharedTimerDisplay from "@/components/session/SharedTimerDisplay";
import SessionSummary from "@/components/session/SessionSummary";

const HEARTBEAT_INTERVAL_MS = 10_000; // 10 seconds

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id as Id<"groupSessions"> | undefined;
  const { user } = useUser();

  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState(false);

  // Queries with "skip" pattern (D085)
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as Id<"groupSessions"> } : "skip",
  );

  const sendHeartbeat = useMutation(api.sessions.sendHeartbeat);
  const createSession = useMutation(api.sessions.createSession);
  const endSessionMutation = useMutation(api.sessions.endSession);

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const heartbeat = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      await sendHeartbeat({ sessionId: id as Id<"groupSessions"> });
    } catch {
      // Participant may have left or session may have ended — stop heartbeat
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[Session] Heartbeat stopped: mutation failed");
      }
    }
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!sessionId || session === undefined) return;
    // Don't heartbeat for completed sessions
    if (session && session.status === "completed") return;

    console.log("[Session] Heartbeat started");
    // Send immediately, then every 10s
    void heartbeat();
    intervalRef.current = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[Session] Heartbeat stopped: unmount");
      }
    };
  }, [sessionId, session?.status, heartbeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create session flow ────────────────────────────────────────────────────
  async function handleCreateSession() {
    if (creating) return;
    setCreating(true);
    try {
      const result = await createSession();
      router.push(`/workouts/session/${result.sessionId}`);
    } catch (err) {
      console.error("[Session] Create failed:", err);
      setCreating(false);
    }
  }

  // ── End session flow ──────────────────────────────────────────────────────
  async function handleEndSession() {
    if (ending || !sessionId) return;
    setEnding(true);
    console.log("[Session] End session requested");
    try {
      await endSessionMutation({ sessionId: sessionId as Id<"groupSessions"> });
    } catch (err) {
      console.error("[Session] End session failed:", err);
    } finally {
      setEnding(false);
    }
  }

  // ── Copy invite link ──────────────────────────────────────────────────────
  function copyInviteLink() {
    if (!session?.inviteCode) return;
    const url = `${window.location.origin}/session/join/${session.inviteCode}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <main className="min-h-screen bg-gray-50" data-session-page>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-center py-24">
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
              <span className="text-sm font-medium">Loading session…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Session not found / error state ────────────────────────────────────────
  if (session === null) {
    return (
      <main className="min-h-screen bg-gray-50" data-session-page>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="text-center">
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
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">
              Session not found
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This session may not exist or may have been deleted.
            </p>
            <button
              onClick={handleCreateSession}
              disabled={creating}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {creating ? "Creating…" : "Create New Session"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Session view ───────────────────────────────────────────────────────────
  const statusLabel: Record<string, string> = {
    waiting: "Waiting for participants",
    active: "In Progress",
    completed: "Completed",
  };

  const statusColor: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
  };

  const isHost = user?.id === session.hostId;
  const isCompleted = session.status === "completed";

  return (
    <main className="min-h-screen bg-gray-50" data-session-page>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  Group Session
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[session.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {statusLabel[session.status] ?? session.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Hosted by {session.host.displayName} · {session.participantCount} participant
                {session.participantCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Invite link section — hidden when completed */}
              {!isCompleted && (
                <>
                  <div className="rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
                    <span className="text-xs text-gray-400 block">Invite Code</span>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {session.inviteCode}
                    </span>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                          />
                        </svg>
                        Copy Invite Link
                      </>
                    )}
                  </button>
                </>
              )}

              {/* End Session button — host-only, hidden when completed */}
              {isHost && !isCompleted && (
                <button
                  data-session-end-button
                  onClick={handleEndSession}
                  disabled={ending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                >
                  {ending ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
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
                      Ending…
                    </>
                  ) : (
                    "End Session"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Completed: Summary view ──────────────────────────────────── */}
        {isCompleted && (
          <SessionSummary
            sessionId={sessionId as Id<"groupSessions">}
          />
        )}

        {/* ── Live session: Timer + Participants + Set Feed ────────────── */}
        {!isCompleted && (
          <>
            {/* Shared Timer — between header and grid */}
            <div className="mb-6">
              <SharedTimerDisplay
                session={session}
                sessionId={sessionId as Id<"groupSessions">}
              />
            </div>

            {/* Body: Participants + Set Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Sidebar: Participants */}
              <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
                <SessionParticipantList
                  sessionId={sessionId as Id<"groupSessions">}
                />
              </aside>

              {/* Main: Set Feed */}
              <section>
                <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Live Set Feed
                </h2>
                <SessionSetFeed
                  sessionId={sessionId as Id<"groupSessions">}
                />
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
