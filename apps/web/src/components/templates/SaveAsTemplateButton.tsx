"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Button } from "@/components/common/button";

interface SaveAsTemplateButtonProps {
  workoutId: Id<"workouts">;
  workoutName: string;
}

export default function SaveAsTemplateButton({
  workoutId,
  workoutName,
}: SaveAsTemplateButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const saveAsTemplate = useMutation(api.templates.saveAsTemplate);

  const handleSave = async () => {
    const name = window.prompt("Template name:", workoutName);
    if (!name) return;

    setIsSaving(true);
    try {
      await saveAsTemplate({ workoutId, name });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save template";
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={isSaving}
      aria-label="Save as template"
    >
      {isSaving ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
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
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="mr-1.5 h-3.5 w-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
          />
        </svg>
      )}
      {isSaving ? "Saving…" : "Save Template"}
    </Button>
  );
}
