"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { BadgeCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();

  const profile = useQuery(
    api.profiles.getProfile,
    user?.id ? { userId: user.id } : "skip",
  );

  useEffect(() => {
    if (profile && profile.username) {
      router.replace(`/profile/${profile.username}`);
    }
  }, [profile, router]);

  if (!isUserLoaded || (user?.id && profile === undefined)) {
    return (
      <main className="app-page" data-route="profile-setup" data-route-shell="profile-setup">
        <div className="app-page-layout app-page-layout--narrow">
          <PageHeader
            data-page-header="profile-setup"
            eyebrow="Account setup"
            badge={<AppBadge tone="accent">Profile</AppBadge>}
            title="Set up your profile"
            subtitle="We’re getting your account ready so the public profile route can render through the shared app shell."
          />
          <AppCard tone="subtle" padding="lg" data-route-section="profile-setup-loading">
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-slate-400">
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Loading…</span>
              </div>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  if (profile) {
    return null;
  }

  const initialDisplayName = user?.fullName ?? "";

  return (
    <main className="app-page" data-route="profile-setup" data-route-shell="profile-setup">
      <div className="app-page-layout app-page-layout--narrow">
        <PageHeader
          data-page-header="profile-setup"
          eyebrow="Account setup"
          badge={<AppBadge tone="accent">Profile</AppBadge>}
          title="Set up your profile"
          subtitle="Choose a username, add some context, and make your social and leaderboard surfaces render from a single authenticated shell seam."
          meta={
            <>
              <AppBadge tone="neutral">Username</AppBadge>
              <AppBadge tone="neutral">Bio</AppBadge>
              <AppBadge tone="neutral">Public profile</AppBadge>
            </>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="profile-setup-overview">
          <StatCard
            label="Identity"
            value="Username"
            description="Claim the profile URL you’ll use across the social feed, badges, and rankings."
            icon={<UserRoundPlus className="h-5 w-5" />}
          />
          <StatCard
            label="Trust"
            value="Ready"
            description="Setup keeps the existing form logic intact while the route owns the shell framing and selectors."
            emphasis="warm"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Later browser proof can assert setup state through route hooks instead of heading text."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="raised" padding="lg" data-route-section="profile-setup-form">
          <ProfileSetupForm initialDisplayName={initialDisplayName} />
        </AppCard>
      </div>
    </main>
  );
}
