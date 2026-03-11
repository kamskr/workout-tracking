"use client";

import { useEffect, useState } from "react";
import { formatRestTime } from "@/lib/units";
import { useRestTimer, type TimerStatus } from "./RestTimerContext";

// ---------------------------------------------------------------------------
// SVG circular progress ring
// ---------------------------------------------------------------------------

const RING_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({
  remaining,
  total,
  status,
}: {
  remaining: number;
  total: number;
  status: TimerStatus;
}) {
  // Progress: 1 (full ring) → 0 (empty ring) as time elapses.
  const progress = total > 0 ? remaining / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  const ringColor =
    status === "paused"
      ? "text-amber-400"
      : status === "completed"
        ? "text-green-500"
        : "text-blue-500";

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
// Icon helpers (inline SVG to avoid external deps)
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

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
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

// ---------------------------------------------------------------------------
// Small control button
// ---------------------------------------------------------------------------

function ControlButton({
  onClick,
  label,
  children,
  variant = "default",
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full p-1.5 text-xs font-medium transition-colors
        ${
          variant === "danger"
            ? "text-gray-400 hover:bg-red-50 hover:text-red-500"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }
      `}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RestTimerDisplay() {
  const {
    status,
    remainingSeconds,
    configuredDuration,
    exerciseName,
    pauseTimer,
    resumeTimer,
    skipTimer,
    adjustTimer,
  } = useRestTimer();

  // Visibility animation state.
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (status !== "idle") {
      setShouldRender(true);
      // Trigger slide-in on next frame.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      // Wait for transition to finish before unmounting.
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!shouldRender) return null;

  const isCompleted = status === "completed";

  return (
    <div
      data-testid="rest-timer-display"
      className={`fixed bottom-4 right-4 z-50 flex flex-col items-center rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-200
        transition-all duration-300 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
      `}
      role="timer"
      aria-label={
        isCompleted
          ? "Rest timer completed"
          : `Rest timer: ${formatRestTime(remainingSeconds)} remaining`
      }
    >
      {/* Circular ring + time / checkmark */}
      <div className="relative flex items-center justify-center">
        <ProgressRing
          remaining={remainingSeconds}
          total={configuredDuration}
          status={status}
        />

        {/* Center content — overlaid on the ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompleted ? (
            <CheckIcon />
          ) : (
            <span
              className="font-mono text-xl font-semibold tabular-nums text-gray-900"
              data-testid="rest-timer-time"
            >
              {formatRestTime(remainingSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Exercise name */}
      {exerciseName && !isCompleted && (
        <p className="mt-1.5 max-w-[140px] truncate text-center text-xs text-gray-500">
          {exerciseName}
        </p>
      )}

      {/* Completed banner */}
      {isCompleted && (
        <p className="mt-1 text-sm font-medium text-green-600">Done!</p>
      )}

      {/* Controls — running */}
      {status === "running" && (
        <div className="mt-2 flex items-center gap-1">
          <ControlButton
            onClick={() => adjustTimer(-15)}
            label="Subtract 15 seconds"
          >
            −15s
          </ControlButton>
          <ControlButton onClick={pauseTimer} label="Pause timer">
            <PauseIcon />
          </ControlButton>
          <ControlButton onClick={skipTimer} label="Skip timer" variant="danger">
            <SkipIcon />
          </ControlButton>
          <ControlButton
            onClick={() => adjustTimer(15)}
            label="Add 15 seconds"
          >
            +15s
          </ControlButton>
        </div>
      )}

      {/* Controls — paused */}
      {status === "paused" && (
        <div className="mt-2 flex items-center gap-1">
          <ControlButton onClick={resumeTimer} label="Resume timer">
            <PlayIcon />
          </ControlButton>
          <ControlButton onClick={skipTimer} label="Skip timer" variant="danger">
            <SkipIcon />
          </ControlButton>
        </div>
      )}
    </div>
  );
}
