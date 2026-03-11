"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { formatRestTime } from "@/lib/units";

// ---------------------------------------------------------------------------
// SVG circular progress ring — matches RestTimerDisplay pattern
// ---------------------------------------------------------------------------

const RING_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type RingStatus = "idle" | "running" | "done";

function ProgressRing({
  remaining,
  total,
  status,
}: {
  remaining: number;
  total: number;
  status: RingStatus;
}) {
  const progress = total > 0 ? remaining / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  const ringColor =
    status === "done"
      ? "text-green-500"
      : status === "running"
        ? "text-blue-500"
        : "text-gray-300";

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      className="rotate-[-90deg]"
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-gray-100"
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className={`${ringColor} transition-[stroke-dashoffset] duration-200 ease-linear`}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Duration presets
// ---------------------------------------------------------------------------

const DURATION_PRESETS = [30, 60, 90, 120] as const;

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8 text-green-500"
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path
        fillRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SharedTimerDisplayProps {
  session: {
    sharedTimerEndAt?: number;
    sharedTimerDurationSeconds?: number;
    status: string;
  };
  sessionId: Id<"groupSessions">;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** Grace window: after timer hits 0, show "Done!" for 3 seconds before idle. */
const DONE_GRACE_MS = 3000;

export default function SharedTimerDisplay({
  session,
  sessionId,
}: SharedTimerDisplayProps) {
  const startTimer = useMutation(api.sessions.startSharedTimer);
  const pauseTimer = useMutation(api.sessions.pauseSharedTimer);
  const skipTimer = useMutation(api.sessions.skipSharedTimer);

  // Selected duration for the next timer start
  const [selectedDuration, setSelectedDuration] = useState<number>(
    session.sharedTimerDurationSeconds ?? 60,
  );

  // Local countdown state, updated by setInterval
  const [remaining, setRemaining] = useState(0);

  // "Done!" animation state — tracks when the timer just finished
  const [showDone, setShowDone] = useState(false);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive timer state from session props
  const endAt = session.sharedTimerEndAt;
  const totalDuration = session.sharedTimerDurationSeconds ?? 0;
  const isRunning = endAt != null && endAt > Date.now();

  // Countdown effect: 100ms interval while timer is running
  useEffect(() => {
    if (!isRunning || !endAt) {
      return;
    }

    // Compute immediately
    const computeRemaining = () =>
      Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

    setRemaining(computeRemaining());
    setShowDone(false);

    const interval = setInterval(() => {
      const r = computeRemaining();
      setRemaining(r);

      if (r <= 0) {
        clearInterval(interval);
        // Show "Done!" for the grace period
        setShowDone(true);
        if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
        doneTimeoutRef.current = setTimeout(() => setShowDone(false), DONE_GRACE_MS);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [endAt, isRunning]);

  // Cleanup done timeout on unmount
  useEffect(() => {
    return () => {
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    };
  }, []);

  // Update selectedDuration when session duration changes
  useEffect(() => {
    if (session.sharedTimerDurationSeconds) {
      setSelectedDuration(session.sharedTimerDurationSeconds);
    }
  }, [session.sharedTimerDurationSeconds]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    try {
      await startTimer({ sessionId, durationSeconds: selectedDuration });
      console.log("[Session] Timer started");
    } catch (err) {
      console.error("[Session] Timer start failed:", err);
    }
  }, [startTimer, sessionId, selectedDuration]);

  const handlePause = useCallback(async () => {
    try {
      await pauseTimer({ sessionId });
      console.log("[Session] Timer paused");
    } catch (err) {
      console.error("[Session] Timer pause failed:", err);
    }
  }, [pauseTimer, sessionId]);

  const handleSkip = useCallback(async () => {
    try {
      await skipTimer({ sessionId });
      console.log("[Session] Timer skipped");
    } catch (err) {
      console.error("[Session] Timer skip failed:", err);
    }
  }, [skipTimer, sessionId]);

  // Don't render for completed sessions
  if (session.status === "completed") {
    return null;
  }

  // ── Determine visual state ───────────────────────────────────────────────

  const timerState: RingStatus =
    isRunning && remaining > 0
      ? "running"
      : showDone
        ? "done"
        : "idle";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      data-session-timer
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <TimerIcon />
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Shared Rest Timer
        </h3>
      </div>

      {/* ── Running / Done state ──────────────────────────────────────── */}
      {(timerState === "running" || timerState === "done") && (
        <div className="flex flex-col items-center">
          {/* Ring + center content */}
          <div className="relative flex items-center justify-center">
            <ProgressRing
              remaining={remaining}
              total={totalDuration}
              status={timerState}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {timerState === "done" ? (
                <CheckIcon />
              ) : (
                <span className="font-mono text-xl font-semibold tabular-nums text-gray-900">
                  {formatRestTime(remaining)}
                </span>
              )}
            </div>
          </div>

          {timerState === "done" && (
            <p className="mt-2 text-sm font-medium text-green-600">Done!</p>
          )}

          {/* Controls while running */}
          {timerState === "running" && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <PauseIcon />
                Pause
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <SkipIcon />
                Skip
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Idle state: duration presets + start ──────────────────────── */}
      {timerState === "idle" && (
        <div className="flex flex-col items-center gap-3">
          {/* Duration presets */}
          <div className="flex items-center gap-2">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDuration(d)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedDuration === d
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <TimerIcon />
            Start Timer
          </button>
        </div>
      )}
    </div>
  );
}
