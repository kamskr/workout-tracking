"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/common/avatar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Map derived presence status to a Tailwind dot color class. */
function presenceDotColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "idle":
      return "bg-yellow-500";
    case "left":
    default:
      return "bg-gray-400";
  }
}

interface SessionParticipantListProps {
  sessionId: Id<"groupSessions">;
}

export default function SessionParticipantList({
  sessionId,
}: SessionParticipantListProps) {
  const participants = useQuery(api.sessions.getSessionParticipants, {
    sessionId,
  });

  if (participants === undefined) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-session-participants>
      <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p._id}
            className="flex items-center gap-3 rounded-lg bg-white p-2 shadow-sm border border-gray-100"
          >
            <div className="relative">
              <Avatar className="h-8 w-8 text-xs">
                {p.avatarUrl ? (
                  <AvatarImage src={p.avatarUrl} alt={p.displayName} />
                ) : null}
                <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
              </Avatar>
              {/* Presence dot */}
              <span
                data-presence-indicator
                className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-white ${presenceDotColor(p.derivedStatus)}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {p.displayName}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {p.derivedStatus}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
