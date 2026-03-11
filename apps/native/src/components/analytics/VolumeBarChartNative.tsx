import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Bar colors per muscle group (same as web) ───────────────────────────────

const BAR_COLORS: Record<string, string> = {
  chest: "#3b82f6",
  back: "#6366f1",
  shoulders: "#8b5cf6",
  biceps: "#ec4899",
  triceps: "#f43f5e",
  legs: "#22c55e",
  core: "#eab308",
  fullBody: "#14b8a6",
  cardio: "#f97316",
};

const DEFAULT_BAR_COLOR = "#6b7280";

// ── Types ────────────────────────────────────────────────────────────────────

type ChartDataPoint = Record<string, unknown> & {
  x: number;
  volume: number;
  label: string;
  muscleGroup: string;
};

// ── Props ────────────────────────────────────────────────────────────────────

interface VolumeBarChartNativeProps {
  periodDays: number | undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMuscleGroupName(key: string): string {
  if (key === "fullBody") return "Full Body";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatCompactNumber(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000)
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VolumeBarChartNative({
  periodDays,
}: VolumeBarChartNativeProps) {
  const rawData = useQuery(api.analytics.getVolumeByMuscleGroup, {
    periodDays,
  });

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!rawData) return [];
    return rawData.map((item, index) => ({
      x: index,
      volume: Math.round(item.totalVolume),
      label: formatMuscleGroupName(item.muscleGroup),
      muscleGroup: item.muscleGroup,
    }));
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

  // Empty state
  if (rawData.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyTitle}>No volume data yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete workouts to see your volume breakdown by muscle group
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Volume by Muscle Group</Text>
      <View style={styles.chartContainer}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={["volume"] as const}
          domainPadding={{ left: 30, right: 30, top: 20 }}
          xAxis={{
            tickCount: chartData.length,
            labelColor: colors.textSecondary,
            formatXLabel: (value: number) => {
              const item = chartData[Math.round(value)];
              return item?.label ?? "";
            },
          }}
          yAxis={[
            {
              yKeys: ["volume"] as const,
              labelColor: colors.textSecondary,
              formatYLabel: (value: number) => formatCompactNumber(value),
            },
          ]}
        >
          {({ points, chartBounds }) =>
            points.volume.map((point, index) => {
              const muscleGroup = chartData[index]?.muscleGroup ?? "";
              const barColor = BAR_COLORS[muscleGroup] ?? DEFAULT_BAR_COLOR;
              return (
                <Bar
                  key={index}
                  barCount={points.volume.length}
                  points={[point]}
                  chartBounds={chartBounds}
                  color={barColor}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                  animate={{ type: "spring" }}
                />
              );
            })
          }
        </CartesianChart>
      </View>
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
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    height: 250,
  },
  centeredContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.md,
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
