import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WorkoutsStackParamList } from "../navigation/MainTabs";
import { colors, fontFamily, spacing } from "../lib/theme";

// Session components (T02)
import SessionParticipantListNative from "../components/session/SessionParticipantListNative";
import SessionSetFeedNative from "../components/session/SessionSetFeedNative";
import SharedTimerDisplayNative from "../components/session/SharedTimerDisplayNative";
import SessionSummaryNative from "../components/session/SessionSummaryNative";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 10_000; // 10 seconds

// ---------------------------------------------------------------------------
// Status display config
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  active: "Active",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  waiting: { bg: "#FEF3C7", text: "#B45309" }, // amber
  active: { bg: "#D1FAE5", text: "#047857" }, // green
  completed: { bg: "#F3F4F6", text: "#6B7280" }, // gray
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<WorkoutsStackParamList, "GroupSession">;

export default function GroupSessionScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const { user } = useUser();

  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState(false);

  // ── Queries & mutations ────────────────────────────────────────────────────
  const session = useQuery(
    api.sessions.getSession,
    sessionId
      ? { sessionId: sessionId as Id<"groupSessions"> }
      : "skip",
  );

  const sendHeartbeat = useMutation(api.sessions.sendHeartbeat);
  const endSessionMutation = useMutation(api.sessions.endSession);

  // ── Heartbeat lifecycle ────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const heartbeat = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      await sendHeartbeat({
        sessionId: id as Id<"groupSessions">,
      });
    } catch (err) {
      // Participant may have left or session ended — stop heartbeat
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.error(
          "[Session] Heartbeat stopped: mutation error",
          err,
        );
      }
    }
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!sessionId || session === undefined) return;
    // Don't heartbeat for completed sessions
    if (session && session.status === "completed") return;

    console.log("[Session] Heartbeat started");
    // Send immediately, then every 10s
    void heartbeat();
    intervalRef.current = setInterval(
      () => void heartbeat(),
      HEARTBEAT_INTERVAL_MS,
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[Session] Heartbeat stopped: unmount");
      }
    };
  }, [sessionId, session?.status, heartbeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End session handler ────────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    if (ending || !sessionId) return;
    console.log("[Session] End session requested");
    setEnding(true);
    try {
      await endSessionMutation({
        sessionId: sessionId as Id<"groupSessions">,
      });
    } catch (err) {
      console.error("[Session] End session failed:", err);
      Alert.alert("Error", "Failed to end session. Please try again.");
    } finally {
      setEnding(false);
    }
  }, [ending, sessionId, endSessionMutation]);

  const confirmEndSession = useCallback(() => {
    Alert.alert(
      "End Session?",
      "This will end the session for all participants and generate a summary.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          style: "destructive",
          onPress: () => void handleEndSession(),
        },
      ],
    );
  }, [handleEndSession]);

  // ── Copy invite code ───────────────────────────────────────────────────────
  const copyInviteCode = useCallback(async () => {
    if (!session?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(session.inviteCode);
      setCopied(true);
      console.log("[Session] Invite code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[Session] Invite code copy failed:", err);
    }
  }, [session?.inviteCode]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found state ────────────────────────────────────────────────────────
  if (session === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Back header */}
        <View style={styles.backHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          <Ionicons
            name="people-outline"
            size={48}
            color={colors.textPlaceholder}
          />
          <Text style={styles.errorTitle}>Session not found</Text>
          <Text style={styles.errorSubtitle}>
            This session may not exist or may have been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isHost = user?.id === session.hostId;
  const isCompleted = session.status === "completed";
  const statusColors = STATUS_COLORS[session.status] ?? STATUS_COLORS.completed;

  // ── Session view ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Back header ─────────────────────────────────────────────────── */}
      <View style={styles.backHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Host-only end session button */}
        {isHost && !isCompleted && (
          <TouchableOpacity
            onPress={confirmEndSession}
            disabled={ending}
            style={styles.endButton}
            accessibilityLabel="End session"
            accessibilityRole="button"
          >
            {ending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.endButtonText}>End Session</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card ───────────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Group Session</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors.bg },
              ]}
            >
              <Text
                style={[styles.statusBadgeText, { color: statusColors.text }]}
              >
                {STATUS_LABELS[session.status] ?? session.status}
              </Text>
            </View>
          </View>

          <Text style={styles.headerSubtitle}>
            Hosted by {session.host.displayName} ·{" "}
            {session.participantCount} participant
            {session.participantCount !== 1 ? "s" : ""}
          </Text>

          {/* Invite code display — hidden when completed */}
          {!isCompleted && session.inviteCode && (
            <View style={styles.inviteRow}>
              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteLabel}>Invite Code</Text>
                <Text style={styles.inviteCode}>{session.inviteCode}</Text>
              </View>
              <TouchableOpacity
                onPress={() => void copyInviteCode()}
                style={styles.copyButton}
                accessibilityLabel="Copy invite code"
                accessibilityRole="button"
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.copyButtonText}>
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Completed: Summary view ───────────────────────────────────── */}
        {isCompleted && (
          <SessionSummaryNative
            sessionId={sessionId as Id<"groupSessions">}
          />
        )}

        {/* ── Live session: Timer + Participants + Set Feed ─────────────── */}
        {!isCompleted && (
          <>
            {/* Shared Timer */}
            <View style={styles.sectionSpacing}>
              <SharedTimerDisplayNative
                session={session}
                sessionId={sessionId as Id<"groupSessions">}
              />
            </View>

            {/* Participants */}
            <View style={styles.participantsCard}>
              <SessionParticipantListNative
                sessionId={sessionId as Id<"groupSessions">}
              />
            </View>

            {/* Set Feed */}
            <View style={styles.sectionSpacing}>
              <Text style={styles.sectionHeader}>Live Set Feed</Text>
              <SessionSetFeedNative
                sessionId={sessionId as Id<"groupSessions">}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  // ── Back header ──────────────────────────────────────────────────────────
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.accent,
  },
  endButton: {
    backgroundColor: colors.destructive,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  endButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Header card ──────────────────────────────────────────────────────────
  headerCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  // ── Invite code ──────────────────────────────────────────────────────────
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  inviteLabel: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteCode: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
    letterSpacing: 2,
    marginTop: 2,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#EBF5FF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
  },
  copyButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },

  // ── Not-found state ──────────────────────────────────────────────────────
  errorTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  sectionSpacing: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  participantsCard: {
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
});
