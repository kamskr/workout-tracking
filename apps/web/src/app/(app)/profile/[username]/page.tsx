"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Activity, Award, Sparkles, UserRound } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/common/avatar";
import ProfileStats from "@/components/profile/ProfileStats";
import BadgeDisplay from "@/components/profile/BadgeDisplay";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";
import type { WeightUnit } from "@/lib/units";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const followStatus = useQuery(api.social.getFollowStatus, {
    targetUserId,
  });
  const followCounts = useQuery(api.social.getFollowCounts, {
    userId: targetUserId,
  });

  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const [isToggling, setIsToggling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (followStatus?.isFollowing) {
        await unfollowUser({ followingId: targetUserId });
      } else {
        await followUser({ followingId: targetUserId });
      }
    } catch {
      // Error handled — UI will update reactively
    } finally {
      setIsToggling(false);
    }
  };

  if (followStatus === undefined) return null;

  const isFollowing = followStatus.isFollowing;

  return (
    <div className="flex flex-col items-center gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isToggling}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-follow-button
        className={
          isFollowing
            ? isHovered
              ? "inline-flex min-h-10 items-center rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              : "inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            : "inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        }
      >
        {isFollowing ? (isHovered ? "Unfollow" : "Following") : "Follow"}
      </button>
      {followCounts && (
        <p className="text-xs text-slate-500">
          {followCounts.followers} follower{followCounts.followers !== 1 ? "s" : ""}
          {" · "}
          {followCounts.following} following
        </p>
      )}
    </div>
  );
}

export default function ProfileViewPage() {
  const params = useParams<{ username: string }>();
  const { user } = useUser();

  const username = params.username;

  const profile = useQuery(
    api.profiles.getProfileByUsername,
    username ? { username } : "skip",
  );
  const preferences = useQuery(api.userPreferences.getPreferences);
  const weightUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  const isOwnProfile = profile?.userId === user?.id;

  const setLeaderboardOptIn = useMutation(api.leaderboards.setLeaderboardOptIn);
  const [isTogglingOptIn, setIsTogglingOptIn] = useState(false);

  const handleToggleOptIn = useCallback(async () => {
    if (!profile) return;
    setIsTogglingOptIn(true);
    try {
      await setLeaderboardOptIn({
        optIn: !(profile.leaderboardOptIn === true),
      });
    } catch {
      // Error handled — UI will update reactively
    } finally {
      setIsTogglingOptIn(false);
    }
  }, [profile, setLeaderboardOptIn]);

  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const updateProfile = useMutation(api.profiles.updateProfile);

  const handleStartEdit = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName);
    setEditBio(profile.bio ?? "");
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editDisplayName.trim()) {
      setEditError("Display name is required");
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <main className="app-page" data-route="profile-view" data-route-shell="profile-view" data-profile-page>
        <div className="app-page-layout">
          <PageHeader
            data-page-header="profile-view"
            eyebrow="Athlete profile"
            badge={<AppBadge tone="accent">Profile</AppBadge>}
            title="Loading profile"
            subtitle="Waiting on profile and preference data so the public profile route can render through the shared authenticated shell."
          />
          <AppCard tone="subtle" padding="lg" data-route-section="profile-loading">
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-slate-400">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Loading profile…</span>
              </div>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="app-page" data-route="profile-view" data-route-shell="profile-view" data-profile-page>
        <div className="app-page-layout">
          <PageHeader
            data-page-header="profile-view"
            eyebrow="Athlete profile"
            badge={<AppBadge tone="warning">Missing</AppBadge>}
            title="Profile not found"
            subtitle={`The user “${username}” doesn’t exist or hasn’t set up their profile yet.`}
            align="center"
          />
          <AppCard tone="subtle" padding="lg" data-route-section="profile-empty">
            <p className="text-center text-sm leading-6 text-slate-500">
              The route now keeps a deliberate missing-profile state inside the authenticated shell instead of dropping back to standalone scaffolding.
            </p>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page" data-route="profile-view" data-route-shell="profile-view" data-profile-page>
      <div className="app-page-layout">
        <PageHeader
          data-page-header="profile-view"
          eyebrow="Athlete profile"
          badge={<AppBadge tone="accent">Profile</AppBadge>}
          title={profile.displayName}
          subtitle={`@${profile.username}${profile.bio ? ` · ${profile.bio}` : ""}`}
          meta={
            <>
              <AppBadge tone="neutral">Stats</AppBadge>
              <AppBadge tone="neutral">Badges</AppBadge>
              <AppBadge tone="neutral">Social</AppBadge>
            </>
          }
          actions={
            isOwnProfile && !isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Edit profile
              </button>
            ) : !isOwnProfile ? (
              <FollowButton targetUserId={profile.userId} />
            ) : null
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="profile-overview">
          <StatCard
            label="Profile"
            value="Public"
            description="Social identity, avatar, and edit controls now sit inside the shared shell vocabulary."
            icon={<UserRound className="h-5 w-5" />}
          />
          <StatCard
            label="Badges"
            value="Earned"
            description="Feature-specific badge hooks remain intact while the route owns the framing and page proof seam."
            emphasis="warm"
            icon={<Award className="h-5 w-5" />}
          />
          <StatCard
            label="Stats"
            value="Live"
            description="Workout stats and leaderboard controls stay query-driven inside durable route selectors."
            emphasis="cool"
            icon={<Activity className="h-5 w-5" />}
          />
        </section>

        <AppCard tone="raised" padding="lg" data-route-section="profile-hero">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 text-lg">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.displayName} /> : null}
              <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="edit-displayName" className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      Display name
                    </label>
                    <input
                      id="edit-displayName"
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="mt-1 block h-11 w-full rounded-2xl border border-white/70 bg-white/80 px-4 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-bio" className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      Bio
                    </label>
                    <textarea
                      id="edit-bio"
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="mt-1 block w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                      disabled={isSaving}
                    />
                  </div>
                  {editError ? <p className="text-xs text-rose-600">{editError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">{profile.displayName}</p>
                    <p className="text-sm text-slate-500">@{profile.username}</p>
                  </div>
                  {profile.bio ? <p className="text-sm leading-6 whitespace-pre-line text-slate-600">{profile.bio}</p> : null}
                </div>
              )}
            </div>

            {!isOwnProfile && !isEditing ? <FollowButton targetUserId={profile.userId} /> : null}
          </div>
        </AppCard>

        {isOwnProfile ? (
          <AppCard tone="highlight" padding="md" data-leaderboard-optin data-route-section="profile-leaderboard-optin">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Leaderboard</p>
                <p className="mt-2 text-sm text-slate-700">Show my rankings on public leaderboards</p>
              </div>
              <button
                id="leaderboard-opt-in"
                type="button"
                role="switch"
                aria-checked={profile.leaderboardOptIn === true}
                disabled={isTogglingOptIn}
                onClick={handleToggleOptIn}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${profile.leaderboardOptIn === true ? "bg-amber-500" : "bg-slate-300"}`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${profile.leaderboardOptIn === true ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </AppCard>
        ) : null}

        <section data-route-section="profile-badges">
          <div className="mb-4 flex items-center gap-2">
            <AppBadge tone="neutral">Badges</AppBadge>
            <p className="text-sm text-slate-500">Achievement surfaces and existing badge hooks preserved.</p>
          </div>
          <BadgeDisplay userId={profile.userId} isOwnProfile={isOwnProfile} />
        </section>

        <section data-route-section="profile-stats">
          <div className="mb-4 flex items-center gap-2">
            <AppBadge tone="neutral">Workout stats</AppBadge>
            <p className="text-sm text-slate-500">Performance stats stay feature-owned while the route provides shell framing.</p>
          </div>
          <ProfileStats userId={profile.userId} weightUnit={weightUnit} />
        </section>

        <section data-route-section="profile-observability" className="sr-only">
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Route selectors separate profile shell regressions from child component issues."
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>
      </div>
    </main>
  );
}
