"use client";

import { useQuery } from "convex/react";
import { Award, Sparkles } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";

interface BadgeDisplayProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function BadgeDisplay({
  userId,
  isOwnProfile,
}: BadgeDisplayProps) {
  const badges = useQuery(api.badges.getUserBadges, { userId });

  if (badges === undefined) {
    return (
      <div data-badge-section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <AppCard key={i} tone="subtle" padding="md" className="animate-pulse text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-200/80" />
              <div className="mt-4 h-3 w-20 rounded-full bg-slate-200/80 mx-auto" />
              <div className="mt-2 h-3 w-24 rounded-full bg-slate-200/70 mx-auto" />
            </AppCard>
          ))}
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div data-badge-section>
        <AppCard tone="highlight" padding="lg" className="feature-empty-state py-10 text-center">
          <div className="feature-empty-state__icon feature-empty-state__icon--accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="feature-empty-state__body">
            <p className="feature-empty-state__eyebrow">Achievements</p>
            <p className="feature-empty-state__title">
              {isOwnProfile ? "Complete workouts to earn badges" : "No badges earned yet"}
            </p>
            <p className="feature-empty-state__copy">
              {isOwnProfile
                ? "Your first milestones will surface here with the same premium card language used across the refreshed app pages."
                : "This profile hasn’t unlocked any public achievement badges yet."}
            </p>
          </div>
        </AppCard>
      </div>
    );
  }

  return (
    <div data-badge-section>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {badges.map((badge) => (
          <AppCard
            key={badge.badgeSlug}
            data-badge-card
            data-badge-slug={badge.badgeSlug}
            tone="raised"
            padding="md"
            className="group text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,247,239,0.98),rgba(255,228,205,0.88))] text-[var(--color-app-shell-accent-strong)] shadow-[0_14px_30px_rgba(117,58,24,0.14)]">
              <span className="text-2xl" aria-hidden="true">
                {badge.emoji}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold leading-tight tracking-[-0.03em] text-slate-950">
                {badge.name}
              </p>
              <p className="text-xs leading-5 text-slate-600">{badge.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <AppBadge tone="neutral" size="sm">
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Earned
                </span>
              </AppBadge>
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
