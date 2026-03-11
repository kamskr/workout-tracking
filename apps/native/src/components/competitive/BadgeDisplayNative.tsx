import React, { memo, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

interface BadgeDisplayNativeProps {
  userId: string;
  isOwnProfile?: boolean;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

/** Single skeleton card with animated pulse opacity */
function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.badgeCard, styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonEmoji} />
      <View style={styles.skeletonName} />
      <View style={styles.skeletonDesc} />
    </Animated.View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Self-contained badge grid display component.
 * Fetches badge data via `useQuery(api.badges.getUserBadges)` — no prop-drilling.
 *
 * Three render states:
 * 1. Loading — 6 animated skeleton placeholder cards
 * 2. Empty — contextual message depending on `isOwnProfile`
 * 3. Populated — 3-column grid of badge cards with emoji, name, description
 */
function BadgeDisplayNativeInner({
  userId,
  isOwnProfile = false,
}: BadgeDisplayNativeProps) {
  const badges = useQuery(api.badges.getUserBadges, { userId });

  // ── Loading state ────────────────────────────────────────────────────────
  if (badges === undefined) {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (badges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {isOwnProfile
            ? "Complete workouts to earn badges!"
            : "No badges earned yet"}
        </Text>
      </View>
    );
  }

  // ── Populated grid ───────────────────────────────────────────────────────
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <View key={badge.badgeSlug} style={styles.badgeCard}>
          <Text style={styles.badgeEmoji} accessibilityElementsHidden>
            {badge.emoji}
          </Text>
          <Text style={styles.badgeName} numberOfLines={2}>
            {badge.name}
          </Text>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {badge.description}
          </Text>
        </View>
      ))}
    </View>
  );
}

const BadgeDisplayNative = memo(BadgeDisplayNativeInner);
BadgeDisplayNative.displayName = "BadgeDisplayNative";
export default BadgeDisplayNative;

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = spacing.sm;

const styles = StyleSheet.create({
  // 3-column grid via flexWrap
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  badgeCard: {
    // ~31% width to fit 3 per row with gaps
    width: `${(100 - 4) / 3}%` as unknown as number,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center",
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 15,
  },
  badgeDescription: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  skeletonEmoji: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  skeletonName: {
    width: 48,
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  skeletonDesc: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 2,
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
