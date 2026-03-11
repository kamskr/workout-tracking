import React, { useState } from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import PeriodSelector, {
  type PeriodOption,
} from "../components/analytics/PeriodSelector";
import MuscleHeatmapNative from "../components/analytics/MuscleHeatmapNative";
import VolumeBarChartNative from "../components/analytics/VolumeBarChartNative";
import WeeklySummaryCardNative from "../components/analytics/WeeklySummaryCardNative";
import MonthlySummaryCardNative from "../components/analytics/MonthlySummaryCardNative";
import { colors, fontFamily, spacing } from "../lib/theme";
import type { WeightUnit } from "../lib/units";

// ── Period options (D066) ────────────────────────────────────────────────────

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "All Time", value: undefined },
];

const DEFAULT_PERIOD = 30;

// ── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const [periodDays, setPeriodDays] = useState<number | undefined>(DEFAULT_PERIOD);

  // Fetch user weight unit preference
  const prefs = useQuery(api.userPreferences.getPreferences);
  const weightUnit: WeightUnit = (prefs?.weightUnit as WeightUnit) ?? "kg";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analytics</Text>

        {/* Period selector */}
        <PeriodSelector
          periods={PERIOD_OPTIONS}
          selected={periodDays}
          onSelect={setPeriodDays}
        />

        {/* Muscle heatmap — uses periodDays */}
        <MuscleHeatmapNative periodDays={periodDays} />

        {/* Volume bar chart — uses periodDays */}
        <VolumeBarChartNative periodDays={periodDays} />

        {/* Weekly summary — fixed 7-day window */}
        <WeeklySummaryCardNative weightUnit={weightUnit} />

        {/* Monthly summary — fixed 30-day window */}
        <MonthlySummaryCardNative weightUnit={weightUnit} />
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
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
