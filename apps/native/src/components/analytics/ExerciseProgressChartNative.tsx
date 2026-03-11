import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExerciseProgressChartNativeProps {
  exerciseId: Id<"exercises">;
  periodDays?: number;
}

type ChartDataPoint = Record<string, unknown> & {
  date: number;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
};

// ── Colors (same as web ExerciseProgressChart) ───────────────────────────────

const COLOR_MAX_WEIGHT = "#0d87e1"; // blue
const COLOR_ESTIMATED_1RM = "#14b8a6"; // teal
const COLOR_TOTAL_VOLUME = "#f59e0b"; // amber

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTick(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCompactNumber(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000)
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ExerciseProgressChartNative({
  exerciseId,
  periodDays,
}: ExerciseProgressChartNativeProps) {
  const rawData = useQuery(api.analytics.getExerciseProgress, {
    exerciseId,
    periodDays,
  });

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!rawData) return [];
    return rawData.map((point, index) => ({
      date: index, // use index for even spacing on x-axis
      maxWeight: point.maxWeight,
      totalVolume: point.totalVolume,
      estimated1RM: point.estimated1RM ?? 0,
      // Keep original date for label formatting
      _dateEpoch: point.date,
    }));
  }, [rawData]);

  // Memoize date labels for x-axis formatting
  const dateLabels = useMemo(() => {
    if (!rawData) return [];
    return rawData.map((point) => formatDateTick(point.date));
  }, [rawData]);

  // Loading state
  if (rawData === undefined) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading chart…</Text>
      </View>
    );
  }

  // Empty state: fewer than 2 data points
  if (rawData.length < 2) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyTitle}>Not enough data yet</Text>
        <Text style={styles.emptySubtitle}>
          Log more workouts with this exercise to see progress charts
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrapper}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLOR_MAX_WEIGHT }]}
          />
          <Text style={styles.legendLabel}>Max Weight</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLOR_ESTIMATED_1RM }]}
          />
          <Text style={styles.legendLabel}>Est. 1RM</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLOR_TOTAL_VOLUME }]}
          />
          <Text style={styles.legendLabel}>Volume</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <CartesianChart
          data={chartData}
          xKey="date"
          yKeys={["maxWeight", "estimated1RM", "totalVolume"] as const}
          domainPadding={{ left: 10, right: 10, top: 20 }}
          xAxis={{
            tickCount: Math.min(chartData.length, 6),
            labelColor: colors.textSecondary,
            formatXLabel: (value: number) => {
              const idx = Math.round(value);
              return dateLabels[idx] ?? "";
            },
          }}
          yAxis={[
            {
              yKeys: ["maxWeight", "estimated1RM"] as const,
              labelColor: colors.textSecondary,
              formatYLabel: (value: number) => `${Math.round(value)}`,
            },
            {
              yKeys: ["totalVolume"] as const,
              axisSide: "right" as const,
              labelColor: colors.textSecondary,
              formatYLabel: (value: number) => formatCompactNumber(value),
            },
          ]}
        >
          {({ points }) => (
            <>
              <Line
                points={points.maxWeight}
                color={COLOR_MAX_WEIGHT}
                strokeWidth={2.5}
                animate={{ type: "spring" }}
                curveType="natural"
              />
              <Line
                points={points.estimated1RM}
                color={COLOR_ESTIMATED_1RM}
                strokeWidth={2.5}
                animate={{ type: "spring" }}
                curveType="natural"
                connectMissingData
              />
              <Line
                points={points.totalVolume}
                color={COLOR_TOTAL_VOLUME}
                strokeWidth={2.5}
                animate={{ type: "spring" }}
                curveType="natural"
              />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartWrapper: {
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  chartContainer: {
    height: 280,
  },
  centeredContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
