import React, { useCallback, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { formatRestTime } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RestDurationConfigProps {
  workoutExerciseId: Id<"workoutExercises">;
  /** The resolved rest duration (from priority chain). */
  currentRestSeconds: number;
  /** Whether this value is an exercise-level override (vs inherited). */
  isOverride: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RestDurationConfig({
  workoutExerciseId,
  currentRestSeconds,
  isOverride,
}: RestDurationConfigProps) {
  const updateRestSeconds = useMutation(
    api.workoutExercises.updateRestSeconds,
  );
  const [expanded, setExpanded] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const handleAdjust = useCallback(
    async (delta: number) => {
      const newValue = Math.max(0, currentRestSeconds + delta);
      setIsMutating(true);
      try {
        await updateRestSeconds({
          workoutExerciseId,
          restSeconds: newValue,
        });
      } catch (err) {
        console.error(
          "[RestDurationConfig] Failed to update rest seconds:",
          err,
        );
      } finally {
        setIsMutating(false);
      }
    },
    [currentRestSeconds, updateRestSeconds, workoutExerciseId],
  );

  const handleReset = useCallback(async () => {
    setIsMutating(true);
    try {
      await updateRestSeconds({
        workoutExerciseId,
        restSeconds: undefined,
      });
    } catch (err) {
      console.error(
        "[RestDurationConfig] Failed to reset rest seconds:",
        err,
      );
    } finally {
      setIsMutating(false);
    }
  }, [updateRestSeconds, workoutExerciseId]);

  return (
    <View style={styles.container}>
      {/* Collapsed: clickable clock + time badge */}
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.badge}
        accessibilityLabel={`Rest: ${formatRestTime(currentRestSeconds)}. Tap to configure.`}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
        <Text style={styles.badgeText}>
          {formatRestTime(currentRestSeconds)}
        </Text>
        {isOverride && <View style={styles.overrideDot} />}
      </TouchableOpacity>

      {/* Expanded: adjust controls */}
      {expanded && (
        <View style={styles.adjustRow}>
          <TouchableOpacity
            onPress={() => handleAdjust(-15)}
            disabled={isMutating || currentRestSeconds <= 0}
            style={[
              styles.adjustButton,
              (isMutating || currentRestSeconds <= 0) && styles.adjustButtonDisabled,
            ]}
            accessibilityLabel="Decrease rest by 15 seconds"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.adjustText}>−15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdjust(15)}
            disabled={isMutating}
            style={[
              styles.adjustButton,
              isMutating && styles.adjustButtonDisabled,
            ]}
            accessibilityLabel="Increase rest by 15 seconds"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.adjustText}>+15s</Text>
          </TouchableOpacity>

          {isOverride && (
            <TouchableOpacity
              onPress={handleReset}
              disabled={isMutating}
              style={[
                styles.resetButton,
                isMutating && styles.adjustButtonDisabled,
              ]}
              accessibilityLabel="Reset to default rest duration"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  overrideDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginLeft: 2,
  },
  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  adjustButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.backgroundSecondary,
  },
  adjustButtonDisabled: {
    opacity: 0.4,
  },
  adjustText: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  resetButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#FEF3C7",
  },
  resetText: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: "#D97706",
  },
});
