"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { displayWeight, lbsToKg, type WeightUnit } from "@/lib/units";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

interface SetData {
  _id: Id<"sets">;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isWarmup: boolean;
}

interface SetRowProps {
  set: SetData;
  unit: WeightUnit;
}

export default function SetRow({ set, unit }: SetRowProps) {
  const updateSet = useMutation(api.sets.updateSet);
  const deleteSet = useMutation(api.sets.deleteSet);

  // Local state for inputs — display in user's unit
  const displayWeightValue =
    set.weight != null ? displayWeight(set.weight, unit) : "";
  const [localWeight, setLocalWeight] = useState<string>(
    displayWeightValue !== "" ? String(displayWeightValue) : "",
  );
  const [localReps, setLocalReps] = useState<string>(
    set.reps != null ? String(set.reps) : "",
  );
  const [localRpe, setLocalRpe] = useState<string>(
    set.rpe != null ? String(set.rpe) : "",
  );
  const [localTempo, setLocalTempo] = useState<string>(set.tempo ?? "");
  const [localNotes, setLocalNotes] = useState<string>(set.notes ?? "");
  const [showNotes, setShowNotes] = useState<boolean>(!!set.notes);

  const handleWeightBlur = useCallback(() => {
    const num = parseFloat(localWeight);
    if (isNaN(num) && set.weight == null) return;
    if (isNaN(num)) {
      void updateSet({ setId: set._id, weight: 0 });
      return;
    }
    const kg = unit === "lbs" ? lbsToKg(num) : num;
    if (set.weight != null && Math.abs(kg - set.weight) < 0.01) return;
    void updateSet({ setId: set._id, weight: kg });
  }, [localWeight, set._id, set.weight, unit, updateSet]);

  const handleRepsBlur = useCallback(() => {
    const num = parseInt(localReps, 10);
    if (isNaN(num) && set.reps == null) return;
    if (isNaN(num)) {
      void updateSet({ setId: set._id, reps: 0 });
      return;
    }
    if (num === set.reps) return;
    void updateSet({ setId: set._id, reps: num });
  }, [localReps, set._id, set.reps, updateSet]);

  const handleRpeBlur = useCallback(() => {
    const num = parseInt(localRpe, 10);
    if (isNaN(num) && set.rpe == null) return;
    if (isNaN(num)) {
      // User cleared the field — omit rpe from update (no server-side clearing needed)
      return;
    }
    if (num === set.rpe) return;
    // Clamp to 1-10 on the client before sending
    const clamped = Math.max(1, Math.min(10, num));
    setLocalRpe(String(clamped));
    void updateSet({ setId: set._id, rpe: clamped });
  }, [localRpe, set._id, set.rpe, updateSet]);

  const handleTempoBlur = useCallback(() => {
    const trimmed = localTempo.trim();
    if (trimmed === (set.tempo ?? "")) return;
    if (trimmed === "") return; // Don't save empty tempo
    void updateSet({ setId: set._id, tempo: trimmed });
  }, [localTempo, set._id, set.tempo, updateSet]);

  const handleNotesBlur = useCallback(() => {
    const trimmed = localNotes.trim();
    if (trimmed === (set.notes ?? "")) return;
    if (trimmed === "") return; // Don't save empty notes
    void updateSet({ setId: set._id, notes: trimmed });
  }, [localNotes, set._id, set.notes, updateSet]);

  const handleWarmupToggle = useCallback(() => {
    void updateSet({ setId: set._id, isWarmup: !set.isWarmup });
  }, [set._id, set.isWarmup, updateSet]);

  const handleDelete = useCallback(() => {
    void deleteSet({ setId: set._id });
  }, [set._id, deleteSet]);

  const inputClass = cn(
    "h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900",
    "transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
  );

  return (
    <div className="space-y-1">
      {/* Main set row */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2",
          set.isWarmup ? "bg-amber-50/60" : "bg-gray-50/60",
        )}
      >
        {/* Set number */}
        <span className="w-8 shrink-0 text-center text-xs font-medium text-gray-400">
          {set.isWarmup ? "W" : set.setNumber}
        </span>

        {/* Weight input */}
        <div className="relative min-w-0 flex-[2]">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={localWeight}
            onChange={(e) => setLocalWeight(e.target.value)}
            onBlur={handleWeightBlur}
            placeholder={`0 ${unit}`}
            className={cn(inputClass, "pr-8")}
            aria-label={`Weight for set ${set.setNumber}`}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {unit}
          </span>
        </div>

        {/* Reps input */}
        <div className="min-w-0 flex-[2]">
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={localReps}
            onChange={(e) => setLocalReps(e.target.value)}
            onBlur={handleRepsBlur}
            placeholder="0 reps"
            className={inputClass}
            aria-label={`Reps for set ${set.setNumber}`}
          />
        </div>

        {/* RPE input */}
        <div className="w-14 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            max="10"
            value={localRpe}
            onChange={(e) => setLocalRpe(e.target.value)}
            onBlur={handleRpeBlur}
            placeholder="RPE"
            className={cn(inputClass, "text-center")}
            aria-label={`RPE for set ${set.setNumber}`}
          />
        </div>

        {/* Tempo input */}
        <div className="w-24 shrink-0">
          <input
            type="text"
            value={localTempo}
            onChange={(e) => setLocalTempo(e.target.value)}
            onBlur={handleTempoBlur}
            placeholder="Tempo"
            className={inputClass}
            aria-label={`Tempo for set ${set.setNumber}`}
          />
        </div>

        {/* Notes toggle */}
        <button
          type="button"
          onClick={() => setShowNotes((prev) => !prev)}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors",
            showNotes
              ? "text-primary"
              : "text-gray-300 hover:text-gray-500",
          )}
          aria-label={showNotes ? "Hide notes" : "Show notes"}
          title="Toggle notes"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
        </button>

        {/* Warmup toggle */}
        <button
          type="button"
          onClick={handleWarmupToggle}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
            set.isWarmup
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-400 hover:text-gray-600",
          )}
          aria-label={set.isWarmup ? "Mark as working set" : "Mark as warmup"}
          title={set.isWarmup ? "Warmup set" : "Working set"}
        >
          W
        </button>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-gray-300 hover:text-destructive"
          onClick={handleDelete}
          aria-label={`Delete set ${set.setNumber}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </Button>
      </div>

      {/* Collapsible notes row */}
      {showNotes && (
        <div className="ml-10 mr-2">
          <input
            type="text"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Set notes..."
            className={cn(
              "h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700",
              "transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
            )}
            aria-label={`Notes for set ${set.setNumber}`}
          />
        </div>
      )}
    </div>
  );
}
