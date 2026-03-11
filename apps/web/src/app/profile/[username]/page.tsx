"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/common/avatar";
import ProfileStats from "@/components/profile/ProfileStats";
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
              ? "shrink-0 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
              : "shrink-0 rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
            : "shrink-0 rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        }
      >
        {isFollowing ? (isHovered ? "Unfollow" : "Following") : "Follow"}
      </button>
      {followCounts && (
        <p className="text-xs text-gray-500">
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

  // Leaderboard opt-in
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

  // Edit profile state
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
      setEditError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (profile === undefined) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-center py-24">
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
              <span className="text-sm font-medium">Loading profile…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Profile not found
  if (profile === null) {
    return (
      <main className="min-h-screen bg-gray-50" data-profile-page>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="text-center py-24">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-8 w-8 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">
              Profile not found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              The user &ldquo;{username}&rdquo; doesn&rsquo;t exist or hasn&rsquo;t
              set up their profile yet.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" data-profile-page>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Profile header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <Avatar className="h-20 w-20 text-lg">
              {profile.avatarUrl ? (
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                />
              ) : null}
              <AvatarFallback>
                {getInitials(profile.displayName)}
              </AvatarFallback>
            </Avatar>

            {/* Name / username / bio */}
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                /* Edit form inline */
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="edit-displayName"
                      className="block text-xs font-medium text-gray-500"
                    >
                      Display Name
                    </label>
                    <input
                      id="edit-displayName"
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-bio"
                      className="block text-xs font-medium text-gray-500"
                    >
                      Bio
                    </label>
                    <textarea
                      id="edit-bio"
                      rows={2}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                      disabled={isSaving}
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <>
                  <h1 className="text-xl font-bold text-gray-900">
                    {profile.displayName}
                  </h1>
                  <p className="text-sm text-gray-500">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                      {profile.bio}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Follow button (non-own profiles) or Edit button (own profile) */}
            {isOwnProfile && !isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Edit Profile
              </button>
            ) : !isOwnProfile ? (
              <FollowButton targetUserId={profile.userId} />
            ) : null}
          </div>
        </div>

        {/* Leaderboard opt-in (own profile only) */}
        {isOwnProfile && (
          <div className="mt-6" data-leaderboard-optin>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Leaderboard
              </h2>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="leaderboard-opt-in"
                  className="text-sm text-gray-600 cursor-pointer select-none"
                >
                  Show my rankings on public leaderboards
                </label>
                <button
                  id="leaderboard-opt-in"
                  type="button"
                  role="switch"
                  aria-checked={profile.leaderboardOptIn === true}
                  disabled={isTogglingOptIn}
                  onClick={handleToggleOptIn}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${profile.leaderboardOptIn === true ? "bg-blue-600" : "bg-gray-200"}
                  `}
                >
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                      transition duration-200 ease-in-out
                      ${profile.leaderboardOptIn === true ? "translate-x-5" : "translate-x-0"}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats section */}
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Workout Stats
          </h2>
          <ProfileStats userId={profile.userId} weightUnit={weightUnit} />
        </div>
      </div>
    </main>
  );
}
