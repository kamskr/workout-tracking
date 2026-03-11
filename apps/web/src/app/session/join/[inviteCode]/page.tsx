"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

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
      console.log(
        `[Session] Join success: sessionId=${result.sessionId}`,
      );
      router.push(`/workouts/session/${result.sessionId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join session";
      console.error(`[Session] Join failed: ${message}`);
      setError(message);
      joinAttempted.current = false;
      setJoining(false);
    }
  }

  // Loading state
  if (session === undefined) {
    return (
      <main
        className="min-h-screen bg-gray-50"
        data-session-invite
      >
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
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
              <span className="text-sm font-medium">Finding session…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Session query threw (getSessionByInviteCode throws on not-found)
  // This path handles when Convex query returns null (shouldn't, but defensive)
  if (session === null) {
    return (
      <main className="min-h-screen bg-gray-50" data-session-invite>
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <div className="text-center py-24">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <svg
                className="h-8 w-8 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">
              Session not found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This invite code may be invalid or the session may have ended.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" data-session-invite>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <svg
                className="h-7 w-7 text-blue-600"
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
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Join Group Session
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Invite code: <span className="font-mono font-semibold">{inviteCode}</span>
            </p>
          </div>

          {/* Session info */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Host</span>
                <span className="font-medium text-gray-900">
                  {session.host.displayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Participants</span>
                <span className="font-medium text-gray-900">
                  {session.participantCount} / 10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize text-gray-900">
                  {session.status}
                </span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Join button */}
          <button
            onClick={handleJoin}
            disabled={joining || (session.status !== "waiting" && session.status !== "active")}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {joining ? (
              <span className="flex items-center justify-center gap-2">
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
                Joining…
              </span>
            ) : session.status !== "waiting" && session.status !== "active" ? (
              "Session is no longer joinable"
            ) : (
              "Join Session"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
