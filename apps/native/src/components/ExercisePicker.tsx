import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import ExerciseFilters, {
  type ExerciseFilterState,
} from "./ExerciseFilters";
import { colors, fontFamily, spacing } from "../lib/theme";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  workoutId: Id<"workouts">;
}

/** Badge background + text color pairs keyed by value. */
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  chest: { bg: "#DBEAFE", text: "#1D4ED8" },
  back: { bg: "#E0E7FF", text: "#4338CA" },
  shoulders: { bg: "#EDE9FE", text: "#7C3AED" },
  biceps: { bg: "#FCE7F3", text: "#BE185D" },
  triceps: { bg: "#FFE4E6", text: "#BE123C" },
  legs: { bg: "#DCFCE7", text: "#15803D" },
  core: { bg: "#FEF9C3", text: "#A16207" },
  fullBody: { bg: "#CCFBF1", text: "#0F766E" },
  cardio: { bg: "#FFEDD5", text: "#C2410C" },
};

const DEFAULT_BADGE = { bg: "#F3F4F6", text: "#6B7280" };

function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

interface ExerciseRow {
  _id: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
}

export default function ExercisePicker({
  open,
  onClose,
  workoutId,
}: ExercisePickerProps) {
  const [filters, setFilters] = useState<ExerciseFilterState>({
    searchQuery: "",
    primaryMuscleGroup: "",
    equipment: "",
  });

  const addExercise = useMutation(api.workoutExercises.addExerciseToWorkout);

  // Build query args — only pass non-empty values
  const queryArgs: Record<string, string> = {};
  if (filters.searchQuery) queryArgs.searchQuery = filters.searchQuery;
  if (filters.primaryMuscleGroup)
    queryArgs.primaryMuscleGroup = filters.primaryMuscleGroup;
  if (filters.equipment) queryArgs.equipment = filters.equipment;

  const exercises = useQuery(api.exercises.listExercises, queryArgs);

  const handleSelect = useCallback(
    async (exerciseId: Id<"exercises">) => {
      try {
        await addExercise({ workoutId, exerciseId });
        onClose();
      } catch (err) {
        console.error("[ExercisePicker] addExercise failed:", err);
      }
    },
    [addExercise, workoutId, onClose],
  );

  const renderExercise = useCallback(
    ({ item }: { item: ExerciseRow }) => {
      const muscleBadge =
        BADGE_COLORS[item.primaryMuscleGroup] ?? DEFAULT_BADGE;
      return (
        <TouchableOpacity
          style={pickerStyles.exerciseRow}
          onPress={() => handleSelect(item._id as Id<"exercises">)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name}`}
        >
          <View style={pickerStyles.exerciseInfo}>
            <Text style={pickerStyles.exerciseName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={pickerStyles.badges}>
              <View
                style={[
                  pickerStyles.badge,
                  { backgroundColor: muscleBadge.bg },
                ]}
              >
                <Text
                  style={[pickerStyles.badgeText, { color: muscleBadge.text }]}
                >
                  {formatLabel(item.primaryMuscleGroup)}
                </Text>
              </View>
              <View style={[pickerStyles.badge, { backgroundColor: "#F3F4F6" }]}>
                <Text style={[pickerStyles.badgeText, { color: "#6B7280" }]}>
                  {item.equipment}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="add" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    },
    [handleSelect],
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={pickerStyles.container} edges={["top"]}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.headerTitle}>Add Exercise</Text>
          <TouchableOpacity
            onPress={onClose}
            style={pickerStyles.closeButton}
            accessibilityLabel="Close exercise picker"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={pickerStyles.filtersContainer}>
          <ExerciseFilters filters={filters} onFiltersChange={setFilters} />
        </View>

        {/* Exercise list */}
        {exercises === undefined ? (
          <View style={pickerStyles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : exercises.length === 0 ? (
          <View style={pickerStyles.center}>
            <Text style={pickerStyles.emptyText}>
              No exercises found. Try adjusting your filters.
            </Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item._id}
            renderItem={renderExercise}
            contentContainerStyle={pickerStyles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.text,
    marginBottom: 4,
  },
  badges: {
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    textTransform: "capitalize",
  },
});
