"use client";

import { cn } from "@/lib/utils";

/** Filter state matching the listExercises query args. */
export interface ExerciseFilterState {
  searchQuery: string;
  primaryMuscleGroup: string;
  equipment: string;
}

interface ExerciseFiltersProps {
  filters: ExerciseFilterState;
  onFiltersChange: (filters: ExerciseFilterState) => void;
}

const MUSCLE_GROUPS = [
  { value: "", label: "All Muscle Groups" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "fullBody", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: "", label: "All Equipment" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "cable", label: "Cable" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands", label: "Bands" },
  { value: "other", label: "Other" },
] as const;

const selectClasses =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30";

export default function ExerciseFilters({
  filters,
  onFiltersChange,
}: ExerciseFiltersProps) {
  const update = (patch: Partial<ExerciseFilterState>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Search input */}
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search exercises..."
          value={filters.searchQuery}
          onChange={(e) => update({ searchQuery: e.target.value })}
          className={cn(
            "h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400",
            "transition-colors hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
          )}
        />
      </div>

      {/* Muscle group dropdown */}
      <select
        value={filters.primaryMuscleGroup}
        onChange={(e) => update({ primaryMuscleGroup: e.target.value })}
        className={cn(selectClasses, "w-full sm:w-48")}
        aria-label="Muscle group filter"
      >
        {MUSCLE_GROUPS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Equipment dropdown */}
      <select
        value={filters.equipment}
        onChange={(e) => update({ equipment: e.target.value })}
        className={cn(selectClasses, "w-full sm:w-44")}
        aria-label="Equipment filter"
      >
        {EQUIPMENT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
