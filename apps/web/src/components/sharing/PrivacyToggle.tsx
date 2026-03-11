"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

interface PrivacyToggleProps {
  workoutId: Id<"workouts">;
  isPublic: boolean;
}

export default function PrivacyToggle({
  workoutId,
  isPublic,
}: PrivacyToggleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const togglePrivacy = useMutation(api.sharing.toggleWorkoutPrivacy);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await togglePrivacy({ workoutId, isPublic: !isPublic });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update privacy";
      window.alert(message);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isToggling}
      data-privacy-toggle
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
      aria-label={isPublic ? "Public — click to make private" : "Private — click to make public"}
    >
      {/* Toggle track */}
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          isPublic ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
            isPublic ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>

      {/* Label */}
      <span className={isPublic ? "text-green-700" : "text-gray-500"}>
        {isPublic ? "Public" : "Private"}
      </span>

      {/* Icon */}
      {isPublic ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-3.5 w-3.5 text-green-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.75 3.03v.568c0 .334.148.65.405.864a11.04 11.04 0 0 1 2.649 2.855c.15.263.164.581.044.857-.12.275-.376.462-.676.462H12.75v.749c0 .28.125.548.345.744l1.39 1.236c.229.204.354.497.354.804v.385c0 .573-.46 1.04-1.04 1.04h-.37c-.281 0-.538-.118-.728-.303a11.07 11.07 0 0 1-1.64-2.153c-.2-.357-.6-.561-1.016-.476a10.63 10.63 0 0 1-2.332.254c-.6 0-1.188-.054-1.76-.157v5.364c.522-.174 1.08-.268 1.66-.268 3.038 0 5.497 2.46 5.497 5.497 0 .274-.02.543-.06.808a10.5 10.5 0 0 0 5.3-9.108c0-5.824-4.755-10.543-10.5-10.543Z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-3.5 w-3.5 text-gray-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      )}
    </button>
  );
}
