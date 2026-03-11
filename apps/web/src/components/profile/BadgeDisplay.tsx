"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

interface BadgeDisplayProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function BadgeDisplay({
  userId,
  isOwnProfile,
}: BadgeDisplayProps) {
  const badges = useQuery(api.badges.getUserBadges, { userId });

  // Loading skeleton
  if (badges === undefined) {
    return (
      <div data-badge-section>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="mx-auto h-8 w-8 rounded-full bg-gray-200" />
              <div className="mt-2 mx-auto h-3 w-16 rounded bg-gray-200" />
              <div className="mt-1.5 mx-auto h-2.5 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (badges.length === 0) {
    return (
      <div data-badge-section>
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">
            {isOwnProfile
              ? "Complete workouts to earn badges!"
              : "No badges earned yet"}
          </p>
        </div>
      </div>
    );
  }

  // Populated badge grid
  return (
    <div data-badge-section>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {badges.map((badge) => (
          <div
            key={badge.badgeSlug}
            data-badge-card
            data-badge-slug={badge.badgeSlug}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm text-center"
          >
            <div className="text-2xl" aria-hidden="true">
              {badge.emoji}
            </div>
            <p className="mt-1.5 text-xs font-bold text-gray-900 leading-tight">
              {badge.name}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-gray-500">
              {badge.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
