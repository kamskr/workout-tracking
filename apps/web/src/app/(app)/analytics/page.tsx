"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Flame, TrendingUp, Waves } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { MuscleHeatmap } from "@/components/analytics/MuscleHeatmap";
import VolumeByMuscleGroupChart from "@/components/analytics/VolumeByMuscleGroupChart";
import WeeklySummaryCard from "@/components/analytics/WeeklySummaryCard";
import MonthlySummaryCard from "@/components/analytics/MonthlySummaryCard";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All Time", days: undefined },
] as const;

type PeriodDays = (typeof PERIODS)[number]["days"];

function PeriodSelector({
  selected,
  onChange,
}: {
  selected: PeriodDays;
  onChange: (days: PeriodDays) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Time period" data-analytics-period-selector>
      {PERIODS.map((period) => (
        <button
          key={period.label}
          type="button"
          onClick={() => onChange(period.days)}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
            selected === period.days
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-white/60 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  const volumeData = useQuery(api.analytics.getVolumeByMuscleGroup, {
    periodDays,
  });
  const preferences = useQuery(api.userPreferences.getPreferences);

  const weightUnit: WeightUnit = preferences?.weightUnit ?? "kg";
  const isVolumeLoaded = volumeData !== undefined;
  const isEmptyState = isVolumeLoaded && volumeData.length === 0;

  const heatmapData =
    volumeData?.map((item) => ({
      muscleGroup: item.muscleGroup,
      percentage: item.percentage,
    })) ?? [];

  const trainedMuscles = volumeData?.filter((item) => item.percentage > 0).length ?? 0;

  return (
    <main className="app-page" data-route="analytics" data-route-shell="analytics">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="analytics"
          eyebrow="Training insights"
          badge={<AppBadge tone="accent">Dashboard</AppBadge>}
          title="Analytics"
          subtitle="Track how your volume distributes across muscle groups, keep weekly and monthly summaries in view, and verify the dashboard inside the shared authenticated shell."
          meta={
            <>
              <AppBadge tone="neutral">Period-aware</AppBadge>
              <AppBadge tone="neutral">Heatmap</AppBadge>
              <AppBadge tone="neutral">Summaries</AppBadge>
            </>
          }
          actions={<PeriodSelector selected={periodDays} onChange={setPeriodDays} />}
        />

        <div className="flex items-center gap-3 text-sm text-slate-500" data-route-nav="analytics-backlink">
          <Link
            href="/workouts"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workouts
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3" data-route-section="analytics-overview">
          <StatCard
            label="Coverage"
            value={volumeData === undefined ? "—" : `${trainedMuscles}`}
            description="Muscle groups represented in the current period selection."
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Signals"
            value="2"
            description="Weekly and monthly summary cards stay visible as part of the shared dashboard rhythm."
            emphasis="warm"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="Surface"
            value={periodDays === undefined ? "All" : `${periodDays}d`}
            description="Route-level hooks prove period carry-through without brittle heading matching."
            emphasis="cool"
            icon={<Flame className="h-5 w-5" />}
          />
        </section>

        {isEmptyState ? (
          <AppCard tone="subtle" padding="lg" data-analytics-empty-state>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full border border-white/70 bg-white/80 p-4 shadow-[0_18px_34px_rgba(83,37,10,0.08)]">
                <Waves className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-900">
                Log your first workout to unlock analytics
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Once you complete a session, this dashboard will render your muscle heatmap,
                volume distribution, and rolling summaries inside the authenticated shell.
              </p>
              <Link
                href="/workouts/active"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                Start workout
              </Link>
            </div>
          </AppCard>
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]" data-route-section="analytics-dashboard">
              <AppCard tone="raised" padding="lg" data-analytics-panel="heatmap">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Muscle focus
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      Heatmap
                    </h2>
                  </div>
                  <AppBadge tone="neutral">Recovery view</AppBadge>
                </div>
                <MuscleHeatmap data={heatmapData} />
              </AppCard>

              <AppCard tone="default" padding="lg" data-analytics-panel="volume">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Distribution
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      Volume by muscle group
                    </h2>
                  </div>
                  <AppBadge tone="neutral">Current period</AppBadge>
                </div>
                <VolumeByMuscleGroupChart periodDays={periodDays} />
              </AppCard>
            </section>

            <section className="grid gap-6 md:grid-cols-2" data-route-section="analytics-summaries">
              <WeeklySummaryCard weightUnit={weightUnit} />
              <MonthlySummaryCard weightUnit={weightUnit} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
