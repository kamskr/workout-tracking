import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import FollowButtonNative from "../components/social/FollowButtonNative";
import ProfileStatsNative from "../components/social/ProfileStatsNative";
import BadgeDisplayNative from "../components/competitive/BadgeDisplayNative";
import { colors, fontFamily, spacing } from "../lib/theme";
import type { WeightUnit } from "../lib/units";

// ── Route Params ─────────────────────────────────────────────────────────────

type OtherProfileParams = {
  OtherProfile: {
    userId?: string;
    username?: string;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── OtherProfileScreen ──────────────────────────────────────────────────────

export default function OtherProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<OtherProfileParams, "OtherProfile">>();

  const { userId, username } = route.params;

  // Query profile by userId or username depending on what's available
  const profileByUserId = useQuery(
    api.profiles.getProfile,
    userId ? { userId } : "skip",
  );
  const profileByUsername = useQuery(
    api.profiles.getProfileByUsername,
    !userId && username ? { username } : "skip",
  );

  const prefs = useQuery(api.userPreferences.getPreferences);
  const weightUnit: WeightUnit = (prefs?.weightUnit as WeightUnit) ?? "kg";

  const profile = userId ? profileByUserId : profileByUsername;

  // Loading
  if (profile === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} title="" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Profile not found
  if (profile === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} title="" />
        <View style={styles.centered}>
          <Ionicons
            name="person-outline"
            size={40}
            color={colors.textPlaceholder}
          />
          <Text style={styles.emptyTitle}>Profile not found</Text>
          <Text style={styles.emptySubtitle}>
            This user doesn't exist or hasn't set up their profile yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        onBack={() => navigation.goBack()}
        title={profile.displayName}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatar}>
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatarImage}
                  accessibilityLabel={profile.displayName}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {getInitials(profile.displayName)}
                </Text>
              )}
            </View>

            {/* Follow button */}
            <FollowButtonNative targetUserId={profile.userId} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}
          </View>
        </View>

        {/* Badges section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <BadgeDisplayNative userId={profile.userId} isOwnProfile={false} />
        </View>

        {/* Stats section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Stats</Text>
          <ProfileStatsNative
            userId={profile.userId}
            weightUnit={weightUnit}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Header Bar ───────────────────────────────────────────────────────────────

function HeaderBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={headerStyles.row}>
      <TouchableOpacity
        onPress={onBack}
        style={headerStyles.backButton}
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={headerStyles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={headerStyles.backButton} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  // Profile card
  profileCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  profileInfo: {
    marginTop: spacing.md,
  },
  displayName: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  username: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Section
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
});
