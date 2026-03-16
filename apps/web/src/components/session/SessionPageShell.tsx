"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Activity, Link2, Sparkles, Users } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import SessionParticipantList from "@/components/session/SessionParticipantList";
import SessionSetFeed from "@/components/session/SessionSetFeed";
import SharedTimerDisplay from "@/components/session/SharedTimerDisplay";
import SessionSummary from "@/components/session/SessionSummary";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

const HEARTBEAT_INTERVAL_MS = 10_000;

export default function SessionPageShell() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id as Id<"groupSessions"> | undefined;
  const { user } = useUser();

  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState(false);

  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as Id<"groupSessions"> } : "skip",
  );

  const sendHeartbeat = useMutation(api.sessions.sendHeartbeat);
  const createSession = useMutation(api.sessions.createSession);
  const endSessionMutation = useMutation(api.sessions.endSession);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const heartbeat = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      await sendHeartbeat({ sessionId: id as Id<"groupSessions"> });
    } catch {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[Session] Heartbeat stopped: mutation failed");
      }
    }
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!sessionId || session === undefined) return;
    if (session && session.status === "completed") return;

    console.log("[Session] Heartbeat started");
    void heartbeat();
    intervalRef.current = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[Session] Heartbeat stopped: unmount");
      }
    };
  }, [sessionId, session?.status, heartbeat]);

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

  function copyInviteLink() {
    if (!session?.inviteCode) return;
    const url = `${window.location.origin}/session/join/${session.inviteCode}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (session === undefined) {
    return (
      <main className="app-page" data-route="session-workout" data-route-shell="session-workout" data-session-page>
        <div className="app-page-layout">
          <PageHeader
            data-page-header="session-workout"
            eyebrow="Shared training"
            badge={<AppBadge tone="accent">Session</AppBadge>}
            title="Loading group session"
            subtitle="The workout session URL now resolves through authenticated app-shell ownership while preserving the original public path."
          />
          <AppCard tone="subtle" padding="lg" data-route-section="session-loading">
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-slate-400">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Loading session…</span>
              </div>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="app-page" data-route="session-workout" data-route-shell="session-workout" data-session-page>
        <div className="app-page-layout app-page-layout--narrow">
          <PageHeader
            data-page-header="session-workout"
            eyebrow="Shared training"
            badge={<AppBadge tone="warning">Missing</AppBadge>}
            title="Session not found"
            subtitle="This session may not exist or may have been deleted."
            align="center"
          />
          <AppCard tone="subtle" padding="lg" data-route-section="session-empty">
            <div className="text-center">
              <button
                onClick={handleCreateSession}
                disabled={creating}
                className="inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:bg-slate-300"
              >
                {creating ? "Creating…" : "Create new session"}
              </button>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  const statusLabel: Record<string, string> = {
    waiting: "Waiting for participants",
    active: "In Progress",
    completed: "Completed",
  };

  const statusTone = session.status === "completed" ? "neutral" : session.status === "active" ? "success" : "warning";
  const isHost = user?.id === session.hostId;
  const isCompleted = session.status === "completed";

  return (
    <main className="app-page" data-route="session-workout" data-route-shell="session-workout" data-session-page>
      <div className="app-page-layout">
        <PageHeader
          data-page-header="session-workout"
          eyebrow="Shared training"
          badge={<AppBadge tone="accent">Session</AppBadge>}
          title="Group session"
          subtitle={`Hosted by ${session.host.displayName} · ${session.participantCount} participant${session.participantCount !== 1 ? "s" : ""}`}
          meta={
            <>
              <AppBadge tone={statusTone}>{statusLabel[session.status] ?? session.status}</AppBadge>
              {!isCompleted ? <AppBadge tone="neutral">Invite code {session.inviteCode}</AppBadge> : null}
              <AppBadge tone="neutral">URL preserved</AppBadge>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isCompleted ? (
                <button
                  onClick={copyInviteLink}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  <Link2 className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy invite link"}
                </button>
              ) : null}
              {isHost && !isCompleted ? (
                <button
                  data-session-end-button
                  onClick={handleEndSession}
                  disabled={ending}
                  className="inline-flex min-h-10 items-center rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-slate-300"
                >
                  {ending ? "Ending…" : "End session"}
                </button>
              ) : null}
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="session-overview">
          <StatCard
            label="Participants"
            value={session.participantCount}
            description="The shell layer exposes route identity while participant details remain feature-owned."
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Status"
            value={statusLabel[session.status] ?? session.status}
            description="Session state stays observable through route selectors and existing session data hooks."
            emphasis="warm"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value={isCompleted ? "Summary" : "Live"}
            description="Shell regressions can now be separated from participant, timer, and set-feed issues."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        {isCompleted ? (
          <section data-route-section="session-summary">
            <SessionSummary sessionId={sessionId as Id<"groupSessions">} />
          </section>
        ) : (
          <>
            <AppCard tone="highlight" padding="md" data-route-section="session-timer">
              <SharedTimerDisplay session={session} sessionId={sessionId as Id<"groupSessions">} />
            </AppCard>

            <section className="grid gap-6 lg:grid-cols-[280px_1fr]" data-route-section="session-live-grid">
              <AppCard tone="raised" padding="md" className="h-fit" data-route-section="session-participants">
                <SessionParticipantList sessionId={sessionId as Id<"groupSessions">} />
              </AppCard>

              <section data-route-section="session-feed">
                <div className="mb-4 flex items-center gap-2">
                  <AppBadge tone="neutral">Live set feed</AppBadge>
                  <p className="text-sm text-slate-500">Existing session data hooks stay intact inside the shared shell.</p>
                </div>
                <SessionSetFeed sessionId={sessionId as Id<"groupSessions">} />
              </section>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
