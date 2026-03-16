"use client";

import { BookOpen, Filter, Sparkles } from "lucide-react";
import ExerciseList from "@/components/exercises/ExerciseList";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function ExercisesPage() {
  return (
    <main className="app-page" data-route="exercises" data-route-shell="exercises">
      <div className="app-page-layout">
        <PageHeader
          data-page-header="exercises"
          eyebrow="Movement library"
          badge={<AppBadge tone="accent">Catalog</AppBadge>}
          title="Exercise library"
          subtitle="Browse the shared movement catalog with the same shell spacing and surface language used across the authenticated app."
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="exercises-overview">
          <StatCard
            label="Browse"
            value="Library"
            description="Scan the full exercise catalog with consistent shell framing instead of route-local padding blocks."
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label="Filters"
            value="Fast"
            description="Search, muscle-group, and equipment controls remain intact inside the shared app shell rhythm."
            emphasis="warm"
            icon={<Filter className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Route assertions can now target durable page hooks without depending on heading text."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <section data-route-content="exercise-library">
          <ExerciseList />
        </section>
      </div>
    </main>
  );
}
