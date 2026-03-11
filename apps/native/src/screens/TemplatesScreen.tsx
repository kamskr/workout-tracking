import React from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import TemplateCard from "../components/TemplateCard";
import { colors, fontFamily, spacing } from "../lib/theme";

export default function TemplatesScreen() {
  const templates = useQuery(api.templates.listTemplates);

  // Loading state
  if (templates === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Templates</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading templates…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Templates</Text>
        </View>
        <View style={styles.center}>
          <Ionicons
            name="copy-outline"
            size={40}
            color={colors.border}
          />
          <Text style={styles.emptyTitle}>No templates yet</Text>
          <Text style={styles.emptySubtitle}>
            Save a completed workout as a template to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Populated state
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Templates</Text>
        <Text style={styles.countBadge}>
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <TemplateCard template={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  countBadge: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
