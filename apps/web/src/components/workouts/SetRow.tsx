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

  // Sync display when set data changes from server
  // We use key prop from parent to handle this instead of useEffect

  const handleWeightBlur = useCallback(() => {
    const num = parseFloat(localWeight);
    if (isNaN(num) && set.weight == null) return;
    if (isNaN(num)) {
      // Clear weight
      void updateSet({ setId: set._id, weight: 0 });
      return;
    }
    // Convert to kg for storage
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

  const handleWarmupToggle = useCallback(() => {
    void updateSet({ setId: set._id, isWarmup: !set.isWarmup });
  }, [set._id, set.isWarmup, updateSet]);

  const handleDelete = useCallback(() => {
    void deleteSet({ setId: set._id });
  }, [set._id, deleteSet]);

  return (
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
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          onBlur={handleWeightBlur}
          placeholder={`0 ${unit}`}
          className={cn(
            "h-8 w-full rounded-md border border-gray-200 bg-white px-2 pr-8 text-sm text-gray-900",
            "transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
          )}
          aria-label={`Weight for set ${set.setNumber}`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
          {unit}
        </span>
      </div>

      {/* Reps input */}
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={localReps}
          onChange={(e) => setLocalReps(e.target.value)}
          onBlur={handleRepsBlur}
          placeholder="0 reps"
          className={cn(
            "h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900",
            "transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
          )}
          aria-label={`Reps for set ${set.setNumber}`}
        />
      </div>

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
  );
}
