"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const REACTION_EMOJI: Record<string, string> = {
  fire: "🔥",
  fistBump: "🤜",
  clap: "👏",
  strongArm: "💪",
  trophy: "🏆",
};

const REACTION_TYPES = ["fire", "fistBump", "clap", "strongArm", "trophy"] as const;
type ReactionType = (typeof REACTION_TYPES)[number];

interface ReactionSummary {
  type: string;
  count: number;
  userHasReacted: boolean;
}

interface ReactionBarProps {
  feedItemId: Id<"feedItems">;
  reactions: ReactionSummary[];
}

export default function ReactionBar({ feedItemId, reactions }: ReactionBarProps) {
  const addReaction = useMutation(api.social.addReaction);
  const removeReaction = useMutation(api.social.removeReaction);

  // Optimistic state: track pending toggles
  const [optimisticState, setOptimisticState] = useState<
    Record<string, { userHasReacted: boolean; countDelta: number } | undefined>
  >({});

  const handleToggle = useCallback(
    async (type: ReactionType) => {
      const serverData = reactions.find((r) => r.type === type);
      const optimistic = optimisticState[type];

      // Determine the current effective state
      const currentlyReacted = optimistic
        ? optimistic.userHasReacted
        : serverData?.userHasReacted ?? false;

      // Optimistic: toggle immediately
      const newReacted = !currentlyReacted;
      const serverReacted = serverData?.userHasReacted ?? false;
      const serverCount = serverData?.count ?? 0;

      setOptimisticState((prev) => ({
        ...prev,
        [type]: {
          userHasReacted: newReacted,
          countDelta: (newReacted ? 1 : 0) - (serverReacted ? 1 : 0),
        },
      }));

      try {
        if (newReacted) {
          await addReaction({ feedItemId, type });
        } else {
          await removeReaction({ feedItemId, type });
        }
        // Clear optimistic state on success — server state will update reactively
        setOptimisticState((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
      } catch {
        // Revert optimistic state on error
        setOptimisticState((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
      }
    },
    [feedItemId, reactions, optimisticState, addReaction, removeReaction],
  );

  return (
    <div className="flex items-center gap-1.5" data-reaction-bar>
      {REACTION_TYPES.map((type) => {
        const serverData = reactions.find((r) => r.type === type);
        const optimistic = optimisticState[type];

        const userHasReacted = optimistic
          ? optimistic.userHasReacted
          : serverData?.userHasReacted ?? false;
        const count = optimistic
          ? (serverData?.count ?? 0) + optimistic.countDelta
          : serverData?.count ?? 0;

        return (
          <button
            key={type}
            type="button"
            onClick={() => handleToggle(type)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors",
              userHasReacted
                ? "bg-blue-50 ring-1 ring-blue-200 text-blue-700"
                : "bg-gray-50 hover:bg-gray-100 text-gray-600",
            )}
            title={type}
          >
            <span>{REACTION_EMOJI[type]}</span>
            {count > 0 && (
              <span className="text-xs font-medium">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
