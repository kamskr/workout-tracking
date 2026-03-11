"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import ExerciseFilters, {
  type ExerciseFilterState,
} from "./ExerciseFilters";
import ExerciseCard from "./ExerciseCard";

const INITIAL_FILTERS: ExerciseFilterState = {
  searchQuery: "",
  primaryMuscleGroup: "",
  equipment: "",
};

export default function ExerciseList() {
  const [filters, setFilters] = useState<ExerciseFilterState>(INITIAL_FILTERS);

  // Build query args — only include non-empty filter values
  const queryArgs: Record<string, string> = {};
  if (filters.searchQuery.trim()) queryArgs.searchQuery = filters.searchQuery.trim();
  if (filters.primaryMuscleGroup) queryArgs.primaryMuscleGroup = filters.primaryMuscleGroup;
  if (filters.equipment) queryArgs.equipment = filters.equipment;

  const exercises = useQuery(api.exercises.listExercises, queryArgs);

  const isLoading = exercises === undefined;
  const isEmpty = exercises !== undefined && exercises.length === 0;
  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.primaryMuscleGroup !== "" ||
    filters.equipment !== "";

  return (
    <div className="space-y-6">
      <ExerciseFilters filters={filters} onFiltersChange={setFilters} />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
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
            <span className="text-sm font-medium">Loading exercises…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-3">
            <svg
              className="h-6 w-6 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No exercises found</p>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters
              ? "Try adjusting your filters or search query."
              : "No exercises have been added yet."}
          </p>
        </div>
      )}

      {/* Exercise grid */}
      {exercises && exercises.length > 0 && (
        <>
          <p className="text-xs text-gray-500">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise._id} exercise={exercise} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
