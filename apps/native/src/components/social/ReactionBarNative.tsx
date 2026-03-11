import React, { memo, useState, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fontFamily, spacing } from "../../lib/theme";

const REACTION_EMOJI: Record<string, string> = {
  fire: "🔥",
  fistBump: "🤜",
  clap: "👏",
  strongArm: "💪",
  trophy: "🏆",
};

const REACTION_TYPES = [
  "fire",
  "fistBump",
  "clap",
  "strongArm",
  "trophy",
] as const;
type ReactionType = (typeof REACTION_TYPES)[number];

export interface ReactionSummary {
  type: string;
  count: number;
  userHasReacted: boolean;
}

interface ReactionBarNativeProps {
  feedItemId: Id<"feedItems">;
  reactions: ReactionSummary[];
}

/**
 * 5 emoji reaction buttons with optimistic toggle state (D092 pattern).
 * Tap toggles add/remove without blocking on server response.
 */
function ReactionBarNativeInner({
  feedItemId,
  reactions,
}: ReactionBarNativeProps) {
  const addReaction = useMutation(api.social.addReaction);
  const removeReaction = useMutation(api.social.removeReaction);

  // Optimistic state overlay — same pattern as web D092
  const [optimisticState, setOptimisticState] = useState<
    Record<
      string,
      { userHasReacted: boolean; countDelta: number } | undefined
    >
  >({});

  const handleToggle = useCallback(
    async (type: ReactionType) => {
      const serverData = reactions.find((r) => r.type === type);
      const optimistic = optimisticState[type];

      const currentlyReacted = optimistic
        ? optimistic.userHasReacted
        : serverData?.userHasReacted ?? false;

      const newReacted = !currentlyReacted;
      const serverReacted = serverData?.userHasReacted ?? false;

      // Apply optimistic update immediately
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
        // Clear optimistic state on success — server will update reactively
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
    <View style={styles.container}>
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
          <TouchableOpacity
            key={type}
            onPress={() => handleToggle(type)}
            style={[
              styles.button,
              userHasReacted ? styles.buttonActive : styles.buttonInactive,
            ]}
            accessibilityLabel={`${type} reaction${count > 0 ? `, ${count}` : ""}`}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{REACTION_EMOJI[type]}</Text>
            {count > 0 && (
              <Text
                style={[
                  styles.count,
                  userHasReacted ? styles.countActive : styles.countInactive,
                ]}
              >
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ReactionBarNative = memo(ReactionBarNativeInner);
ReactionBarNative.displayName = "ReactionBarNative";
export default ReactionBarNative;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 32,
  },
  buttonActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  buttonInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  countActive: {
    color: "#1D4ED8",
  },
  countInactive: {
    color: colors.textSecondary,
  },
});
