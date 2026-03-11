import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { colors, fontFamily, spacing } from "../lib/theme";

interface TextInputModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

/**
 * Reusable modal with a title, TextInput, "Cancel" and "Confirm" buttons.
 * Replaces `window.prompt` for React Native.
 */
export default function TextInputModal({
  visible,
  title,
  placeholder,
  defaultValue = "",
  onConfirm,
  onCancel,
}: TextInputModalProps) {
  const [text, setText] = useState(defaultValue);

  // Reset text when modal opens with a new default
  useEffect(() => {
    if (visible) {
      setText(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleConfirm = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.textPlaceholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />

            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.button, styles.cancelButton]}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={[
                  styles.button,
                  styles.confirmButton,
                  text.trim().length === 0 && styles.confirmButtonDisabled,
                ]}
                disabled={text.trim().length === 0}
                accessibilityLabel="Confirm"
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
});
