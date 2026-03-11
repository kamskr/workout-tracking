import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Svg, {
  Path,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  MUSCLE_REGIONS,
  BODY_OUTLINE_FRONT,
  BODY_OUTLINE_BACK,
  VIEWBOX,
  type MuscleRegion,
} from "@packages/backend/data/muscle-heatmap-paths";
import {
  interpolateHeatmapColor,
  HEATMAP_GRADIENT_STOPS,
} from "../../lib/colors";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Constants ────────────────────────────────────────────────────────────────

const NO_FILL = "#f3f4f6";
const OUTLINE_STROKE = "#d1d5db";
const OUTLINE_FILL = "#f9fafb";

// ── Props ────────────────────────────────────────────────────────────────────

interface MuscleHeatmapNativeProps {
  periodDays: number | undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface VolumeEntry {
  muscleGroup: string;
  percentage: number;
}

function getPercentage(data: VolumeEntry[], muscleGroup: string): number {
  const entry = data.find((d) => d.muscleGroup === muscleGroup);
  return entry?.percentage ?? 0;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BodyOutline({ paths }: { paths: string[] }) {
  return (
    <>
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill={OUTLINE_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

function MuscleRegionPaths({
  region,
  percentage,
}: {
  region: MuscleRegion;
  percentage: number;
}) {
  const fill = percentage > 0 ? interpolateHeatmapColor(percentage) : NO_FILL;

  return (
    <>
      {region.paths.map((d, i) => (
        <Path
          key={`${region.id}-${region.view}-${i}`}
          d={d}
          fill={fill}
          stroke={fill === NO_FILL ? OUTLINE_STROKE : fill}
          strokeWidth={0.5}
          strokeLinejoin="round"
          opacity={percentage > 0 ? 0.85 : 0.4}
        />
      ))}
    </>
  );
}

function BodyView({
  view,
  label,
  data,
}: {
  view: "front" | "back";
  label: string;
  data: VolumeEntry[];
}) {
  const outlinePaths =
    view === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK;
  const regions = MUSCLE_REGIONS.filter((r) => r.view === view);

  return (
    <View style={styles.bodyViewContainer}>
      <Text style={styles.viewLabel}>{label}</Text>
      <Svg viewBox={VIEWBOX} style={styles.bodySvg}>
        <BodyOutline paths={outlinePaths} />
        {regions.map((region) => (
          <MuscleRegionPaths
            key={`${region.id}-${region.view}`}
            region={region}
            percentage={getPercentage(data, region.id)}
          />
        ))}
      </Svg>
    </View>
  );
}

function ColorLegend() {
  const gradientId = "heatmap-gradient-native";
  return (
    <View style={styles.legendContainer}>
      <Text style={styles.legendLabel}>Low</Text>
      <Svg width={120} height={12}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {HEATMAP_GRADIENT_STOPS.map(([pct, [r, g, b]]) => (
              <Stop
                key={pct}
                offset={`${pct}%`}
                stopColor={`rgb(${r},${g},${b})`}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={120} height={12} rx={4} fill={`url(#${gradientId})`} />
      </Svg>
      <Text style={styles.legendLabel}>High</Text>
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MuscleHeatmapNative({ periodDays }: MuscleHeatmapNativeProps) {
  const rawData = useQuery(api.analytics.getVolumeByMuscleGroup, { periodDays });

  // Loading state
  if (rawData === undefined) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading heatmap…</Text>
      </View>
    );
  }

  // Empty state
  if (rawData.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyTitle}>No volume data yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete workouts to see your muscle heatmap
        </Text>
      </View>
    );
  }

  const data: VolumeEntry[] = rawData.map((item) => ({
    muscleGroup: item.muscleGroup,
    percentage: item.percentage,
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Muscle Heatmap</Text>
      {/* Body views side by side */}
      <View style={styles.bodyViewsRow}>
        <BodyView view="front" label="Front" data={data} />
        <BodyView view="back" label="Back" data={data} />
      </View>
      <ColorLegend />
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
  bodyViewsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  bodyViewContainer: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  viewLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bodySvg: {
    width: "100%",
    maxWidth: 140,
    aspectRatio: 0.5, // 200/400 viewbox ratio
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
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
