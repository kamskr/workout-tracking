"use client";

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
} from "@/lib/colors";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MuscleHeatmapData {
  muscleGroup: string;
  percentage: number;
}

interface MuscleHeatmapProps {
  data: MuscleHeatmapData[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPercentage(
  data: MuscleHeatmapData[],
  muscleGroup: string,
): number {
  const entry = data.find((d) => d.muscleGroup === muscleGroup);
  return entry?.percentage ?? 0;
}

const NO_FILL = "#f3f4f6"; // gray-100 — same as 0% interpolation
const OUTLINE_STROKE = "#d1d5db"; // gray-300
const OUTLINE_FILL = "#f9fafb"; // gray-50

// ── Sub-components ───────────────────────────────────────────────────────────

function BodyOutline({ paths }: { paths: string[] }) {
  return (
    <>
      {paths.map((d, i) => (
        <path
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
        <path
          key={`${region.id}-${region.view}-${i}`}
          d={d}
          fill={fill}
          stroke={fill === NO_FILL ? OUTLINE_STROKE : fill}
          strokeWidth={0.5}
          strokeLinejoin="round"
          data-muscle-group={region.id}
          opacity={percentage > 0 ? 0.85 : 0.4}
        >
          <title>
            {region.label}: {Math.round(percentage)}%
          </title>
        </path>
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
  data: MuscleHeatmapData[];
}) {
  const outlinePaths =
    view === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK;
  const regions = MUSCLE_REGIONS.filter((r) => r.view === view);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-[160px] h-auto"
        role="img"
        aria-label={`${label} body view — muscle heatmap`}
      >
        <BodyOutline paths={outlinePaths} />
        {regions.map((region) => (
          <MuscleRegionPaths
            key={`${region.id}-${region.view}`}
            region={region}
            percentage={getPercentage(data, region.id)}
          />
        ))}
      </svg>
    </div>
  );
}

function ColorLegend() {
  const gradientId = "heatmap-gradient";
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-400">Low</span>
      <svg width="120" height="12" className="flex-shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {HEATMAP_GRADIENT_STOPS.map(([pct, [r, g, b]]) => (
              <stop
                key={pct}
                offset={`${pct}%`}
                stopColor={`rgb(${r},${g},${b})`}
              />
            ))}
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="120"
          height="12"
          rx="4"
          fill={`url(#${gradientId})`}
        />
      </svg>
      <span className="text-xs text-gray-400">High</span>
    </div>
  );
}

function IndicatorBadge({
  label,
  percentage,
}: {
  label: string;
  percentage: number;
}) {
  const color =
    percentage > 0 ? interpolateHeatmapColor(percentage) : NO_FILL;
  const textColor = percentage > 50 ? "white" : "#374151";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: color, color: textColor }}
      data-muscle-group={label.toLowerCase().replace(/\s+/g, "")}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{
          backgroundColor: percentage > 0 ? "currentColor" : OUTLINE_STROKE,
        }}
      />
      {label} {percentage > 0 ? `${Math.round(percentage)}%` : "—"}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function MuscleHeatmap({ data }: MuscleHeatmapProps) {
  const fullBodyPct = getPercentage(data, "fullBody");
  const cardioPct = getPercentage(data, "cardio");

  return (
    <div data-analytics-heatmap className="flex flex-col items-center gap-3">
      {/* Body views side by side */}
      <div className="flex items-start justify-center gap-6 w-full">
        <BodyView view="front" label="Front" data={data} />
        <BodyView view="back" label="Back" data={data} />
      </div>

      {/* Color legend */}
      <ColorLegend />

      {/* fullBody and cardio indicators */}
      <div className="flex items-center gap-2 mt-1">
        <IndicatorBadge label="Full Body" percentage={fullBodyPct} />
        <IndicatorBadge label="Cardio" percentage={cardioPct} />
      </div>
    </div>
  );
}
