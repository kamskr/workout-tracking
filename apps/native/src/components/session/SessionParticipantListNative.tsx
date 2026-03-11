import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Map derived presence status to a dot color. */
function presenceDotColor(status: string): string {
  switch (status) {
    case "active":
      return "#34C759"; // green
    case "idle":
      return "#F59E0B"; // yellow/amber
    case "left":
    default:
      return "#9CA3AF"; // gray
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionParticipantListNativeProps {
  sessionId: Id<"groupSessions">;
}

type Participant = NonNullable<
  ReturnType<typeof useQuery<typeof api.sessions.getSessionParticipants>>
>[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionParticipantListNative({
  sessionId,
}: SessionParticipantListNativeProps) {
  const participants = useQuery(api.sessions.getSessionParticipants, {
    sessionId,
  });

  if (participants === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading participants…</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.header}>
        Participants ({participants.length})
      </Text>
      <FlatList
        data={participants}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.participantRow}>
            {/* Avatar with initials */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.displayName)}
                </Text>
              </View>
              {/* Presence dot overlay */}
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: presenceDotColor(item.derivedStatus) },
                ]}
              />
            </View>

            {/* Name + status */}
            <View style={styles.nameContainer}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={styles.statusText}>
                {item.derivedStatus.charAt(0).toUpperCase() +
                  item.derivedStatus.slice(1)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  header: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  presenceDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
  },
});
