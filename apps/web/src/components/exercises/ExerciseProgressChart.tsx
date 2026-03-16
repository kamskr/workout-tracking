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
import { AppBadge } from "@/components/app-shell/AppBadge";

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

function formatDateTick(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCompactNumber(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

const COLOR_MAX_WEIGHT = "#0d87e1";
const COLOR_ESTIMATED_1RM = "#14b8a6";
const COLOR_TOTAL_VOLUME = "#f59e0b";

export default function ExerciseProgressChart({
  exerciseId,
  periodDays,
}: ExerciseProgressChartProps) {
  const rawData = useQuery(api.analytics.getExerciseProgress, {
    exerciseId,
    periodDays,
  });

  if (rawData === undefined) {
    return (
      <div data-exercise-chart className="exercise-detail-panel flex items-center justify-center px-6 py-16">
        <div className="feature-inline-state justify-center">
          <span className="feature-inline-state__spinner" aria-hidden="true" />
          <span className="text-sm font-medium">Loading chart…</span>
        </div>
      </div>
    );
  }

  if (rawData.length < 2) {
    return (
      <div data-exercise-chart className="exercise-detail-panel flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="workout-empty-panel__icon mb-4">
          <svg
            className="h-6 w-6"
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
        <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Not enough data yet</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Log more workouts with this exercise to unlock max-weight, estimated 1RM, and total-volume trend lines.
        </p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = rawData.map((point) => ({
    date: point.date,
    dateLabel: formatDateTick(point.date),
    maxWeight: point.maxWeight,
    totalVolume: point.totalVolume,
    estimated1RM: point.estimated1RM,
  }));

  const showDots = chartData.length <= 20;

  return (
    <div data-exercise-chart className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="workout-section-label">Workout trend lines</p>
          <p className="text-sm leading-6 text-slate-600">
            Weight, estimated 1RM, and total volume stay readable even as the window expands.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppBadge tone="accent">Max weight</AppBadge>
          <AppBadge tone="success">Est. 1RM</AppBadge>
          <AppBadge tone="warning">Volume</AppBadge>
        </div>
      </div>

      <div className="exercise-detail-panel px-3 py-4 sm:px-4">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eaded4" />

            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#d9c8ba"
            />

            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#d9c8ba"
              label={{
                value: "kg",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#6b7280" },
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatCompactNumber}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#d9c8ba"
              label={{
                value: "volume",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 12, fill: "#6b7280" },
              }}
            />

            <Tooltip content={<ChartTooltip />} />

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
              strokeWidth={2.5}
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
              strokeWidth={2.5}
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
              strokeWidth={2.5}
              dot={showDots}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
    <div className="rounded-[20px] border border-white/75 bg-white/92 px-3 py-2 shadow-[0_18px_34px_rgba(83,37,10,0.1)] backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{dateStr}</p>
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
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-semibold text-slate-950">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
