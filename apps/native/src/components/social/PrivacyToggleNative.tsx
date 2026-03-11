import React, { memo, useState, useCallback } from "react";
import { StyleSheet, View, Text, Switch, Alert } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fontFamily, spacing } from "../../lib/theme";

interface PrivacyToggleNativeProps {
  workoutId: Id<"workouts">;
  isPublic: boolean;
}

/**
 * Privacy toggle using RN Switch component + toggleWorkoutPrivacy mutation.
 * Mirrors web PrivacyToggle.tsx with native Switch instead of custom toggle.
 */
function PrivacyToggleNativeInner({
  workoutId,
  isPublic,
}: PrivacyToggleNativeProps) {
  const [isToggling, setIsToggling] = useState(false);
  const togglePrivacy = useMutation(api.sharing.toggleWorkoutPrivacy);

  const handleToggle = useCallback(async () => {
    setIsToggling(true);
    try {
      await togglePrivacy({ workoutId, isPublic: !isPublic });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update privacy";
      Alert.alert("Error", message);
    } finally {
      setIsToggling(false);
    }
  }, [togglePrivacy, workoutId, isPublic]);

  return (
    <View style={styles.container}>
      <Switch
        value={isPublic}
        onValueChange={handleToggle}
        disabled={isToggling}
        trackColor={{ false: colors.border, true: colors.success }}
        thumbColor={colors.background}
        accessibilityLabel={
          isPublic
            ? "Public — toggle to make private"
            : "Private — toggle to make public"
        }
      />
      <Text
        style={[styles.label, isPublic ? styles.labelPublic : styles.labelPrivate]}
      >
        {isPublic ? "Public" : "Private"}
      </Text>
    </View>
  );
}

const PrivacyToggleNative = memo(PrivacyToggleNativeInner);
PrivacyToggleNative.displayName = "PrivacyToggleNative";
export default PrivacyToggleNative;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
  labelPublic: {
    color: colors.success,
  },
  labelPrivate: {
    color: colors.textSecondary,
  },
});
