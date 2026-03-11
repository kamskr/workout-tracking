"use client";

import { useState, useCallback } from "react";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import FeedItem from "@/components/feed/FeedItem";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/common/avatar";

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      // Simple debounce with setTimeout
      const timeout = setTimeout(() => {
        setDebouncedTerm(value);
      }, 300);
      return () => clearTimeout(timeout);
    },
    [],
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Discover Users
      </h2>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {debouncedTerm.length >= 2 && searchResults && (
        <div className="mt-3 space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-xs text-gray-500 py-2 text-center">
              No users found
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
      )}
    </div>
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
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
      <Link href={`/profile/${username}`}>
        <Avatar className="h-8 w-8 text-xs">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${username}`}
          className="text-sm font-medium text-gray-900 hover:underline truncate block"
        >
          {displayName}
        </Link>
        <Link
          href={`/profile/${username}`}
          className="text-xs text-gray-500 hover:underline"
        >
          @{username}
        </Link>
      </div>
      {followStatus !== undefined && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className={
            followStatus.isFollowing
              ? "rounded-lg bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              : "rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          }
        >
          {followStatus.isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

export default function FeedPage() {
  const {
    results: feedItems,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(api.social.getFeed, {}, { initialNumItems: 15 });

  return (
    <main className="min-h-screen bg-gray-50" data-feed-page>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Feed</h1>

        {/* User search / discovery */}
        <div className="mb-6">
          <UserSearchSection />
        </div>

        {/* Feed content */}
        {status === "LoadingFirstPage" ? (
          <div className="flex items-center justify-center py-16">
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
              <span className="text-sm font-medium">Loading feed…</span>
            </div>
          </div>
        ) : feedItems.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-7 w-7 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">
              Your feed is empty
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Follow users to see their workouts here. Use the search above to
              discover people to follow.
            </p>
          </div>
        ) : (
          /* Feed items list */
          <div className="space-y-4">
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

            {/* Load More button */}
            {status === "CanLoadMore" && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => loadMore(15)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}

            {status === "LoadingMore" && (
              <div className="flex justify-center py-4">
                <svg
                  className="h-5 w-5 animate-spin text-gray-400"
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
            )}

            {status === "Exhausted" && feedItems.length > 0 && (
              <p className="text-center text-xs text-gray-400 pt-2">
                You&rsquo;re all caught up!
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
