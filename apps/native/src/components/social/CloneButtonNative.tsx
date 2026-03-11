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
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";
import TextInputModal from "../TextInputModal";

interface CloneButtonNativeProps {
  feedItemId: Id<"feedItems">;
  workoutName?: string;
}

/**
 * Clone button: opens TextInputModal for name, calls cloneSharedWorkoutAsTemplate,
 * shows "Cloned!" flash. Uses TextInputModal instead of Alert.prompt (iOS-only).
 * Mirrors web CloneButton.tsx.
 */
function CloneButtonNativeInner({
  feedItemId,
  workoutName,
}: CloneButtonNativeProps) {
  const [isCloning, setIsCloning] = useState(false);
  const [cloned, setCloned] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const cloneAsTemplate = useMutation(
    api.sharing.cloneSharedWorkoutAsTemplate,
  );

  const handlePressClone = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleConfirm = useCallback(
    async (name: string) => {
      setModalVisible(false);
      setIsCloning(true);
      try {
        await cloneAsTemplate({ feedItemId, name });
        setCloned(true);
        setTimeout(() => setCloned(false), 2500);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to clone workout";
        console.error("[CloneButtonNative]", message);
        Alert.alert("Error", message);
      } finally {
        setIsCloning(false);
      }
    },
    [cloneAsTemplate, feedItemId],
  );

  const handleCancel = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <View>
      <TouchableOpacity
        onPress={handlePressClone}
        disabled={isCloning || cloned}
        style={[
          styles.button,
          (isCloning || cloned) && styles.buttonDisabled,
        ]}
        accessibilityLabel="Clone as template"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {isCloning ? (
          <View style={styles.content}>
            <ActivityIndicator size="small" color={colors.background} />
            <Text style={styles.buttonText}>Cloning…</Text>
          </View>
        ) : cloned ? (
          <View style={styles.content}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={colors.background}
            />
            <Text style={styles.buttonText}>Cloned!</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Ionicons
              name="copy-outline"
              size={16}
              color={colors.background}
            />
            <Text style={styles.buttonText}>Clone as Template</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInputModal
        visible={modalVisible}
        title="Clone as Template"
        placeholder="Template name"
        defaultValue={workoutName ?? "Cloned Workout"}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}

const CloneButtonNative = memo(CloneButtonNativeInner);
CloneButtonNative.displayName = "CloneButtonNative";
export default CloneButtonNative;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.background,
  },
});
