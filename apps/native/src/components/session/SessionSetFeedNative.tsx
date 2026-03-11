import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";
import { formatWeight } from "../../lib/units";
import type { WeightUnit } from "../../lib/units";

// ---------------------------------------------------------------------------
// Deterministic badge colors (8 RN-compatible color pairs)
// ---------------------------------------------------------------------------

const BADGE_COLORS: { bg: string; text: string }[] = [
  { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
  { bg: "#D1FAE5", text: "#047857" }, // green
  { bg: "#EDE9FE", text: "#6D28D9" }, // purple
  { bg: "#FEF3C7", text: "#B45309" }, // amber
  { bg: "#FCE7F3", text: "#BE185D" }, // pink
  { bg: "#CCFBF1", text: "#0F766E" }, // teal
  { bg: "#FEE2E2", text: "#B91C1C" }, // red
  { bg: "#E0E7FF", text: "#4338CA" }, // indigo
];

function badgeColor(userId: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionSetFeedNativeProps {
  sessionId: Id<"groupSessions">;
}

type FeedEntry = {
  exerciseId: string;
  exerciseName: string;
  entries: {
    participantName: string;
    participantUserId: string;
    weight: number | undefined;
    reps: number | undefined;
    rpe: number | undefined;
    setNumber: number;
    completedAt: number | undefined;
  }[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionSetFeedNative({
  sessionId,
}: SessionSetFeedNativeProps) {
  const sessionSets = useQuery(api.sessions.getSessionSets, { sessionId });
  const preferences = useQuery(api.userPreferences.getPreferences);
  const unit: WeightUnit = preferences?.weightUnit ?? "kg";

  // Loading state
  if (sessionSets === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading sets…</Text>
      </View>
    );
  }

  // Build exercise-grouped feed
  const exerciseMap = new Map<string, FeedEntry>();

  for (const participant of sessionSets) {
    for (const exercise of participant.exercises) {
      if (exercise.sets.length === 0) continue;

      let entry = exerciseMap.get(exercise.exerciseId);
      if (!entry) {
        entry = {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          entries: [],
        };
        exerciseMap.set(exercise.exerciseId, entry);
      }

      for (let i = 0; i < exercise.sets.length; i++) {
        const s = exercise.sets[i];
        entry.entries.push({
          participantName: participant.participantName,
          participantUserId: participant.participantUserId,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          setNumber: i + 1,
          completedAt: s.completedAt,
        });
      }
    }
  }

  // Sort entries within each exercise by completedAt descending
  exerciseMap.forEach((entry) => {
    entry.entries.sort(
      (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0),
    );
  });

  const feedGroups = Array.from(exerciseMap.values());

  // Empty state
  if (feedGroups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="list-outline" size={32} color={colors.textPlaceholder} />
        </View>
        <Text style={styles.emptyTitle}>No sets logged yet</Text>
        <Text style={styles.emptySubtitle}>
          Start your workout! Sets from all participants will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {feedGroups.map((group) => (
        <View key={group.exerciseId} style={styles.exerciseCard}>
          {/* Exercise header */}
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseHeaderText}>
              {group.exerciseName}
            </Text>
          </View>

          {/* Set entries */}
          {group.entries.map((entry, idx) => {
            const badge = badgeColor(entry.participantUserId);
            return (
              <View
                key={`${entry.participantUserId}-${entry.setNumber}-${idx}`}
                style={[
                  styles.setRow,
                  idx < group.entries.length - 1 && styles.setRowBorder,
                ]}
              >
                {/* Participant badge */}
                <View
                  style={[styles.badge, { backgroundColor: badge.bg }]}
                >
                  <Text
                    style={[styles.badgeText, { color: badge.text }]}
                    numberOfLines={1}
                  >
                    {entry.participantName}
                  </Text>
                </View>

                {/* Set details */}
                <Text style={styles.setDetails}>
                  {entry.weight != null
                    ? formatWeight(entry.weight, unit)
                    : "—"}
                  {" × "}
                  {entry.reps ?? "—"}
                  {entry.rpe != null && (
                    <Text style={styles.rpeText}> RPE {entry.rpe}</Text>
                  )}
                </Text>

                {/* Set number */}
                <Text style={styles.setNumber}>Set {entry.setNumber}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  exerciseCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseHeader: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exerciseHeaderText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  setRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.backgroundSecondary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
  setDetails: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  rpeText: {
    fontSize: 11,
    color: colors.textPlaceholder,
  },
  setNumber: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
  },
});
