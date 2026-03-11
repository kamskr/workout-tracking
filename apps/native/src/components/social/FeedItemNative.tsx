import React, { memo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";
import { formatDuration, formatRelativeTime } from "../../lib/units";
import ReactionBarNative from "./ReactionBarNative";
import type { ReactionSummary } from "./ReactionBarNative";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

interface FeedItemNativeProps {
  id: Id<"feedItems">;
  author: FeedItemAuthor;
  summary: FeedItemSummary;
  reactions: ReactionSummary[];
  createdAt: number;
  /** Callback when the user taps the author avatar/name to navigate to profile */
  onPressAuthor?: (username: string) => void;
}

/**
 * Native feed card: author info, workout summary, relative timestamp, reaction bar.
 * Mirrors web FeedItem.tsx with RN primitives.
 */
function FeedItemNativeInner({
  id,
  author,
  summary,
  reactions,
  createdAt,
  onPressAuthor,
}: FeedItemNativeProps) {
  const handlePressAuthor = useCallback(() => {
    onPressAuthor?.(author.username);
  }, [onPressAuthor, author.username]);

  return (
    <View style={styles.card}>
      {/* Author header */}
      <View style={styles.authorRow}>
        <TouchableOpacity
          onPress={handlePressAuthor}
          activeOpacity={0.7}
          accessibilityLabel={`View ${author.displayName}'s profile`}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            {author.avatarUrl ? (
              <Image
                source={{ uri: author.avatarUrl }}
                style={styles.avatarImage}
                accessibilityLabel={author.displayName}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {getInitials(author.displayName)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity
              onPress={handlePressAuthor}
              activeOpacity={0.7}
            >
              <Text style={styles.displayName} numberOfLines={1}>
                {author.displayName}
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {formatRelativeTime(createdAt)}
            </Text>
          </View>
          <TouchableOpacity onPress={handlePressAuthor} activeOpacity={0.7}>
            <Text style={styles.username}>@{author.username}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workout summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryName}>{summary.name}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statBadge}>
            <Ionicons
              name="time-outline"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={styles.statText}>
              {formatDuration(summary.durationSeconds)}
            </Text>
          </View>
          <Text style={styles.statText}>
            {summary.exerciseCount} exercise
            {summary.exerciseCount !== 1 ? "s" : ""}
          </Text>
          {summary.prCount > 0 && (
            <View style={styles.statBadge}>
              <Text style={styles.prText}>
                🏆 {summary.prCount} PR{summary.prCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Reactions */}
      <View style={styles.reactionRow}>
        <ReactionBarNative feedItemId={id} reactions={reactions} />
      </View>
    </View>
  );
}

const FeedItemNative = memo(FeedItemNativeInner);
FeedItemNative.displayName = "FeedItemNative";
export default FeedItemNative;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  displayName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    flexShrink: 0,
  },
  username: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryCard: {
    marginTop: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  summaryName: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  prText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: "#D97706",
  },
  reactionRow: {
    marginTop: 12,
  },
});
