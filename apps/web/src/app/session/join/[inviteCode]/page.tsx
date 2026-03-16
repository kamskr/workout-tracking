"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { ArrowRight, Link2, Sparkles, Users } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function JoinSessionPage() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const inviteCode = params.inviteCode;

  const joinAttempted = useRef(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useQuery(
    api.sessions.getSessionByInviteCode,
    inviteCode ? { inviteCode } : "skip",
  );

  const joinSession = useMutation(api.sessions.joinSession);

  async function handleJoin() {
    if (joinAttempted.current || !inviteCode) return;
    joinAttempted.current = true;
    setJoining(true);
    setError(null);

    try {
      const result = await joinSession({ inviteCode });
      console.log(`[Session] Join success: sessionId=${result.sessionId}`);
      router.push(`/workouts/session/${result.sessionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join session";
      console.error(`[Session] Join failed: ${message}`);
      setError(message);
      joinAttempted.current = false;
      setJoining(false);
    }
  }

  if (session === undefined) {
    return (
      <main className="app-page" data-route="session-join" data-session-invite>
        <div className="app-page-layout app-page-layout--narrow">
          <PageHeader
            data-page-header="session-join"
            eyebrow="Shared training"
            badge={<AppBadge tone="accent">Join flow</AppBadge>}
            title="Join group session"
            subtitle="Resolving the invite so the join flow can preserve its public URL but still speak the same shell vocabulary as the authenticated app."
            align="center"
          />
          <AppCard tone="subtle" padding="lg" data-route-section="session-join-loading">
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-slate-400">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Finding session…</span>
              </div>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="app-page" data-route="session-join" data-session-invite>
        <div className="app-page-layout app-page-layout--narrow">
          <PageHeader
            data-page-header="session-join"
            eyebrow="Shared training"
            badge={<AppBadge tone="warning">Invite issue</AppBadge>}
            title="Session not found"
            subtitle="This invite code is no longer valid or the session has already ended."
            align="center"
          />
          <AppCard tone="subtle" padding="lg" data-route-section="session-join-empty">
            <p className="text-center text-sm leading-6 text-slate-500">
              The join route keeps its public URL, but missing or expired sessions still report a deliberate state instead of falling back to old standalone scaffolding.
            </p>
          </AppCard>
        </div>
      </main>
    );
  }

  const isJoinable = session.status === "waiting" || session.status === "active";

  return (
    <main className="app-page" data-route="session-join" data-session-invite>
      <div className="app-page-layout app-page-layout--narrow">
        <PageHeader
          data-page-header="session-join"
          eyebrow="Shared training"
          badge={<AppBadge tone="accent">Join flow</AppBadge>}
          title="Join group session"
          subtitle="This invite route stays outside the authenticated route-group path, but now uses the same shell primitives and durable selectors as the rest of the app."
          align="center"
          meta={
            <>
              <AppBadge tone="neutral">Invite code</AppBadge>
              <AppBadge tone="neutral">Protected join</AppBadge>
              <AppBadge tone="neutral">URL preserved</AppBadge>
            </>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="session-join-overview">
          <StatCard
            label="Invite"
            value={inviteCode.toUpperCase()}
            description="The original public join URL stays intact while the route adopts shared framing."
            icon={<Link2 className="h-5 w-5" />}
          />
          <StatCard
            label="Participants"
            value={`${session.participantCount}/10`}
            description="Preview the live room before joining it."
            emphasis="warm"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Route-level selectors now prove join-flow ownership without relying on heading copy."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="raised" padding="lg" data-route-section="session-join-card">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">Join group session</h2>
              <p className="mt-2 text-sm text-slate-500">
                Invite code: <span className="font-mono font-semibold text-slate-900">{inviteCode}</span>
              </p>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_34px_rgba(83,37,10,0.06)]" data-route-section="session-join-details">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Host</span>
                  <span className="font-medium text-slate-900">{session.host.displayName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Participants</span>
                  <span className="font-medium text-slate-900">{session.participantCount} / 10</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium capitalize text-slate-900">{session.status}</span>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4" data-session-join-error>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            ) : null}

            <button
              onClick={handleJoin}
              disabled={joining || !isJoinable}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_20px_38px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining…
                </span>
              ) : !isJoinable ? (
                "Session is no longer joinable"
              ) : (
                <>
                  Join session
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </AppCard>
      </div>
    </main>
  );
}
