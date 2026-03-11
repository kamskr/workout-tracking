import React, { memo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string;
  value: number;
  displayName: string;
  username: string;
}

interface LeaderboardTableNativeProps {
  entries: LeaderboardEntry[] | undefined;
  currentUserId: string | undefined;
  formatValue: (value: number) => string;
}

// ── Row Component ────────────────────────────────────────────────────────────

interface RowProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  formatValue: (value: number) => string;
}

function LeaderboardRow({ entry, rank, isCurrentUser, formatValue }: RowProps) {
  return (
    <View
      style={[styles.row, isCurrentUser && styles.rowHighlighted]}
      accessibilityLabel={`Rank ${rank}: ${entry.displayName}, ${formatValue(entry.value)}`}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, isCurrentUser && styles.rankTextHighlighted]}>
          {rank}
        </Text>
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <Text style={styles.username} numberOfLines={1}>
          @{entry.username}
        </Text>
      </View>

      {/* Value */}
      <Text style={[styles.value, isCurrentUser && styles.valueHighlighted]}>
        {formatValue(entry.value)}
      </Text>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Leaderboard ranking table for FlatList-based display of ranked entries.
 *
 * - Renders 1-indexed rank numbers
 * - Highlights current user's row with accent background + "You" badge
 * - Shows loading spinner when `entries` is undefined
 * - Shows empty state when entries array is empty
 */
function LeaderboardTableNativeInner({
  entries,
  currentUserId,
  formatValue,
}: LeaderboardTableNativeProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => (
      <LeaderboardRow
        entry={item}
        rank={index + 1}
        isCurrentUser={currentUserId !== undefined && item.userId === currentUserId}
        formatValue={formatValue}
      />
    ),
    [currentUserId, formatValue],
  );

  const keyExtractor = useCallback(
    (item: LeaderboardEntry) => item.userId,
    [],
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (entries === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No leaderboard entries yet. Start working out to get ranked!
        </Text>
      </View>
    );
  }

  // ── Populated list ───────────────────────────────────────────────────────
  return (
    <FlatList
      data={entries}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      scrollEnabled={false}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={Separator}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const LeaderboardTableNative = memo(LeaderboardTableNativeInner);
LeaderboardTableNative.displayName = "LeaderboardTableNative";
export default LeaderboardTableNative;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  rowHighlighted: {
    backgroundColor: `${colors.accent}10`, // 6% accent tint
  },
  rankContainer: {
    width: 32,
    alignItems: "center",
  },
  rankText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  rankTextHighlighted: {
    color: colors.accent,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  displayName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: "#FFFFFF",
  },
  username: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  valueHighlighted: {
    color: colors.accent,
    fontFamily: fontFamily.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  // Loading
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },

  // Empty
  emptyContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
