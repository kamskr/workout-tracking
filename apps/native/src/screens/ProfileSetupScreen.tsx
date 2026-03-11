import React, { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ProfileSetupFormNative from "../components/social/ProfileSetupFormNative";
import { colors, fontFamily, spacing } from "../lib/theme";

export default function ProfileSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useUser();

  const initialDisplayName = user?.fullName ?? "";

  const handleSuccess = useCallback(
    (_username: string) => {
      // Replace navigation stack — prevent back-to-setup
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "ProfileMain" }],
        }),
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Create Your Profile</Text>
      <Text style={styles.subtitle}>
        Choose a username to start sharing workouts and connecting with other
        lifters.
      </Text>
      <ProfileSetupFormNative
        initialDisplayName={initialDisplayName}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },
});
