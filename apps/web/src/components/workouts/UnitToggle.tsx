"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

export default function UnitToggle() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const setUnitPreference = useMutation(api.userPreferences.setUnitPreference);

  const currentUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  const handleToggle = (unit: WeightUnit) => {
    if (unit === currentUnit) return;
    void setUnitPreference({ unit });
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => handleToggle("kg")}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
          currentUnit === "kg"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}
        aria-label="Switch to kilograms"
        aria-pressed={currentUnit === "kg"}
      >
        kg
      </button>
      <button
        type="button"
        onClick={() => handleToggle("lbs")}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
          currentUnit === "lbs"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}
        aria-label="Switch to pounds"
        aria-pressed={currentUnit === "lbs"}
      >
        lbs
      </button>
    </div>
  );
}
