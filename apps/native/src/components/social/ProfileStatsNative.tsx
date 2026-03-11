import React, { memo } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { WeightUnit } from "../../lib/units";
import { formatWeight } from "../../lib/units";
import { colors, fontFamily, spacing } from "../../lib/theme";

interface ProfileStatsNativeProps {
  userId: string;
  weightUnit?: WeightUnit;
}

/**
 * Profile stats: 4 stat cards in flex row + top exercises list.
 * Mirrors web ProfileStats.tsx with RN primitives.
 */
function ProfileStatsNativeInner({
  userId,
  weightUnit = "kg",
}: ProfileStatsNativeProps) {
  const stats = useQuery(api.profiles.getProfileStats, { userId });

  // Loading skeleton
  if (stats === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  const hasWorkouts = stats.totalWorkouts > 0;

  return (
    <View>
      {/* Summary stat cards */}
      <View style={styles.statsGrid}>
        <StatCard label="Workouts" value={stats.totalWorkouts.toString()} />
        <StatCard
          label="Current Streak"
          value={
            stats.currentStreak > 0
              ? `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`
              : "—"
          }
        />
        <StatCard
          label="Total Volume"
          value={
            stats.totalVolume > 0
              ? formatWeight(stats.totalVolume, weightUnit)
              : "—"
          }
        />
        <StatCard
          label="Exercises"
          value={
            stats.topExercises.length > 0
              ? stats.topExercises.length.toString()
              : "—"
          }
        />
      </View>

      {/* Top exercises */}
      {hasWorkouts && stats.topExercises.length > 0 && (
        <View style={styles.topExercisesSection}>
          <Text style={styles.sectionTitle}>Top Exercises</Text>
          {stats.topExercises
            .slice(0, 5)
            .map(
              (exercise: { exerciseName: string; totalVolume: number }) => (
                <View key={exercise.exerciseName} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {exercise.exerciseName}
                  </Text>
                  <Text style={styles.exerciseVolume}>
                    {formatWeight(exercise.totalVolume, weightUnit)}
                  </Text>
                </View>
              ),
            )}
        </View>
      )}

      {/* Empty state */}
      {!hasWorkouts && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No workout data yet. Complete a workout to see your stats!
          </Text>
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const ProfileStatsNative = memo(ProfileStatsNativeInner);
ProfileStatsNative.displayName = "ProfileStatsNative";
export default ProfileStatsNative;

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  topExercisesSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
    marginRight: spacing.sm,
  },
  exerciseVolume: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  emptyContainer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
