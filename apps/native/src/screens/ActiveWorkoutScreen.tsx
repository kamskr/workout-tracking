import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { WeightUnit } from "../lib/units";
import ActiveWorkoutHeader from "../components/ActiveWorkoutHeader";
import WorkoutExerciseList from "../components/WorkoutExerciseList";
import ExercisePicker from "../components/ExercisePicker";
import { RestTimerProvider } from "../components/RestTimerContext";
import RestTimerDisplay from "../components/RestTimerDisplay";
import { colors, fontFamily, spacing } from "../lib/theme";

interface ActiveWorkoutScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

export default function ActiveWorkoutScreen({
  navigation,
}: ActiveWorkoutScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createdWorkoutId, setCreatedWorkoutId] = useState<Id<"workouts"> | null>(
    null,
  );
  // D022: useRef guard to prevent double-creation
  const createAttempted = useRef(false);

  const createWorkout = useMutation(api.workouts.createWorkout);

  // D018: Check for existing in-progress workout
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);

  // Determine the active workout ID (existing or just-created)
  const workoutId = activeWorkout?._id ?? createdWorkoutId;

  // Auto-create workout if none exists
  useEffect(() => {
    if (
      activeWorkout !== undefined &&
      activeWorkout === null &&
      !createAttempted.current &&
      !createdWorkoutId
    ) {
      createAttempted.current = true;
      void createWorkout({ name: "Workout" })
        .then((id) => {
          setCreatedWorkoutId(id);
        })
        .catch((err) => {
          console.error("[ActiveWorkoutScreen] Failed to create workout:", err);
          createAttempted.current = false;
        });
    }
  }, [activeWorkout, createdWorkoutId, createWorkout]);

  // Load workout details once we have an ID
  const workoutDetails = useQuery(
    api.workouts.getWorkoutWithDetails,
    workoutId ? { id: workoutId } : "skip",
  );

  // Load user preferences for unit
  const preferences = useQuery(api.userPreferences.getPreferences);
  const unit: WeightUnit = preferences?.weightUnit ?? "kg";

  const userDefaultRestSeconds =
    preferences && "defaultRestSeconds" in preferences
      ? (preferences.defaultRestSeconds as number | undefined)
      : undefined;

  const handleFinished = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Loading state: waiting for active workout check
  if (activeWorkout === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Creating workout state
  if (!workoutId) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Starting workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading workout details
  if (!workoutDetails) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { workout, exercises } = workoutDetails;

  return (
    <RestTimerProvider>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActiveWorkoutHeader
          workoutId={workout._id}
          name={workout.name ?? "Workout"}
          startedAt={workout.startedAt!}
          onFinished={handleFinished}
        />

        <WorkoutExerciseList
          exercises={exercises}
          unit={unit}
          onAddExercise={() => setPickerOpen(true)}
          userDefaultRestSeconds={userDefaultRestSeconds}
        />

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          workoutId={workout._id}
        />

        <RestTimerDisplay />
      </SafeAreaView>
    </RestTimerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
});
