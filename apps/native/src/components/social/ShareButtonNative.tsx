import React, { memo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";

/** Base URL for shared workout links */
const SHARE_BASE_URL = "https://workout-tracking.app/shared/";

interface ShareButtonNativeProps {
  workoutId: Id<"workouts">;
}

/**
 * Share button: calls shareWorkout mutation, copies URL via expo-clipboard,
 * shows "Link copied!" flash. Mirrors web ShareButton.tsx.
 */
function ShareButtonNativeInner({ workoutId }: ShareButtonNativeProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareWorkout = useMutation(api.sharing.shareWorkout);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const feedItemId = await shareWorkout({ workoutId });
      const shareUrl = SHARE_BASE_URL + feedItemId;
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to share workout";
      console.error("[ShareButtonNative]", message);
      Alert.alert("Error", message);
    } finally {
      setIsSharing(false);
    }
  }, [shareWorkout, workoutId]);

  return (
    <TouchableOpacity
      onPress={handleShare}
      disabled={isSharing || copied}
      style={[
        styles.button,
        (isSharing || copied) && styles.buttonDisabled,
      ]}
      accessibilityLabel="Share workout"
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : copied ? (
        <View style={styles.content}>
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={colors.success}
          />
          <Text style={[styles.text, styles.textCopied]}>Link copied!</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Ionicons
            name="share-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.text}>Share</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const ShareButtonNative = memo(ShareButtonNativeInner);
ShareButtonNative.displayName = "ShareButtonNative";
export default ShareButtonNative;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  textCopied: {
    color: colors.success,
  },
});
