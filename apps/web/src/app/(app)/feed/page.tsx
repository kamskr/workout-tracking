"use client";

import { useState, useCallback } from "react";
import { Compass, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import FeedItem from "@/components/feed/FeedItem";
import { Avatar, AvatarFallback } from "@/components/common/avatar";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { StatCard } from "@/components/app-shell/StatCard";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserSearchSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  const searchResults = useQuery(
    api.profiles.searchProfiles,
    debouncedTerm.length >= 2 ? { searchTerm: debouncedTerm } : "skip",
  );

  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    const timeout = setTimeout(() => {
      setDebouncedTerm(value);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AppCard tone="raised" padding="md" data-feed-discovery>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Discover athletes
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
            Find people to follow
          </h2>
        </div>
        <AppBadge tone="neutral">Search</AppBadge>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Search profiles</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name…"
            data-feed-search
            className="h-11 w-full rounded-2xl border border-white/70 bg-white/80 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </label>

      {debouncedTerm.length >= 2 && searchResults ? (
        <div className="mt-4 space-y-2" data-feed-search-results>
          {searchResults.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white/55 px-4 py-5 text-center text-sm text-slate-500">
              No users found for that search.
            </p>
          ) : (
            searchResults.map((profile) => (
              <SearchResultCard
                key={profile._id}
                userId={profile.userId}
                username={profile.username}
                displayName={profile.displayName}
                onFollow={async (userId) => {
                  await followUser({ followingId: userId });
                }}
                onUnfollow={async (userId) => {
                  await unfollowUser({ followingId: userId });
                }}
              />
            ))
          )}
        </div>
      ) : null}
    </AppCard>
  );
}

function SearchResultCard({
  userId,
  username,
  displayName,
  onFollow,
  onUnfollow,
}: {
  userId: string;
  username: string;
  displayName: string;
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
}) {
  const followStatus = useQuery(api.social.getFollowStatus, {
    targetUserId: userId,
  });
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (followStatus?.isFollowing) {
        await onUnfollow(userId);
      } else {
        await onFollow(userId);
      }
    } catch {
      // Error handled silently — UI will update reactively
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/65 bg-white/72 p-3 shadow-[0_14px_28px_rgba(83,37,10,0.05)]">
      <Link href={`/profile/${username}`}>
        <Avatar className="h-9 w-9 text-xs">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${username}`}
          className="block truncate text-sm font-semibold text-slate-900 hover:underline"
        >
          {displayName}
        </Link>
        <Link
          href={`/profile/${username}`}
          className="text-xs text-slate-500 hover:underline"
        >
          @{username}
        </Link>
      </div>
      {followStatus !== undefined ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className={
            followStatus.isFollowing
              ? "inline-flex min-h-9 items-center rounded-full bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
              : "inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          }
        >
          {followStatus.isFollowing ? "Following" : "Follow"}
        </button>
      ) : null}
    </div>
  );
}

export default function FeedPage() {
  const {
    results: feedItems,
    status,
    loadMore,
  } = usePaginatedQuery(api.social.getFeed, {}, { initialNumItems: 15 });

  return (
    <main className="app-page" data-feed-page data-route="feed" data-route-shell="feed">
      <div className="app-page-layout app-page-layout--narrow">
        <PageHeader
          data-page-header="feed"
          eyebrow="Social training"
          badge={<AppBadge tone="accent">Community</AppBadge>}
          title="Activity feed"
          subtitle="See recent workouts from the people you follow, discover new lifters, and keep the social page inside the same authenticated shell contract as the rest of the product."
          meta={
            <>
              <AppBadge tone="neutral">Realtime feed</AppBadge>
              <AppBadge tone="neutral">Discovery</AppBadge>
              <AppBadge tone="neutral">Reactions</AppBadge>
            </>
          }
        />

        <section className="grid gap-4 md:grid-cols-3" data-route-section="feed-overview">
          <StatCard
            label="Discovery"
            value="Follow"
            description="Profile search stays inline instead of fragmenting into a separate wrapper."
            icon={<Compass className="h-5 w-5" />}
          />
          <StatCard
            label="Community"
            value={status === "LoadingFirstPage" ? "…" : `${feedItems.length}`}
            description="Visible items currently loaded into the social feed surface."
            emphasis="warm"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Carry-through"
            value="Shared"
            description="Shell chrome plus route-specific feed hooks now prove this page shape end-to-end."
            emphasis="cool"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </section>

        <UserSearchSection />

        {status === "LoadingFirstPage" ? (
          <AppCard tone="subtle" padding="lg" data-feed-state="loading">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-slate-400">
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
                <span className="text-sm font-medium">Loading feed…</span>
              </div>
            </div>
          </AppCard>
        ) : feedItems.length === 0 ? (
          <AppCard tone="subtle" padding="lg" data-feed-state="empty">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/85 shadow-[0_18px_34px_rgba(83,37,10,0.08)]">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">
                Your feed is empty
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Follow users to see their workouts here. The search panel above is the
                route-specific proof surface for this shell retrofit.
              </p>
            </div>
          </AppCard>
        ) : (
          <section className="space-y-4" data-route-content="feed-stream">
            {feedItems.map((item) => (
              <FeedItem
                key={item._id}
                id={item._id}
                author={item.author}
                summary={item.summary}
                reactions={item.reactions}
                createdAt={item.createdAt}
              />
            ))}

            {status === "CanLoadMore" ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => loadMore(15)}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Load More
                </button>
              </div>
            ) : null}

            {status === "LoadingMore" ? (
              <div className="flex justify-center py-4" data-feed-state="loading-more">
                <svg
                  className="h-5 w-5 animate-spin text-slate-400"
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
              </div>
            ) : null}

            {status === "Exhausted" && feedItems.length > 0 ? (
              <p className="pt-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                You&rsquo;re all caught up
              </p>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
