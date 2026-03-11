import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fontFamily, spacing } from "../../lib/theme";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const DEBOUNCE_MS = 400;

type UsernameStatus =
  | { state: "idle" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" };

interface ProfileSetupFormNativeProps {
  initialDisplayName: string;
  /** Called after profile is successfully created with the chosen username */
  onSuccess: (username: string) => void;
}

/**
 * Username creation form with live format validation, debounced availability
 * check, display name, bio, and submit. Mirrors web ProfileSetupForm.tsx.
 * Uses KeyboardAvoidingView for mobile keyboard handling.
 */
export default function ProfileSetupFormNative({
  initialDisplayName,
  onSuccess,
}: ProfileSetupFormNativeProps) {
  const createProfile = useMutation(api.profiles.createProfile);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    state: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced username for availability check
  const [debouncedUsername, setDebouncedUsername] = useState("");

  useEffect(() => {
    if (!username || !USERNAME_REGEX.test(username)) {
      setDebouncedUsername("");
      return;
    }
    setUsernameStatus({ state: "checking" });
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [username]);

  // Query for username availability (skip when no valid debounced username)
  const existingProfile = useQuery(
    api.profiles.getProfileByUsername,
    debouncedUsername ? { username: debouncedUsername } : "skip",
  );

  // Update status based on query result
  useEffect(() => {
    if (!debouncedUsername) return;
    if (existingProfile === undefined) {
      setUsernameStatus({ state: "checking" });
    } else if (existingProfile === null) {
      setUsernameStatus({ state: "available" });
    } else {
      setUsernameStatus({ state: "taken" });
    }
  }, [existingProfile, debouncedUsername]);

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    setFormError(null);

    if (!value) {
      setUsernameStatus({ state: "idle" });
      return;
    }

    if (!USERNAME_REGEX.test(value)) {
      setUsernameStatus({
        state: "invalid",
        message:
          "Username must be 3-30 characters, alphanumeric and underscores only",
      });
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormError(null);

    if (!USERNAME_REGEX.test(username)) {
      setFormError(
        "Username must be 3-30 characters, alphanumeric and underscores only",
      );
      return;
    }

    if (!displayName.trim()) {
      setFormError("Display name is required");
      return;
    }

    if (usernameStatus.state === "taken") {
      setFormError("Username is already taken");
      return;
    }

    setIsSubmitting(true);

    try {
      await createProfile({
        username,
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
      });
      onSuccess(username);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create profile";
      setFormError(message);
      Alert.alert("Error", message);
      setIsSubmitting(false);
    }
  }, [username, displayName, bio, usernameStatus, createProfile, onSuccess]);

  const isValid =
    USERNAME_REGEX.test(username) &&
    displayName.trim().length > 0 &&
    usernameStatus.state === "available";

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="your_username"
            placeholderTextColor={colors.textPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            editable={!isSubmitting}
            returnKeyType="next"
          />
          {/* Username status indicator */}
          <View style={styles.statusContainer}>
            {usernameStatus.state === "invalid" && (
              <Text style={styles.statusError}>
                {usernameStatus.message}
              </Text>
            )}
            {usernameStatus.state === "checking" && (
              <Text style={styles.statusChecking}>
                Checking availability…
              </Text>
            )}
            {usernameStatus.state === "available" && (
              <Text style={styles.statusAvailable}>
                ✓ Username is available
              </Text>
            )}
            {usernameStatus.state === "taken" && (
              <Text style={styles.statusError}>
                ✗ Username is already taken
              </Text>
            )}
          </View>
        </View>

        {/* Display Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={(value) => {
              setDisplayName(value);
              setFormError(null);
            }}
            placeholder="Your Name"
            placeholderTextColor={colors.textPlaceholder}
            editable={!isSubmitting}
            returnKeyType="next"
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Bio <Text style={styles.labelOptional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself…"
            placeholderTextColor={colors.textPlaceholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        {/* Form-level error */}
        {formError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={[
            styles.submitButton,
            (!isValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
          accessibilityLabel={
            isSubmitting ? "Creating profile" : "Create profile"
          }
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Creating Profile…" : "Create Profile"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  labelOptional: {
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
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
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  statusContainer: {
    minHeight: 18,
  },
  statusError: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.destructive,
  },
  statusChecking: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
  },
  statusAvailable: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.success,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: "#B91C1C",
  },
  submitButton: {
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.background,
  },
});
