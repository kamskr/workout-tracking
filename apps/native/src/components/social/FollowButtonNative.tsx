import React, { memo, useState, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fontFamily, spacing } from "../../lib/theme";

interface FollowButtonNativeProps {
  targetUserId: string;
}

/**
 * Self-contained follow/unfollow button with follower counts.
 * Queries getFollowStatus + getFollowCounts, renders tap-to-toggle button.
 * No hover states — mobile constraint (D093 adaptation).
 */
function FollowButtonNativeInner({ targetUserId }: FollowButtonNativeProps) {
  const followStatus = useQuery(api.social.getFollowStatus, {
    targetUserId,
  });
  const followCounts = useQuery(api.social.getFollowCounts, {
    userId: targetUserId,
  });

  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    setIsToggling(true);
    try {
      if (followStatus?.isFollowing) {
        await unfollowUser({ followingId: targetUserId });
      } else {
        await followUser({ followingId: targetUserId });
      }
    } catch {
      // UI will update reactively via Convex subscription
    } finally {
      setIsToggling(false);
    }
  }, [followStatus, targetUserId, followUser, unfollowUser]);

  // Loading — show nothing until status is resolved
  if (followStatus === undefined) return null;

  const isFollowing = followStatus.isFollowing;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleToggle}
        disabled={isToggling}
        style={[
          styles.button,
          isFollowing ? styles.buttonFollowing : styles.buttonNotFollowing,
          isToggling && styles.buttonDisabled,
        ]}
        accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            isFollowing
              ? styles.buttonTextFollowing
              : styles.buttonTextNotFollowing,
          ]}
        >
          {isFollowing ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>

      {followCounts && (
        <Text style={styles.counts}>
          {followCounts.followers} follower
          {followCounts.followers !== 1 ? "s" : ""}
          {" · "}
          {followCounts.following} following
        </Text>
      )}
    </View>
  );
}

const FollowButtonNative = memo(FollowButtonNativeInner);
FollowButtonNative.displayName = "FollowButtonNative";
export default FollowButtonNative;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  buttonFollowing: {
    backgroundColor: colors.text,
  },
  buttonNotFollowing: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  buttonTextFollowing: {
    color: colors.background,
  },
  buttonTextNotFollowing: {
    color: colors.text,
  },
  counts: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
