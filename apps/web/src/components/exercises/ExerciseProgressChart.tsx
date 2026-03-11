"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExerciseProgressChartProps {
  exerciseId: Id<"exercises">;
  periodDays?: number;
}

interface ChartDataPoint {
  date: number;
  dateLabel: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number | undefined;
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatDateTick(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Compact number formatter for large volume values.
 * e.g. 1200 → "1.2k", 15000 → "15k", 800 → "800"
 */
function formatCompactNumber(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

// ── Chart colors ─────────────────────────────────────────────────────────────

const COLOR_MAX_WEIGHT = "#0d87e1"; // primary blue
const COLOR_ESTIMATED_1RM = "#14b8a6"; // teal
const COLOR_TOTAL_VOLUME = "#f59e0b"; // amber

// ── Component ────────────────────────────────────────────────────────────────

export default function ExerciseProgressChart({
  exerciseId,
  periodDays,
}: ExerciseProgressChartProps) {
  const rawData = useQuery(api.analytics.getExerciseProgress, {
    exerciseId,
    periodDays,
  });

  // Loading state
  if (rawData === undefined) {
    return (
      <div data-exercise-chart className="flex items-center justify-center py-16">
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

  // Empty state: fewer than 2 data points
  if (rawData.length < 2) {
    return (
      <div data-exercise-chart className="flex flex-col items-center justify-center py-16 text-center">
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
        <p className="text-sm font-medium text-gray-900">Not enough data yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Log more workouts with this exercise to see progress charts
        </p>
      </div>
    );
  }

  // Map raw data to chart-ready format
  const chartData: ChartDataPoint[] = rawData.map((point) => ({
    date: point.date,
    dateLabel: formatDateTick(point.date),
    maxWeight: point.maxWeight,
    totalVolume: point.totalVolume,
    estimated1RM: point.estimated1RM,
  }));

  const showDots = chartData.length <= 20;

  return (
    <div data-exercise-chart>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            stroke="#d1d5db"
          />

          {/* Left Y-axis: weight / 1RM (kg) */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            stroke="#d1d5db"
            label={{
              value: "kg",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "#6b7280" },
            }}
          />

          {/* Right Y-axis: total volume */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatCompactNumber}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            stroke="#d1d5db"
            label={{
              value: "volume",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12, fill: "#6b7280" },
            }}
          />

          <Tooltip
            content={<ChartTooltip />}
          />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            wrapperStyle={{ fontSize: 13 }}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="maxWeight"
            name="Max Weight"
            stroke={COLOR_MAX_WEIGHT}
            strokeWidth={2}
            dot={showDots}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="estimated1RM"
            name="Est. 1RM"
            stroke={COLOR_ESTIMATED_1RM}
            strokeWidth={2}
            dot={showDots}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalVolume"
            name="Total Volume"
            stroke={COLOR_TOTAL_VOLUME}
            strokeWidth={2}
            dot={showDots}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number | undefined;
  color: string;
  dataKey: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !label) return null;

  const dateStr = new Date(label).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs font-medium text-gray-600">{dateStr}</p>
      {payload.map((entry) => {
        if (entry.value === undefined || entry.value === null) return null;

        let formatted: string;
        if (entry.dataKey === "totalVolume") {
          formatted = `${formatCompactNumber(entry.value)} kg`;
        } else {
          formatted = `${entry.value} kg`;
        }

        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-medium text-gray-900">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
