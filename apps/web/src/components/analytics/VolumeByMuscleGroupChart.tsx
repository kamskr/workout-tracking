"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface VolumeByMuscleGroupChartProps {
  periodDays?: number;
}

interface ChartDataPoint {
  name: string;
  volume: number;
  setCount: number;
  muscleGroup: string;
}

// ── Bar colors per muscle group ──────────────────────────────────────────────

const BAR_COLORS: Record<string, string> = {
  chest: "#3b82f6",       // blue-500
  back: "#6366f1",        // indigo-500
  shoulders: "#8b5cf6",   // violet-500
  biceps: "#ec4899",      // pink-500
  triceps: "#f43f5e",     // rose-500
  legs: "#22c55e",        // green-500
  core: "#eab308",        // yellow-500
  fullBody: "#14b8a6",    // teal-500
  cardio: "#f97316",      // orange-500
};

const DEFAULT_BAR_COLOR = "#6b7280"; // gray-500

// ── Formatters ───────────────────────────────────────────────────────────────

function formatMuscleGroupName(key: string): string {
  if (key === "fullBody") return "Full Body";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatCompactNumber(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  payload: ChartDataPoint;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]!.payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-gray-900">{data.name}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Volume:</span>
        <span className="font-medium text-gray-900">
          {formatCompactNumber(data.volume)} kg
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Sets:</span>
        <span className="font-medium text-gray-900">{data.setCount}</span>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VolumeByMuscleGroupChart({
  periodDays,
}: VolumeByMuscleGroupChartProps) {
  const rawData = useQuery(api.analytics.getVolumeByMuscleGroup, {
    periodDays,
  });

  // Loading state
  if (rawData === undefined) {
    return (
      <div
        data-analytics-barchart
        className="flex items-center justify-center py-16"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium">Loading chart…</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (rawData.length === 0) {
    return (
      <div
        data-analytics-barchart
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="rounded-full bg-gray-100 p-3 mb-3">
          <svg
            className="h-6 w-6 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No volume data yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Complete workouts to see your volume breakdown by muscle group
        </p>
      </div>
    );
  }

  // Map to chart format
  const chartData: ChartDataPoint[] = rawData.map((item) => ({
    name: formatMuscleGroupName(item.muscleGroup),
    volume: Math.round(item.totalVolume),
    setCount: item.setCount,
    muscleGroup: item.muscleGroup,
  }));

  return (
    <div data-analytics-barchart>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 45 + 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCompactNumber}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            stroke="#d1d5db"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: "#374151" }}
            stroke="#d1d5db"
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry) => (
              <Cell
                key={entry.muscleGroup}
                fill={BAR_COLORS[entry.muscleGroup] ?? DEFAULT_BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
