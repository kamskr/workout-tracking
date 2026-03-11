import React, { memo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useNavigation } from "@react-navigation/native";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../lib/theme";

interface TemplateCardProps {
  template: {
    _id: Id<"workoutTemplates">;
    name: string;
    description?: string;
    _creationTime: number;
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const MAX_DISPLAY_EXERCISES = 4;

function TemplateCardInner({ template }: TemplateCardProps) {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const [isStarting, setIsStarting] = useState(false);

  const data = useQuery(api.templates.getTemplateWithExercises, {
    templateId: template._id,
  });
  const startWorkout = useMutation(api.templates.startWorkoutFromTemplate);
  const deleteTemplateMutation = useMutation(api.templates.deleteTemplate);

  const exerciseNames =
    data?.exercises
      .map((e: { exercise: { name: string } | null }) => e.exercise?.name)
      .filter((n: string | undefined): n is string => !!n) ?? [];
  const exerciseCount = data?.exercises.length ?? 0;
  const isLoadingExercises = data === undefined;

  const displayNames = exerciseNames.slice(0, MAX_DISPLAY_EXERCISES);
  const remainingCount = exerciseNames.length - MAX_DISPLAY_EXERCISES;

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      await startWorkout({ templateId: template._id });
      // Navigate to the Workouts tab's ActiveWorkout screen
      // Using parent navigator to switch tab then push
      (navigation as any).navigate("Workouts", { screen: "ActiveWorkout" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start workout from template";
      // D035: Descriptive conflict error for active workout
      Alert.alert("Cannot Start Workout", message);
    } finally {
      setIsStarting(false);
    }
  }, [startWorkout, template._id, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Template",
      `Delete template "${template.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteTemplateMutation({ templateId: template._id }).catch(
              (err: unknown) =>
                console.error("[TemplateCard] deleteTemplate failed:", err),
            );
          },
        },
      ],
    );
  }, [deleteTemplateMutation, template._id, template.name]);

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        {/* Header: name + delete */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.date}>{formatDate(template._creationTime)}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            accessibilityLabel={`Delete ${template.name}`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Exercise list */}
        <View style={styles.exerciseSection}>
          {isLoadingExercises ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <View style={styles.countBadge}>
                <Ionicons name="barbell-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.countText}>
                  {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                </Text>
              </View>
              {displayNames.map((name: string, i: number) => (
                <Text key={i} style={styles.exerciseName} numberOfLines={1}>
                  {name}
                </Text>
              ))}
              {remainingCount > 0 && (
                <Text style={styles.moreText}>+{remainingCount} more</Text>
              )}
            </>
          )}
        </View>

        {/* Start Workout button */}
        <TouchableOpacity
          onPress={handleStart}
          disabled={isStarting}
          style={[styles.startButton, isStarting && styles.startButtonDisabled]}
          accessibilityLabel={`Start workout from ${template.name}`}
          accessibilityRole="button"
        >
          {isStarting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.startText}>Start Workout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TemplateCard = memo(TemplateCardInner);
TemplateCard.displayName = "TemplateCard";
export default TemplateCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  date: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  exerciseSection: {
    marginTop: spacing.sm,
    gap: 2,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  countText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  exerciseName: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    marginTop: 2,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: spacing.md,
    minHeight: 44,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startText: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
});
