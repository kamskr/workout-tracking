"use client";

import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/common/avatar";
import ReactionBar from "./ReactionBar";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

interface FeedItemAuthor {
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface FeedItemSummary {
  name: string;
  durationSeconds: number;
  exerciseCount: number;
  prCount: number;
}

interface ReactionSummary {
  type: string;
  count: number;
  userHasReacted: boolean;
}

interface FeedItemProps {
  id: Id<"feedItems">;
  author: FeedItemAuthor;
  summary: FeedItemSummary;
  reactions: ReactionSummary[];
  createdAt: number;
}

export default function FeedItem({
  id,
  author,
  summary,
  reactions,
  createdAt,
}: FeedItemProps) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      data-feed-item
    >
      {/* Author header */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${author.username}`}>
          <Avatar className="h-10 w-10 text-sm">
            {author.avatarUrl ? (
              <AvatarImage src={author.avatarUrl} alt={author.displayName} />
            ) : null}
            <AvatarFallback>{getInitials(author.displayName)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${author.username}`}
              className="text-sm font-semibold text-gray-900 hover:underline truncate"
            >
              {author.displayName}
            </Link>
            <span className="text-xs text-gray-400 shrink-0">
              {formatRelativeTime(createdAt)}
            </span>
          </div>
          <Link
            href={`/profile/${author.username}`}
            className="text-xs text-gray-500 hover:underline"
          >
            @{author.username}
          </Link>
        </div>
      </div>

      {/* Workout summary */}
      <div className="mt-3 rounded-lg bg-gray-50 p-3">
        <p className="text-sm font-medium text-gray-900">{summary.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            {formatDuration(summary.durationSeconds)}
          </span>
          <span>
            {summary.exerciseCount} exercise{summary.exerciseCount !== 1 ? "s" : ""}
          </span>
          {summary.prCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              🏆 {summary.prCount} PR{summary.prCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Reactions */}
      <div className="mt-3">
        <ReactionBar feedItemId={id} reactions={reactions} />
      </div>
    </div>
  );
}
