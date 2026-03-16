"use client";

import Link from "next/link";
import { LayoutTemplate, Library, Sparkles } from "lucide-react";
import TemplateList from "@/components/templates/TemplateList";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function TemplatesPage() {
  return (
    <main className="app-page" data-route="templates" data-route-shell="templates">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="templates"
          eyebrow="Programming library"
          badge={<AppBadge tone="accent">Templates</AppBadge>}
          title="Workout templates"
          subtitle="Reusable plans stay in the authenticated shell now, so template browsing shares the same framing and durable route hooks as the rest of the app."
          actions={
            <Link
              href="/workouts"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 bg-white/75 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              View history
            </Link>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="templates-overview">
          <StatCard
            label="Reuse"
            value="Plans"
            description="Browse reusable workout structures without dropping back to a route-local gray wrapper."
            icon={<LayoutTemplate className="h-5 w-5" />}
          />
          <StatCard
            label="Access"
            value="Fast"
            description="Template actions stay owned by feature components while the route provides a consistent page seam."
            emphasis="warm"
            icon={<Library className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Playwright can assert this page by route hooks instead of brittle copy matching."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="default" padding="lg" data-route-section="templates-list">
          <TemplateList />
        </AppCard>
      </div>
    </main>
  );
}
