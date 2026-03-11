"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { formatRestTime } from "@/lib/units";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RestDurationConfigProps {
  workoutExerciseId: Id<"workoutExercises">;
  /** The resolved rest duration (from priority chain). */
  currentRestSeconds: number;
  /** Whether this value is an exercise-level override (vs inherited). */
  isOverride: boolean;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RestDurationConfig({
  workoutExerciseId,
  currentRestSeconds,
  isOverride,
}: RestDurationConfigProps) {
  const updateRestSeconds = useMutation(
    api.workoutExercises.updateRestSeconds,
  );
  const [expanded, setExpanded] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const handleAdjust = useCallback(
    async (delta: number) => {
      const newValue = Math.max(0, currentRestSeconds + delta);
      setIsMutating(true);
      try {
        await updateRestSeconds({
          workoutExerciseId,
          restSeconds: newValue,
        });
      } catch (err) {
        console.error("[RestDurationConfig] Failed to update rest seconds:", err);
      } finally {
        setIsMutating(false);
      }
    },
    [currentRestSeconds, updateRestSeconds, workoutExerciseId],
  );

  const handleReset = useCallback(async () => {
    setIsMutating(true);
    try {
      await updateRestSeconds({
        workoutExerciseId,
        restSeconds: undefined,
      });
    } catch (err) {
      console.error("[RestDurationConfig] Failed to reset rest seconds:", err);
    } finally {
      setIsMutating(false);
    }
  }, [updateRestSeconds, workoutExerciseId]);

  return (
    <div
      className="flex items-center gap-1"
      data-testid="rest-duration-config"
    >
      {/* Collapsed: clickable clock + time badge */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label={`Rest: ${formatRestTime(currentRestSeconds)}. Click to configure.`}
        aria-expanded={expanded}
      >
        <ClockIcon className="h-3 w-3" />
        <span className="tabular-nums">{formatRestTime(currentRestSeconds)}</span>
        {isOverride && (
          <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-400" title="Custom override" />
        )}
      </button>

      {/* Expanded: adjust controls */}
      {expanded && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleAdjust(-15)}
            disabled={isMutating || currentRestSeconds <= 0}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Decrease rest by 15 seconds"
          >
            −15s
          </button>
          <button
            type="button"
            onClick={() => handleAdjust(15)}
            disabled={isMutating}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Increase rest by 15 seconds"
          >
            +15s
          </button>
          {isOverride && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isMutating}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
              aria-label="Reset to default rest duration"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
