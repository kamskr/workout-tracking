import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import FeedItemNative from "../components/social/FeedItemNative";
import { colors, fontFamily, spacing } from "../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

type FeedScreenNav = NativeStackNavigationProp<any>;

interface EnrichedFeedItem {
  _id: Id<"feedItems">;
  author: { displayName: string; username: string; avatarUrl: string | null };
  summary: {
    name: string;
    durationSeconds: number;
    exerciseCount: number;
    prCount: number;
  };
  reactions: Array<{ type: string; count: number; userHasReacted: boolean }>;
  createdAt: number;
}

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

// ── Search Result Card ───────────────────────────────────────────────────────

interface SearchResultProps {
  userId: string;
  username: string;
  displayName: string;
  onNavigate: (username: string) => void;
}

const SearchResultCard = memo(function SearchResultCard({
  userId,
  username,
  displayName,
  onNavigate,
}: SearchResultProps) {
  const followStatus = useQuery(api.social.getFollowStatus, {
    targetUserId: userId,
  });
  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    setIsToggling(true);
    try {
      if (followStatus?.isFollowing) {
        await unfollowUser({ followingId: userId });
      } else {
        await followUser({ followingId: userId });
      }
    } catch (err) {
      console.error(
        "[FeedScreen] follow/unfollow failed:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      setIsToggling(false);
    }
  }, [followStatus, userId, followUser, unfollowUser]);

  const handlePress = useCallback(() => {
    onNavigate(username);
  }, [onNavigate, username]);

  return (
    <View style={searchStyles.card}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={searchStyles.avatarContainer}
      >
        <View style={searchStyles.avatar}>
          <Text style={searchStyles.avatarText}>
            {getInitials(displayName)}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={searchStyles.info}
      >
        <Text style={searchStyles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={searchStyles.username}>@{username}</Text>
      </TouchableOpacity>

      {followStatus !== undefined && (
        <TouchableOpacity
          onPress={handleToggle}
          disabled={isToggling}
          style={[
            searchStyles.followButton,
            followStatus.isFollowing
              ? searchStyles.followingButton
              : searchStyles.notFollowingButton,
            isToggling && searchStyles.disabledButton,
          ]}
          accessibilityLabel={
            followStatus.isFollowing ? "Unfollow" : "Follow"
          }
          accessibilityRole="button"
        >
          <Text
            style={[
              searchStyles.followText,
              followStatus.isFollowing
                ? searchStyles.followingText
                : searchStyles.notFollowingText,
            ]}
          >
            {followStatus.isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── User Search Section ──────────────────────────────────────────────────────

function UserSearchSection({
  onNavigateToProfile,
}: {
  onNavigateToProfile: (username: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchResults = useQuery(
    api.profiles.searchProfiles,
    debouncedTerm.length >= 2 ? { searchTerm: debouncedTerm } : "skip",
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedTerm(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <View style={searchStyles.section}>
      <Text style={searchStyles.sectionTitle}>Discover Users</Text>
      <TextInput
        style={searchStyles.input}
        value={searchTerm}
        onChangeText={handleSearchChange}
        placeholder="Search by name…"
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {debouncedTerm.length >= 2 && searchResults !== undefined && (
        <View style={searchStyles.results}>
          {searchResults.length === 0 ? (
            <Text style={searchStyles.noResults}>No users found</Text>
          ) : (
            searchResults.map((profile) => (
              <SearchResultCard
                key={profile._id}
                userId={profile.userId}
                username={profile.username}
                displayName={profile.displayName}
                onNavigate={onNavigateToProfile}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ── FeedScreen ───────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNav>();

  const {
    results: feedItems,
    status,
    loadMore,
  } = usePaginatedQuery(api.social.getFeed, {}, { initialNumItems: 15 });

  // Guard loadMore: only call when status is CanLoadMore
  const handleEndReached = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(15);
    }
  }, [status, loadMore]);

  const handlePressAuthor = useCallback(
    (username: string) => {
      navigation.navigate("OtherProfile", { username });
    },
    [navigation],
  );

  const handleNavigateToProfile = useCallback(
    (username: string) => {
      navigation.navigate("OtherProfile", { username });
    },
    [navigation],
  );

  const keyExtractor = useCallback(
    (item: EnrichedFeedItem) => item._id,
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: EnrichedFeedItem }) => (
      <FeedItemNative
        id={item._id}
        author={item.author}
        summary={item.summary}
        reactions={item.reactions}
        createdAt={item.createdAt}
        onPressAuthor={handlePressAuthor}
      />
    ),
    [handlePressAuthor],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        <Text style={styles.title}>Activity Feed</Text>
        <UserSearchSection onNavigateToProfile={handleNavigateToProfile} />
      </View>
    ),
    [handleNavigateToProfile],
  );

  const renderFooter = useCallback(() => {
    if (status === "LoadingMore") {
      return (
        <View style={styles.footerSpinner}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      );
    }
    if (status === "Exhausted" && feedItems.length > 0) {
      return (
        <Text style={styles.exhaustedText}>You're all caught up!</Text>
      );
    }
    return null;
  }, [status, feedItems.length]);

  const renderEmpty = useCallback(() => {
    if (status === "LoadingFirstPage") {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading feed…</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={40} color={colors.textPlaceholder} />
        <Text style={styles.emptyTitle}>Your feed is empty</Text>
        <Text style={styles.emptySubtitle}>
          Follow users to see their workouts here. Use the search above to
          discover people to follow.
        </Text>
      </View>
    );
  }, [status]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList<EnrichedFeedItem>
        data={feedItems as EnrichedFeedItem[]}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          feedItems.length === 0 ? styles.emptyList : styles.list
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
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
  footerSpinner: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  exhaustedText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    paddingVertical: spacing.md,
  },
});

const searchStyles = StyleSheet.create({
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  results: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  noResults: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: spacing.xs,
  },
  avatarContainer: {},
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  username: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: colors.text,
  },
  notFollowingButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  followText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  followingText: {
    color: colors.background,
  },
  notFollowingText: {
    color: colors.text,
  },
});
