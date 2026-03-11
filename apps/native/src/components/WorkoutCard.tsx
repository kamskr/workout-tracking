import React, { memo, useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { formatDuration } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";
import TextInputModal from "./TextInputModal";

interface WorkoutCardProps {
  workout: {
    _id: Id<"workouts">;
    name?: string;
    status: string;
    startedAt?: number;
    completedAt?: number;
    durationSeconds?: number;
  };
}

function WorkoutCardInner({ workout }: WorkoutCardProps) {
  const deleteWorkout = useMutation(api.workouts.deleteWorkout);
  const saveAsTemplate = useMutation(api.templates.saveAsTemplate);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Self-fetch exercise count
  const exerciseList = useQuery(api.workoutExercises.listExercisesForWorkout, {
    workoutId: workout._id,
  });
  const exerciseCount = exerciseList?.length ?? 0;

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteWorkout({ id: workout._id }).catch((err: unknown) =>
              console.error("[WorkoutCard] deleteWorkout failed:", err),
            );
          },
        },
      ],
    );
  }, [deleteWorkout, workout._id]);

  const handleSaveAsTemplate = useCallback(
    async (name: string) => {
      setIsSavingTemplate(true);
      setTemplateModalVisible(false);
      try {
        await saveAsTemplate({ workoutId: workout._id, name });
        Alert.alert("Template Saved", `"${name}" has been saved as a template.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save template";
        Alert.alert("Error", message);
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [saveAsTemplate, workout._id],
  );

  const displayDate = workout.completedAt
    ? new Date(workout.completedAt).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : workout.startedAt
      ? new Date(workout.startedAt).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "Unknown date";

  const displayName = workout.name || "Workout";
  const isInProgress = workout.status === "inProgress";
  const isCompleted = workout.status === "completed";

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            accessibilityLabel={`Delete ${displayName}`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>{displayDate}</Text>

        <View style={styles.footer}>
          {/* Duration badge */}
          {workout.durationSeconds != null && (
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.badgeText}>
                {formatDuration(workout.durationSeconds)}
              </Text>
            </View>
          )}

          {/* In-progress badge */}
          {isInProgress && (
            <View style={[styles.badge, styles.inProgressBadge]}>
              <Text style={styles.inProgressText}>In Progress</Text>
            </View>
          )}

          {/* Exercise count */}
          <View style={styles.badge}>
            <Ionicons name="barbell-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.badgeText}>
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Save as Template button — only on completed workouts */}
        {isCompleted && (
          <TouchableOpacity
            onPress={() => setTemplateModalVisible(true)}
            disabled={isSavingTemplate}
            style={[
              styles.templateButton,
              isSavingTemplate && styles.templateButtonDisabled,
            ]}
            accessibilityLabel={`Save ${displayName} as template`}
            accessibilityRole="button"
          >
            <Ionicons
              name="bookmark-outline"
              size={14}
              color={colors.accent}
            />
            <Text style={styles.templateButtonText}>
              {isSavingTemplate ? "Saving…" : "Save as Template"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TextInputModal for template name */}
      <TextInputModal
        visible={templateModalVisible}
        title="Save as Template"
        placeholder="Template name"
        defaultValue={displayName}
        onConfirm={handleSaveAsTemplate}
        onCancel={() => setTemplateModalVisible(false)}
      />
    </View>
  );
}

const WorkoutCard = memo(WorkoutCardInner);
WorkoutCard.displayName = "WorkoutCard";
export default WorkoutCard;

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
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  date: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  inProgressBadge: {
    backgroundColor: "#DCFCE7",
  },
  inProgressText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: "#15803D",
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    minHeight: 44,
  },
  templateButtonDisabled: {
    opacity: 0.5,
  },
  templateButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
});
