import React, { useState, useCallback, useMemo, memo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { formatWeight, type WeightUnit } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";
import SetRow from "./SetRow";
import RestDurationConfig from "./RestDurationConfig";
import { useRestTimer } from "./RestTimerContext";
import type { SetData } from "./SetRow";

interface ExerciseItemData {
  workoutExercise: {
    _id: Id<"workoutExercises">;
    workoutId: Id<"workouts">;
    exerciseId: Id<"exercises">;
    order: number;
    supersetGroupId?: string;
    restSeconds?: number;
  };
  exercise: {
    _id: Id<"exercises">;
    name: string;
    primaryMuscleGroup: string;
    equipment: string;
    defaultRestSeconds?: number;
  } | null;
  sets: SetData[];
}

interface WorkoutExerciseItemProps {
  data: ExerciseItemData;
  unit: WeightUnit;
  /** Whether to show the selection checkbox for superset grouping. */
  selectable?: boolean;
  /** Whether this exercise is currently selected. */
  selected?: boolean;
  /** Called when the selection checkbox is toggled. */
  onSelectionChange?: (id: Id<"workoutExercises">, selected: boolean) => void;
  /** User-level default rest seconds from preferences (lowest priority). */
  userDefaultRestSeconds?: number;
}

/**
 * Summarise previous performance sets into a compact string.
 * Groups consecutive identical (weight, reps) pairs.
 * Example: "3×10 @ 60 kg, 3×8 @ 65 kg"
 */
function formatPreviousPerformance(
  sets: { weight?: number; reps?: number }[],
  unit: WeightUnit,
): string {
  if (sets.length === 0) return "";

  const groups: { weight?: number; reps?: number; count: number }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight && last.reps === s.reps) {
      last.count++;
    } else {
      groups.push({ weight: s.weight, reps: s.reps, count: 1 });
    }
  }

  return groups
    .map((g) => {
      const repsStr = g.reps != null ? `${g.reps}` : "?";
      const setStr = `${g.count}×${repsStr}`;
      if (g.weight != null && g.weight > 0) {
        return `${setStr} @ ${formatWeight(g.weight, unit)}`;
      }
      return setStr;
    })
    .join(", ");
}

/**
 * Compute the effective rest duration using the 4-level priority chain (D031):
 * workoutExercise.restSeconds → exercise.defaultRestSeconds → userDefaultRestSeconds → 60
 */
function resolveRestSeconds(
  workoutExercise: ExerciseItemData["workoutExercise"],
  exercise: ExerciseItemData["exercise"],
  userDefaultRestSeconds?: number,
): { seconds: number; isOverride: boolean } {
  if (workoutExercise.restSeconds != null) {
    return { seconds: workoutExercise.restSeconds, isOverride: true };
  }
  if (exercise?.defaultRestSeconds != null) {
    return { seconds: exercise.defaultRestSeconds, isOverride: false };
  }
  if (userDefaultRestSeconds != null) {
    return { seconds: userDefaultRestSeconds, isOverride: false };
  }
  return { seconds: 60, isOverride: false };
}

function WorkoutExerciseItemInner({
  data,
  unit,
  selectable = false,
  selected = false,
  onSelectionChange,
  userDefaultRestSeconds,
}: WorkoutExerciseItemProps) {
  const logSet = useMutation(api.sets.logSet);
  const removeExercise = useMutation(
    api.workoutExercises.removeExerciseFromWorkout,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  // Rest timer integration
  const { startTimer } = useRestTimer();

  const restInfo = resolveRestSeconds(
    data.workoutExercise,
    data.exercise,
    userDefaultRestSeconds,
  );

  // Previous performance query (R007)
  const previousPerformance = useQuery(
    api.sets.getPreviousPerformance,
    data.workoutExercise.exerciseId
      ? { exerciseId: data.workoutExercise.exerciseId }
      : "skip",
  );

  // PR badge — subscribe to all PRs for this workout, filter for this exercise (D055)
  const workoutPRs = useQuery(
    api.personalRecords.getWorkoutPRs,
    data.workoutExercise.workoutId
      ? { workoutId: data.workoutExercise.workoutId }
      : "skip",
  );

  const exercisePRs = useMemo(() => {
    if (!workoutPRs) return [];
    return workoutPRs.filter(
      (pr) => pr.exerciseId === data.workoutExercise.exerciseId,
    );
  }, [workoutPRs, data.workoutExercise.exerciseId]);

  const handleAddSet = useCallback(async () => {
    try {
      await logSet({ workoutExerciseId: data.workoutExercise._id });

      // D031: Start rest timer after logging a set.
      // Skip if rest duration is 0.
      const duration = restInfo.seconds;
      if (duration > 0) {
        startTimer(duration, data.exercise?.name);
      }
    } catch (err) {
      console.error("[WorkoutExerciseItem] logSet failed:", err);
    }
  }, [logSet, data.workoutExercise._id, data.exercise?.name, restInfo.seconds, startTimer]);

  const handleRemoveExercise = useCallback(() => {
    Alert.alert(
      "Remove Exercise",
      `Remove "${data.exercise?.name ?? "Exercise"}" and all its sets?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsRemoving(true);
            try {
              await removeExercise({
                workoutExerciseId: data.workoutExercise._id,
              });
            } catch {
              setIsRemoving(false);
            }
          },
        },
      ],
    );
  }, [removeExercise, data.workoutExercise._id, data.exercise?.name]);

  const sortedSets = [...data.sets].sort((a, b) => a.setNumber - b.setNumber);

  const prevPerfSummary =
    previousPerformance && previousPerformance.sets.length > 0
      ? formatPreviousPerformance(previousPerformance.sets, unit)
      : null;

  return (
    <View
      style={[
        styles.card,
        isRemoving && styles.cardRemoving,
        selected && styles.cardSelected,
      ]}
    >
      {/* Exercise header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectable && (
            <TouchableOpacity
              onPress={() =>
                onSelectionChange?.(data.workoutExercise._id, !selected)
              }
              style={styles.checkbox}
              accessibilityLabel={`Select ${data.exercise?.name ?? "exercise"} for superset`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              <Ionicons
                name={selected ? "checkbox" : "square-outline"}
                size={22}
                color={selected ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {data.exercise?.name ?? "Unknown Exercise"}
            </Text>
            {data.exercise && (
              <Text style={styles.exerciseMeta}>
                {data.exercise.primaryMuscleGroup.replace(
                  /([a-z])([A-Z])/g,
                  "$1 $2",
                )}{" "}
                · {data.exercise.equipment}
              </Text>
            )}
            {/* Previous performance display (R007, D027) */}
            {prevPerfSummary && (
              <Text style={styles.prevPerf}>Last: {prevPerfSummary}</Text>
            )}
            {/* First-time badge */}
            {previousPerformance === null && (
              <Text style={styles.firstTime}>First time! 🎉</Text>
            )}
            {/* PR badges — appear reactively after a set triggers a PR (D055) */}
            {exercisePRs.length > 0 && (
              <View style={styles.prBadgeRow}>
                {exercisePRs.map((pr) => (
                  <View key={pr.type} style={styles.prBadge}>
                    <Text style={styles.prBadgeText}>
                      🏆{" "}
                      {pr.type === "weight"
                        ? "Weight PR"
                        : pr.type === "volume"
                          ? "Volume PR"
                          : "Reps PR"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {/* Rest duration config */}
            <View style={styles.restConfigRow}>
              <RestDurationConfig
                workoutExerciseId={data.workoutExercise._id}
                currentRestSeconds={restInfo.seconds}
                isOverride={restInfo.isOverride}
              />
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRemoveExercise}
          style={styles.removeButton}
          accessibilityLabel={`Remove ${data.exercise?.name ?? "exercise"}`}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      {sortedSets.length > 0 && (
        <View style={styles.columnHeaders}>
          <View style={styles.setNumCol}>
            <Text style={styles.colLabel}>Set</Text>
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.colLabel}>Weight</Text>
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.colLabel}>Reps</Text>
          </View>
          <View style={styles.rpeCol}>
            <Text style={styles.colLabel}>RPE</Text>
          </View>
          <View style={styles.actionsSpacerCol} />
        </View>
      )}

      {/* Sets */}
      <View style={styles.setsList}>
        {sortedSets.map((set) => (
          <SetRow key={set._id} set={set} unit={unit} />
        ))}
      </View>

      {/* Add set button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={handleAddSet}
        accessibilityLabel="Add set"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={colors.textSecondary} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const WorkoutExerciseItem = memo(WorkoutExerciseItemInner);
WorkoutExerciseItem.displayName = "WorkoutExerciseItem";
export default WorkoutExerciseItem;

export type { ExerciseItemData, SetData };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardRemoving: {
    opacity: 0.5,
  },
  cardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  checkbox: {
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  exerciseMeta: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  prevPerf: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.accent,
    marginTop: 2,
  },
  firstTime: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.success,
    marginTop: 2,
  },
  prBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  prBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F59E0B",
  },
  prBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: "#92400E",
  },
  restConfigRow: {
    marginTop: 4,
  },
  removeButton: {
    padding: spacing.xs,
  },
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 2,
    gap: 4,
  },
  setNumCol: {
    width: 28,
    alignItems: "center",
  },
  inputCol: {
    flex: 2,
  },
  rpeCol: {
    width: 48,
    alignItems: "center",
  },
  actionsSpacerCol: {
    width: 90,
  },
  colLabel: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setsList: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    gap: 4,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
});
