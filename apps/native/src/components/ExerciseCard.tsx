import React, { memo } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, fontFamily, spacing } from "../lib/theme";

/** Shape returned by the listExercises query. */
export interface Exercise {
  _id: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  exerciseType: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
}

/** Badge background + text color pairs keyed by value. */
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  // Muscle groups
  chest: { bg: "#DBEAFE", text: "#1D4ED8" },
  back: { bg: "#E0E7FF", text: "#4338CA" },
  shoulders: { bg: "#EDE9FE", text: "#7C3AED" },
  biceps: { bg: "#FCE7F3", text: "#BE185D" },
  triceps: { bg: "#FFE4E6", text: "#BE123C" },
  legs: { bg: "#DCFCE7", text: "#15803D" },
  core: { bg: "#FEF9C3", text: "#A16207" },
  fullBody: { bg: "#CCFBF1", text: "#0F766E" },
  cardio: { bg: "#FFEDD5", text: "#C2410C" },
  // Equipment
  barbell: { bg: "#F1F5F9", text: "#334155" },
  dumbbell: { bg: "#F3F4F6", text: "#374151" },
  cable: { bg: "#F4F4F5", text: "#3F3F46" },
  machine: { bg: "#F5F5F4", text: "#44403C" },
  bodyweight: { bg: "#D1FAE5", text: "#065F46" },
  kettlebell: { bg: "#FEF3C7", text: "#92400E" },
  bands: { bg: "#ECFCCB", text: "#3F6212" },
  other: { bg: "#F5F5F5", text: "#525252" },
  // Exercise types
  strength: { bg: "#E0F2FE", text: "#0369A1" },
  stretch: { bg: "#EDE9FE", text: "#6D28D9" },
  plyometric: { bg: "#FAE8FF", text: "#A21CAF" },
};

const DEFAULT_BADGE = { bg: "#F3F4F6", text: "#6B7280" };

/** Converts camelCase enum values to human-readable labels. */
function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function Badge({ label }: { label: string }) {
  const badgeColor = BADGE_COLORS[label] ?? DEFAULT_BADGE;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: badgeColor.bg }]}>
      <Text
        style={[
          badgeStyles.badgeText,
          { color: badgeColor.text },
        ]}
      >
        {formatLabel(label)}
      </Text>
    </View>
  );
}

function ExerciseCardInner({ exercise }: ExerciseCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
    >
      <Text style={styles.name} numberOfLines={1}>
        {exercise.name}
      </Text>
      <View style={styles.badges}>
        <Badge label={exercise.primaryMuscleGroup} />
        <Badge label={exercise.equipment} />
        <Badge label={exercise.exerciseType} />
      </View>
    </TouchableOpacity>
  );
}

const ExerciseCard = memo(ExerciseCardInner);
ExerciseCard.displayName = "ExerciseCard";
export default ExerciseCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    textTransform: "capitalize",
  },
});
