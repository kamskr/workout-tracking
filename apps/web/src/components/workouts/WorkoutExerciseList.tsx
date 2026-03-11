"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { WeightUnit } from "@/lib/units";
import WorkoutExerciseItem from "./WorkoutExerciseItem";
import type { ExerciseItemData } from "./WorkoutExerciseItem";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

// ── Superset color palette (left-border colors for visual grouping) ──────
const SUPERSET_COLORS = [
  "border-l-violet-400",
  "border-l-amber-400",
  "border-l-emerald-400",
  "border-l-rose-400",
  "border-l-sky-400",
  "border-l-orange-400",
];

function getSupersetColor(index: number): string {
  return SUPERSET_COLORS[index % SUPERSET_COLORS.length]!;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SupersetGroup {
  groupId: string;
  items: ExerciseItemData[];
}

type RenderItem =
  | { type: "single"; item: ExerciseItemData }
  | { type: "superset"; group: SupersetGroup; colorIndex: number };

// ── Component ────────────────────────────────────────────────────────────────

interface WorkoutExerciseListProps {
  exercises: ExerciseItemData[];
  unit: WeightUnit;
  onAddExercise: () => void;
  /** User-level default rest seconds from preferences. */
  userDefaultRestSeconds?: number;
}

export default function WorkoutExerciseList({
  exercises,
  unit,
  onAddExercise,
  userDefaultRestSeconds,
}: WorkoutExerciseListProps) {
  const setSupersetGroup = useMutation(
    api.workoutExercises.setSupersetGroup,
  );
  const clearSupersetGroup = useMutation(
    api.workoutExercises.clearSupersetGroup,
  );

  // Selection state for creating supersets
  const [selectedIds, setSelectedIds] = useState<
    Set<Id<"workoutExercises">>
  >(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Sort by order
  const sorted = useMemo(
    () =>
      [...exercises].sort(
        (a, b) => a.workoutExercise.order - b.workoutExercise.order,
      ),
    [exercises],
  );

  // ── Group exercises into superset groups and singles ───────────────────
  const renderItems = useMemo(() => {
    const items: RenderItem[] = [];
    const seenGroups = new Set<string>();
    let colorCounter = 0;

    // Precompute group map
    const groupMap = new Map<string, ExerciseItemData[]>();
    for (const ex of sorted) {
      const gid = ex.workoutExercise.supersetGroupId;
      if (gid) {
        if (!groupMap.has(gid)) groupMap.set(gid, []);
        groupMap.get(gid)!.push(ex);
      }
    }

    for (const ex of sorted) {
      const gid = ex.workoutExercise.supersetGroupId;
      if (gid && !seenGroups.has(gid)) {
        seenGroups.add(gid);
        const members = groupMap.get(gid)!;
        items.push({
          type: "superset",
          group: { groupId: gid, items: members },
          colorIndex: colorCounter++,
        });
      } else if (!gid) {
        items.push({ type: "single", item: ex });
      }
      // If gid was already seen, it's already included in its group render
    }

    return items;
  }, [sorted]);

  // ── Selection handlers ─────────────────────────────────────────────────
  const handleSelectionChange = useCallback(
    (id: Id<"workoutExercises">, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [],
  );

  const handleCreateSuperset = useCallback(async () => {
    if (selectedIds.size < 2) return;
    const groupId = crypto.randomUUID();
    await setSupersetGroup({
      workoutExerciseIds: Array.from(selectedIds),
      supersetGroupId: groupId,
    });
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, setSupersetGroup]);

  const handleRemoveFromSuperset = useCallback(
    async (weId: Id<"workoutExercises">) => {
      await clearSupersetGroup({ workoutExerciseId: weId });
    },
    [clearSupersetGroup],
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Turning off — clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Filter selected: only allow selecting exercises not already in a superset
  const isSelectableExercise = useCallback(
    (item: ExerciseItemData) => !item.workoutExercise.supersetGroupId,
    [],
  );

  return (
    <div className="space-y-4">
      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto h-8 w-8 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-500">
            No exercises yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Add an exercise to start logging sets.
          </p>
        </div>
      )}

      {/* Superset selection mode toggle */}
      {sorted.length >= 2 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className="text-xs"
          >
            {selectionMode ? (
              <>
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
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </>
            ) : (
              <>
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
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.879-3.04a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757"
                  />
                </svg>
                Group Superset
              </>
            )}
          </Button>
        </div>
      )}

      {/* Render grouped and ungrouped exercises */}
      {renderItems.map((renderItem) => {
        if (renderItem.type === "single") {
          const item = renderItem.item;
          return (
            <WorkoutExerciseItem
              key={item.workoutExercise._id}
              data={item}
              unit={unit}
              selectable={selectionMode && isSelectableExercise(item)}
              selected={selectedIds.has(item.workoutExercise._id)}
              onSelectionChange={handleSelectionChange}
              userDefaultRestSeconds={userDefaultRestSeconds}
            />
          );
        }

        // Superset group container
        const { group, colorIndex } = renderItem;
        return (
          <div
            key={group.groupId}
            className={cn(
              "rounded-xl border border-gray-200 border-l-4 bg-gray-50/30 p-3 space-y-3",
              getSupersetColor(colorIndex),
            )}
          >
            {/* Superset badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-3 w-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.879-3.04a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757"
                  />
                </svg>
                Superset
              </span>
            </div>

            {group.items.map((item) => (
              <div key={item.workoutExercise._id} className="relative">
                <WorkoutExerciseItem
                  data={item}
                  unit={unit}
                  selectable={false}
                  selected={false}
                  userDefaultRestSeconds={userDefaultRestSeconds}
                />
                {/* Remove from superset button */}
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveFromSuperset(item.workoutExercise._id)
                  }
                  className="absolute top-2 right-12 rounded-full bg-gray-100 p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${item.exercise?.name ?? "exercise"} from superset`}
                  title="Remove from superset"
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
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Floating "Create Superset" button when 2+ selected */}
      {selectionMode && selectedIds.size >= 2 && (
        <div className="sticky bottom-4 z-10 flex justify-center">
          <Button
            onClick={handleCreateSuperset}
            className="shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mr-2 h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.879-3.04a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757"
              />
            </svg>
            Create Superset ({selectedIds.size} exercises)
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={onAddExercise}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="mr-2 h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add Exercise
      </Button>
    </div>
  );
}
