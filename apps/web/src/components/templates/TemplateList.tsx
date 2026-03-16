"use client";

import { useQuery } from "convex/react";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import TemplateCard from "./TemplateCard";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";

export default function TemplateList() {
  const templates = useQuery(api.templates.listTemplates);

  const isLoading = templates === undefined;
  const isEmpty = templates !== undefined && templates.length === 0;

  return (
    <div className="space-y-6" data-template-list>
      {isLoading && (
        <AppCard tone="subtle" padding="lg" className="feature-empty-state feature-loading-state py-10 sm:py-14">
          <div className="feature-empty-state__icon feature-empty-state__icon--warm">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div className="feature-empty-state__body">
            <p className="feature-empty-state__eyebrow">Loading library</p>
            <p className="feature-empty-state__title">Loading templates…</p>
            <p className="feature-empty-state__copy">
              Pulling your saved workout structures into the shared premium surface.
            </p>
          </div>
        </AppCard>
      )}

      {!isLoading && isEmpty && (
        <AppCard tone="highlight" padding="lg" className="feature-empty-state py-10 sm:py-14">
          <div className="feature-empty-state__icon feature-empty-state__icon--accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="feature-empty-state__body">
            <p className="feature-empty-state__eyebrow">Template library</p>
            <p className="feature-empty-state__title">No templates yet</p>
            <p className="feature-empty-state__copy">
              Save a finished workout as a template and it will land here with the same shell language as the rest of the app.
            </p>
          </div>
          <div className="feature-empty-state__meta">
            <AppBadge tone="neutral">Reusable plans</AppBadge>
            <AppBadge tone="neutral">One-tap start</AppBadge>
          </div>
        </AppCard>
      )}

      {templates && templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template._id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
