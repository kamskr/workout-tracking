import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { formatDuration } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";
import UnitToggle from "./UnitToggle";

interface ActiveWorkoutHeaderProps {
  workoutId: Id<"workouts">;
  name: string;
  startedAt: number;
  onFinished: () => void;
}

export default function ActiveWorkoutHeader({
  workoutId,
  name,
  startedAt,
  onFinished,
}: ActiveWorkoutHeaderProps) {
  const finishWorkout = useMutation(api.workouts.finishWorkout);
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );
  const [isFinishing, setIsFinishing] = useState(false);

  // Running duration timer — ticks every second
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const handleFinish = useCallback(() => {
    Alert.alert(
      "Finish Workout",
      "Are you sure you want to finish this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: () => {
            setIsFinishing(true);
            void finishWorkout({ id: workoutId })
              .then(() => onFinished())
              .catch((err: unknown) => {
                console.error("[ActiveWorkoutHeader] finishWorkout failed:", err);
                setIsFinishing(false);
              });
          },
        },
      ],
    );
  }, [finishWorkout, workoutId, onFinished]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>In Progress</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <UnitToggle />
        <TouchableOpacity
          style={[styles.finishButton, isFinishing && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={isFinishing}
          accessibilityLabel="Finish workout"
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.finishText}>
            {isFinishing ? "Finishing…" : "Finish Workout"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleArea: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timer: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: "#15803D",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 8,
  },
  finishButtonDisabled: {
    opacity: 0.6,
  },
  finishText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
});
