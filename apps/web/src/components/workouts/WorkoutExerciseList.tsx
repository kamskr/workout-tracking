"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Link2, Sparkles } from "lucide-react";
import type { WeightUnit } from "@/lib/units";
import WorkoutExerciseItem from "./WorkoutExerciseItem";
import type { ExerciseItemData } from "./WorkoutExerciseItem";
import { Button } from "@/components/common/button";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { cn } from "@/lib/utils";

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

interface SupersetGroup {
  groupId: string;
  items: ExerciseItemData[];
}

type RenderItem =
  | { type: "single"; item: ExerciseItemData }
  | { type: "superset"; group: SupersetGroup; colorIndex: number };

interface WorkoutExerciseListProps {
  exercises: ExerciseItemData[];
  unit: WeightUnit;
  onAddExercise: () => void;
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

  const [selectedIds, setSelectedIds] = useState<
    Set<Id<"workoutExercises">>
  >(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const sorted = useMemo(
    () =>
      [...exercises].sort(
        (a, b) => a.workoutExercise.order - b.workoutExercise.order,
      ),
    [exercises],
  );

  const renderItems = useMemo(() => {
    const items: RenderItem[] = [];
    const seenGroups = new Set<string>();
    let colorCounter = 0;

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
    }

    return items;
  }, [sorted]);

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
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const isSelectableExercise = useCallback(
    (item: ExerciseItemData) => !item.workoutExercise.supersetGroupId,
    [],
  );

  return (
    <div className="space-y-4" data-workout-exercise-list>
      {sorted.length === 0 && (
        <div className="workout-empty-panel">
          <div className="workout-empty-panel__icon">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">No exercises yet</p>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Add your first movement to start logging sets, surfacing PR badges, and building the detail history used across the refreshed app.
            </p>
          </div>
        </div>
      )}

      {sorted.length >= 2 && (
        <div className="workout-surface workout-surface--muted p-4 sm:p-5">
          <div className="workout-toolbar gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AppBadge tone="neutral">Superset tools</AppBadge>
                <span className="workout-section-label">Grouping stays behaviorally unchanged</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Select two or more standalone exercises to link them into one superset container without disturbing set logging or rest timing.
              </p>
            </div>
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className={cn(
                "rounded-full px-4",
                !selectionMode && "border-white/70 bg-white/75 shadow-sm hover:bg-white",
              )}
            >
              {selectionMode ? "Cancel" : "Group Superset"}
            </Button>
          </div>
        </div>
      )}

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

        const { group, colorIndex } = renderItem;
        return (
          <div
            key={group.groupId}
            className={cn(
              "workout-superset-frame border-l-4 p-3 sm:p-4",
              getSupersetColor(colorIndex),
            )}
            data-workout-superset
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <AppBadge tone="accent">Superset</AppBadge>
                <span className="workout-section-label">Grouped effort block</span>
              </div>
              <span className="workout-kpi-pill">
                <Link2 className="h-3.5 w-3.5" />
                {group.items.length} exercises linked
              </span>
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.workoutExercise._id} className="relative">
                  <WorkoutExerciseItem
                    data={item}
                    unit={unit}
                    selectable={false}
                    selected={false}
                    userDefaultRestSeconds={userDefaultRestSeconds}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveFromSuperset(item.workoutExercise._id)
                    }
                    className="absolute right-12 top-3 rounded-full bg-white/78 p-1.5 text-slate-400 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
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
          </div>
        );
      })}

      {selectionMode && selectedIds.size >= 2 && (
        <div className="sticky bottom-4 z-10 flex justify-center">
          <Button
            onClick={handleCreateSuperset}
            className="rounded-full px-5 shadow-[0_18px_36px_rgba(13,135,225,0.24)]"
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
        className="h-11 w-full rounded-full border-white/70 bg-white/75 shadow-sm hover:bg-white"
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
