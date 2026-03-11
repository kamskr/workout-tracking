import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { formatWeight, type WeightUnit } from "../../lib/units";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Props ────────────────────────────────────────────────────────────────────

interface WeeklySummaryCardNativeProps {
  weightUnit: WeightUnit;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WeeklySummaryCardNative({
  weightUnit,
}: WeeklySummaryCardNativeProps) {
  const summary = useQuery(api.analytics.getWeeklySummary);

  // Loading state
  if (summary === undefined) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  const isEmpty = summary.workoutCount === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>This Week</Text>

      {isEmpty ? (
        <Text style={styles.emptyText}>No workouts this week</Text>
      ) : (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Workouts</Text>
              <Text style={styles.statValue}>{summary.workoutCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>
                {formatWeight(summary.totalVolume, weightUnit)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sets</Text>
              <Text style={styles.statValue}>{summary.totalSets}</Text>
            </View>
          </View>

          {/* Top exercises */}
          {summary.topExercises.length > 0 && (
            <View style={styles.topExercisesSection}>
              <Text style={styles.topExercisesHeading}>Top Exercises</Text>
              {summary.topExercises.map((ex, i) => (
                <View key={ex.exerciseName} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>
                    <Text style={styles.exerciseIndex}>{i + 1}. </Text>
                    {ex.exerciseName}
                  </Text>
                  <Text style={styles.exerciseVolume}>
                    {formatWeight(ex.totalVolume, weightUnit)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
  },
  heading: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  topExercisesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  topExercisesHeading: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  exerciseName: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.text,
    flex: 1,
  },
  exerciseIndex: {
    color: colors.textSecondary,
  },
  exerciseVolume: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
