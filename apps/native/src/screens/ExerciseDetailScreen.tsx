import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import ExerciseProgressChartNative from "../components/analytics/ExerciseProgressChartNative";
import PeriodSelector, {
  type PeriodOption,
} from "../components/analytics/PeriodSelector";
import { colors, fontFamily, spacing } from "../lib/theme";
import { formatWeight, type WeightUnit } from "../lib/units";

// ── Route Params ─────────────────────────────────────────────────────────────

type ExerciseDetailParams = {
  ExerciseDetail: { exerciseId: string };
};

// ── Period options matching web D048 ─────────────────────────────────────────

const PERIODS: PeriodOption[] = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "6mo", value: 180 },
  { label: "1yr", value: 365 },
  { label: "All Time", value: undefined },
];

// ── Badge colors (same as ExerciseCard) ──────────────────────────────────────

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
  barbell: { bg: "#F1F5F9", text: "#334155" },
  dumbbell: { bg: "#F3F4F6", text: "#374151" },
  cable: { bg: "#F4F4F5", text: "#3F3F46" },
  machine: { bg: "#F5F5F4", text: "#44403C" },
  bodyweight: { bg: "#D1FAE5", text: "#065F46" },
  kettlebell: { bg: "#FEF3C7", text: "#92400E" },
  bands: { bg: "#ECFCCB", text: "#3F6212" },
  other: { bg: "#F5F5F5", text: "#525252" },
  strength: { bg: "#E0F2FE", text: "#0369A1" },
  stretch: { bg: "#EDE9FE", text: "#6D28D9" },
  plyometric: { bg: "#FAE8FF", text: "#A21CAF" },
};

const DEFAULT_BADGE = { bg: "#F3F4F6", text: "#6B7280" };

function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

// ── PR type labels (matching web) ────────────────────────────────────────────

const PR_LABELS: Record<string, string> = {
  weight: "Best Estimated 1RM",
  volume: "Best Session Volume",
  reps: "Best Single Set Reps",
};

// ── Badge Component ──────────────────────────────────────────────────────────

function Badge({ label }: { label: string }) {
  const badgeColor = BADGE_COLORS[label] ?? DEFAULT_BADGE;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: badgeColor.bg }]}>
      <Text style={[badgeStyles.text, { color: badgeColor.text }]}>
        {formatLabel(label)}
      </Text>
    </View>
  );
}

// ── PR Summary Card ──────────────────────────────────────────────────────────

function PRSummaryCard({
  label,
  value,
  date,
}: {
  label: string;
  value: string;
  date: string;
}) {
  return (
    <View style={prStyles.card}>
      <Text style={prStyles.label}>{label}</Text>
      <Text style={prStyles.value}>{value}</Text>
      <Text style={prStyles.date}>{date}</Text>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const route =
    useRoute<RouteProp<ExerciseDetailParams, "ExerciseDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const exerciseId = route.params.exerciseId as Id<"exercises">;

  const [periodDays, setPeriodDays] = useState<number | undefined>(undefined);

  const exercise = useQuery(api.exercises.getExercise, { id: exerciseId });
  const personalRecords = useQuery(api.personalRecords.getPersonalRecords, {
    exerciseId,
  });
  const preferences = useQuery(api.userPreferences.getPreferences);

  const weightUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  const isLoading =
    exercise === undefined ||
    personalRecords === undefined ||
    preferences === undefined;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading exercise…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not found
  if (exercise === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Exercise not found</Text>
          <Text style={styles.emptySubtitle}>
            This exercise may have been removed or the link is invalid.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Info Header */}
        <View style={styles.section}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.badgeRow}>
            <Badge label={exercise.primaryMuscleGroup} />
            <Badge label={exercise.equipment} />
            <Badge label={exercise.exerciseType} />
          </View>
        </View>

        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          {personalRecords.length === 0 ? (
            <Text style={styles.emptySubtitle}>
              No personal records yet — keep training!
            </Text>
          ) : (
            <View style={styles.prRow}>
              {personalRecords.map((pr) => {
                let formattedValue: string;
                if (pr.type === "reps") {
                  formattedValue = `${pr.value} reps`;
                } else {
                  formattedValue = formatWeight(pr.value, weightUnit);
                }

                const dateStr = new Date(pr.achievedAt).toLocaleDateString(
                  undefined,
                  { year: "numeric", month: "short", day: "numeric" },
                );

                return (
                  <PRSummaryCard
                    key={pr.type}
                    label={PR_LABELS[pr.type] ?? pr.type}
                    value={formattedValue}
                    date={dateStr}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Progress Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Progress Over Time</Text>
          </View>
          <PeriodSelector
            periods={PERIODS}
            selected={periodDays}
            onSelect={setPeriodDays}
          />
          <View style={styles.chartCard}>
            <ExerciseProgressChartNative
              exerciseId={exerciseId}
              periodDays={periodDays}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  exerciseName: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  prRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    textTransform: "capitalize",
  },
});

const prStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  date: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
