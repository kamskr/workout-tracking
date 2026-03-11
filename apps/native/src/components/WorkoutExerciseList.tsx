import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import type { WeightUnit } from "../lib/units";
import WorkoutExerciseItem from "./WorkoutExerciseItem";
import type { ExerciseItemData } from "./WorkoutExerciseItem";
import { colors, fontFamily, spacing } from "../lib/theme";

// ── Superset color palette (left-border colors for visual grouping) ──────
const SUPERSET_COLORS = [
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#10B981", // emerald
  "#F43F5E", // rose
  "#0EA5E9", // sky
  "#F97316", // orange
];

function getSupersetColor(index: number): string {
  return SUPERSET_COLORS[index % SUPERSET_COLORS.length]!;
}

// ── Types ────────────────────────────────────────────────────────────────

interface SupersetGroup {
  groupId: string;
  items: ExerciseItemData[];
}

type RenderItem =
  | { type: "single"; item: ExerciseItemData }
  | { type: "superset"; group: SupersetGroup; colorIndex: number };

// ── Component ────────────────────────────────────────────────────────────

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
  const setSupersetGroup = useMutation(api.workoutExercises.setSupersetGroup);
  const clearSupersetGroup = useMutation(
    api.workoutExercises.clearSupersetGroup,
  );

  // Selection state for creating supersets
  const [selectedIds, setSelectedIds] = useState<Set<Id<"workoutExercises">>>(
    new Set(),
  );
  const [selectionMode, setSelectionMode] = useState(false);

  // Sort by order
  const sorted = useMemo(
    () =>
      [...exercises].sort(
        (a, b) => a.workoutExercise.order - b.workoutExercise.order,
      ),
    [exercises],
  );

  // ── Group exercises into superset groups and singles (D028) ──────────
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

  // ── Selection handlers ───────────────────────────────────────────────
  const handleSelectionChange = useCallback(
    (id: Id<"workoutExercises">, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [],
  );

  const handleCreateSuperset = useCallback(async () => {
    if (selectedIds.size < 2) return;
    // Generate a UUID-like group ID
    const groupId =
      "ss-" +
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36);
    try {
      await setSupersetGroup({
        workoutExerciseIds: Array.from(selectedIds),
        supersetGroupId: groupId,
      });
    } catch (err) {
      console.error("[WorkoutExerciseList] setSupersetGroup failed:", err);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, setSupersetGroup]);

  const handleRemoveFromSuperset = useCallback(
    async (weId: Id<"workoutExercises">) => {
      try {
        await clearSupersetGroup({ workoutExerciseId: weId });
      } catch (err) {
        console.error("[WorkoutExerciseList] clearSupersetGroup failed:", err);
      }
    },
    [clearSupersetGroup],
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const isSelectableExercise = useCallback(
    (item: ExerciseItemData) => !item.workoutExercise.supersetGroupId,
    [],
  );

  return (
    <ScrollView
      style={listStyles.container}
      contentContainerStyle={listStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Empty state */}
      {sorted.length === 0 && (
        <View style={listStyles.empty}>
          <Ionicons name="add-circle-outline" size={32} color={colors.border} />
          <Text style={listStyles.emptyTitle}>No exercises yet</Text>
          <Text style={listStyles.emptySubtitle}>
            Add an exercise to start logging sets.
          </Text>
        </View>
      )}

      {/* Superset selection mode toggle */}
      {sorted.length >= 2 && (
        <View style={listStyles.selectionToggleRow}>
          <TouchableOpacity
            style={[
              listStyles.selectionToggle,
              selectionMode && listStyles.selectionToggleActive,
            ]}
            onPress={toggleSelectionMode}
            accessibilityLabel={
              selectionMode ? "Cancel superset selection" : "Group superset"
            }
            accessibilityRole="button"
          >
            <Ionicons
              name={selectionMode ? "close" : "link"}
              size={14}
              color={selectionMode ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                listStyles.selectionToggleText,
                selectionMode && listStyles.selectionToggleTextActive,
              ]}
            >
              {selectionMode ? "Cancel" : "Group Superset"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Render grouped and ungrouped exercises */}
      {renderItems.map((renderItem) => {
        if (renderItem.type === "single") {
          const item = renderItem.item;
          return (
            <View key={item.workoutExercise._id} style={listStyles.itemWrapper}>
              <WorkoutExerciseItem
                data={item}
                unit={unit}
                selectable={selectionMode && isSelectableExercise(item)}
                selected={selectedIds.has(item.workoutExercise._id)}
                onSelectionChange={handleSelectionChange}
                userDefaultRestSeconds={userDefaultRestSeconds}
              />
            </View>
          );
        }

        // Superset group container
        const { group, colorIndex } = renderItem;
        const borderColor = getSupersetColor(colorIndex);
        return (
          <View
            key={group.groupId}
            style={[listStyles.supersetContainer, { borderLeftColor: borderColor }]}
          >
            {/* Superset badge */}
            <View style={listStyles.supersetBadgeRow}>
              <View style={listStyles.supersetBadge}>
                <Ionicons name="link" size={11} color="#7C3AED" />
                <Text style={listStyles.supersetBadgeText}>Superset</Text>
              </View>
            </View>

            {group.items.map((item) => (
              <View key={item.workoutExercise._id} style={listStyles.supersetItem}>
                <WorkoutExerciseItem
                  data={item}
                  unit={unit}
                  selectable={false}
                  selected={false}
                  userDefaultRestSeconds={userDefaultRestSeconds}
                />
                {/* Remove from superset button */}
                <TouchableOpacity
                  onPress={() =>
                    handleRemoveFromSuperset(item.workoutExercise._id)
                  }
                  style={listStyles.removeSupersetButton}
                  accessibilityLabel={`Remove ${item.exercise?.name ?? "exercise"} from superset`}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}

      {/* Floating "Create Superset" button when 2+ selected */}
      {selectionMode && selectedIds.size >= 2 && (
        <TouchableOpacity
          style={listStyles.createSupersetButton}
          onPress={handleCreateSuperset}
          accessibilityLabel={`Create superset with ${selectedIds.size} exercises`}
          accessibilityRole="button"
        >
          <Ionicons name="link" size={16} color="#FFFFFF" />
          <Text style={listStyles.createSupersetText}>
            Create Superset ({selectedIds.size} exercises)
          </Text>
        </TouchableOpacity>
      )}

      {/* Add Exercise button */}
      <TouchableOpacity
        style={listStyles.addExerciseButton}
        onPress={onAddExercise}
        accessibilityLabel="Add exercise"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={20} color={colors.accent} />
        <Text style={listStyles.addExerciseText}>Add Exercise</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const listStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  itemWrapper: {},
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    marginTop: spacing.xs,
  },
  selectionToggleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  selectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionToggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectionToggleText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  selectionToggleTextActive: {
    color: "#FFFFFF",
  },
  supersetContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  supersetBadgeRow: {
    flexDirection: "row",
  },
  supersetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  supersetBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: "#7C3AED",
  },
  supersetItem: {
    position: "relative",
  },
  removeSupersetButton: {
    position: "absolute",
    top: 8,
    right: 40,
    zIndex: 1,
  },
  createSupersetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createSupersetText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addExerciseText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
});
