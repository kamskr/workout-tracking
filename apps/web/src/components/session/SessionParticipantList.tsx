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
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[22px] border border-white/70 bg-white/78 p-3 shadow-[0_16px_30px_rgba(83,37,10,0.06)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-3 w-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-session-participants className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Presence</p>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Participants ({participants.length})
          </h3>
        </div>
        <span className="workout-kpi-pill workout-kpi-pill--cool">Live roster</span>
      </div>
      <ul className="space-y-2.5">
        {participants.map((p) => (
          <li
            key={p._id}
            className="rounded-[22px] border border-white/70 bg-white/80 p-3 shadow-[0_16px_30px_rgba(83,37,10,0.06)] transition hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 text-xs shadow-[0_10px_20px_rgba(83,37,10,0.12)]">
                  {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt={p.displayName} /> : null}
                  <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
                </Avatar>
                <span
                  data-presence-indicator
                  className={`absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full border-2 border-white ${presenceDotColor(p.derivedStatus)}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{p.displayName}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{p.derivedStatus}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
