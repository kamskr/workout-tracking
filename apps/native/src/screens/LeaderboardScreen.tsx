import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import PillSelectorNative from "../components/competitive/PillSelectorNative";
import LeaderboardTableNative from "../components/competitive/LeaderboardTableNative";
import { colors, fontFamily, spacing } from "../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

type Metric = "e1rm" | "volume" | "reps";
type Period = "7d" | "30d" | "allTime";

const METRIC_OPTIONS = [
  { label: "Est. 1RM", value: "e1rm" as Metric },
  { label: "Total Volume", value: "volume" as Metric },
  { label: "Max Reps", value: "reps" as Metric },
];

const PERIOD_OPTIONS = [
  { label: "7 Days", value: "7d" as Period },
  { label: "30 Days", value: "30d" as Period },
  { label: "All Time", value: "allTime" as Period },
];

// ── Value Formatter ──────────────────────────────────────────────────────────

function formatValue(value: number, metric: Metric): string {
  if (metric === "reps") return `${value} reps`;
  return `${Math.round(value * 10) / 10} kg`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { user } = useUser();
  const currentUserId = user?.id;

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedExerciseId, setSelectedExerciseId] = useState<
    Id<"exercises"> | null
  >(null);
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [period, setPeriod] = useState<Period>("allTime");

  // ── Exercise list ────────────────────────────────────────────────────────
  const exercises = useQuery(api.leaderboards.getLeaderboardExercises);

  // Auto-select first exercise when list loads
  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedExerciseId === null) {
      setSelectedExerciseId(exercises[0]._id as Id<"exercises">);
    }
  }, [exercises, selectedExerciseId]);

  // ── Leaderboard data ────────────────────────────────────────────────────
  // Period picker is UI-only — always passes "allTime" to backend (matches web)
  const leaderboardData = useQuery(
    api.leaderboards.getLeaderboard,
    selectedExerciseId
      ? { exerciseId: selectedExerciseId, metric, period: "allTime" }
      : "skip",
  );

  // ── My rank ──────────────────────────────────────────────────────────────
  const myRank = useQuery(
    api.leaderboards.getMyRank,
    selectedExerciseId
      ? { exerciseId: selectedExerciseId, metric, period: "allTime" }
      : "skip",
  );

  // ── Format helper bound to current metric ────────────────────────────────
  const formatValueForMetric = useCallback(
    (value: number) => formatValue(value, metric),
    [metric],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Leaderboard</Text>

        {/* Exercise Selector */}
        <Text style={styles.sectionLabel}>Exercise</Text>
        {exercises === undefined ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No exercises with leaderboard data yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exerciseChipsContainer}
          >
            {exercises.map((exercise) => {
              const isSelected =
                selectedExerciseId === (exercise._id as Id<"exercises">);
              return (
                <TouchableOpacity
                  key={exercise._id}
                  style={[
                    styles.exerciseChip,
                    isSelected && styles.exerciseChipSelected,
                  ]}
                  onPress={() =>
                    setSelectedExerciseId(exercise._id as Id<"exercises">)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.exerciseChipText,
                      isSelected && styles.exerciseChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Metric Picker */}
        <Text style={styles.sectionLabel}>Metric</Text>
        <PillSelectorNative<Metric>
          options={METRIC_OPTIONS}
          selected={metric}
          onSelect={setMetric}
        />

        {/* Period Picker (UI-only — always sends "allTime" to backend) */}
        <Text style={styles.sectionLabel}>Period</Text>
        <PillSelectorNative<Period>
          options={PERIOD_OPTIONS}
          selected={period}
          onSelect={setPeriod}
        />

        {/* My Rank Card */}
        <View style={styles.myRankCard}>
          <Text style={styles.myRankTitle}>My Rank</Text>
          {!selectedExerciseId ? (
            <Text style={styles.myRankValue}>Select an exercise</Text>
          ) : myRank === undefined ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : myRank.rank === null ? (
            <Text style={styles.myRankValue}>
              {myRank.totalScanned === 0
                ? "Opt in on your profile"
                : "Not ranked"}
            </Text>
          ) : (
            <View style={styles.myRankRow}>
              <Ionicons name="trophy" size={20} color={colors.accent} />
              <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
              <Text style={styles.myRankScore}>
                {formatValue(myRank.value!, metric)}
              </Text>
            </View>
          )}
        </View>

        {/* Leaderboard Table */}
        <Text style={styles.sectionLabel}>Rankings</Text>
        <LeaderboardTableNative
          entries={leaderboardData?.entries}
          currentUserId={currentUserId}
          formatValue={formatValueForMetric}
        />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyBox: {
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  exerciseChipsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  exerciseChipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  exerciseChipTextSelected: {
    color: "#FFFFFF",
  },

  // My Rank Card
  myRankCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  myRankTitle: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  myRankValue: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  myRankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  myRankNumber: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.accent,
  },
  myRankScore: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
