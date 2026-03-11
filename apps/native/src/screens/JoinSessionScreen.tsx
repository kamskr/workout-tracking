import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WorkoutsStackParamList } from "../navigation/MainTabs";
import { colors, fontFamily, spacing } from "../lib/theme";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "JoinSession">;

export default function JoinSessionScreen({ navigation }: Props) {
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** D022: useRef guard to prevent double-tap on join */
  const joinAttempted = useRef(false);

  // Query session preview when 6 chars entered; skip otherwise
  const session = useQuery(
    api.sessions.getSessionByInviteCode,
    inviteCode.length === 6 ? { inviteCode } : "skip",
  );

  const joinSessionMutation = useMutation(api.sessions.joinSession);

  function handleCodeChange(text: string) {
    // Force uppercase, strip non-alphanumeric
    const cleaned = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    setInviteCode(cleaned);
    setError(null);
  }

  async function handleJoin() {
    if (joinAttempted.current || inviteCode.length !== 6) return;
    joinAttempted.current = true;
    setJoining(true);
    setError(null);

    try {
      const result = await joinSessionMutation({ inviteCode });
      console.log(
        `[Session] Join success: sessionId=${result.sessionId}`,
      );
      navigation.replace("GroupSession", { sessionId: result.sessionId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join session";
      console.error(`[Session] Join failed: ${message}`);
      setError(message);
      Alert.alert("Error", message);
      joinAttempted.current = false;
      setJoining(false);
    }
  }

  const isCodeComplete = inviteCode.length === 6;
  const isSessionLoading = isCodeComplete && session === undefined;
  const isSessionNotFound = isCodeComplete && session === null;
  const isJoinable =
    session != null &&
    (session.status === "waiting" || session.status === "active");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Session</Text>
          {/* Spacer for centering */}
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Invite code input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Enter Invite Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={handleCodeChange}
              placeholder="Enter code"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
              autoCorrect={false}
              autoComplete="off"
              keyboardType="default"
              returnKeyType="done"
              accessibilityLabel="Invite code"
              testID="invite-code-input"
            />
          </View>

          {/* Session preview */}
          {isSessionLoading && (
            <View style={styles.previewCard}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.previewLoading}>Finding session…</Text>
            </View>
          )}

          {isSessionNotFound && (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.destructive}
              />
              <Text style={styles.errorCardText}>
                Session not found. Check the code and try again.
              </Text>
            </View>
          )}

          {session != null && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Host</Text>
                <Text style={styles.previewValue}>
                  {session.host.displayName}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Participants</Text>
                <Text style={styles.previewValue}>
                  {session.participantCount} / 10
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Status</Text>
                <Text style={[styles.previewValue, styles.statusText]}>
                  {session.status.charAt(0).toUpperCase() +
                    session.status.slice(1)}
                </Text>
              </View>
            </View>
          )}

          {/* Error display */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{error}</Text>
            </View>
          )}

          {/* Join button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              (!isJoinable || joining) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            disabled={!isJoinable || joining}
            accessibilityLabel="Join session"
            accessibilityRole="button"
          >
            {joining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={20} color="#FFFFFF" />
                <Text style={styles.joinButtonText}>
                  {!isCodeComplete
                    ? "Enter 6-character code"
                    : isSessionNotFound
                      ? "Session not found"
                      : !isJoinable && session != null
                        ? "Session is no longer joinable"
                        : "Join Session"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  headerSpacer: {
    width: 32, // match back button width for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  inputSection: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  codeInput: {
    fontSize: 28,
    fontFamily: "Courier",
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  previewCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewLoading: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  statusText: {
    textTransform: "capitalize",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorCardText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.destructive,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: spacing.sm,
  },
  joinButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
});
