/**
 * Profile CRUD, stats, search, and avatar upload functions.
 *
 * The `profiles` table is the first cross-user readable table in the codebase.
 * Profile queries accept a userId/username arg and return data for any
 * authenticated user, enabling the social foundation for M003.
 *
 * Error messages are stable contracts consumed by the profile UI:
 * - "Username must be 3-30 characters, alphanumeric and underscores only"
 * - "Username already taken"
 * - "Profile not found"
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { computePeriodSummary } from "./analytics";

// ── Username validation ──────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function validateUsername(username: string): void {
  if (!USERNAME_REGEX.test(username)) {
    throw new Error(
      "Username must be 3-30 characters, alphanumeric and underscores only",
    );
  }
}

// ── Streak computation ───────────────────────────────────────────────────────

/**
 * Compute the current workout streak — consecutive UTC days with at least one
 * completed workout, counting backward from today.
 *
 * Rules:
 * - If today has a workout, count today and walk backward through consecutive days.
 * - If today has no workout but yesterday does, count from yesterday backward.
 * - If neither today nor yesterday has a workout, return 0.
 * - Returns 0 if no completed workouts exist.
 */
export async function computeCurrentStreak(
  db: any,
  userId: string,
): Promise<number> {
  // Get all completed workouts for userId, ordered by completedAt descending
  const workouts = await db
    .query("workouts")
    .withIndex("by_userId_completedAt", (q: any) => q.eq("userId", userId))
    .order("desc")
    .take(500);

  const completedWorkouts = workouts.filter(
    (w: any) => w.status === "completed" && w.completedAt,
  );

  if (completedWorkouts.length === 0) return 0;

  // Group by UTC date
  const workoutDates = new Set<string>();
  for (const w of completedWorkouts) {
    const date = new Date(w.completedAt).toISOString().slice(0, 10);
    workoutDates.add(date);
  }

  // Walk backward from today
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Determine starting point
  let startDate: Date;
  if (workoutDates.has(todayStr)) {
    startDate = today;
  } else {
    // Check yesterday
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (workoutDates.has(yesterdayStr)) {
      startDate = yesterday;
    } else {
      return 0;
    }
  }

  // Count consecutive days backward from startDate
  let streak = 0;
  const current = new Date(startDate);
  while (true) {
    const dateStr = current.toISOString().slice(0, 10);
    if (workoutDates.has(dateStr)) {
      streak++;
      current.setUTCDate(current.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ── Helper: resolve avatar URL ───────────────────────────────────────────────

async function resolveAvatarUrl(
  storage: any,
  avatarStorageId: string | undefined | null,
): Promise<string | null> {
  if (!avatarStorageId) return null;
  return (await storage.getUrl(avatarStorageId)) ?? null;
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a user profile. Enforces:
 * - At most one profile per userId (returns existing if already exists)
 * - Username format: 3-30 chars, alphanumeric + underscores
 * - Case-insensitive username uniqueness via `usernameLower` index
 */
export const createProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has a profile
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      return existing;
    }

    // Validate username format
    validateUsername(args.username);

    // Check case-insensitive uniqueness
    const usernameLower = args.username.toLowerCase();
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", usernameLower))
      .first();

    if (taken) {
      throw new Error("Username already taken");
    }

    // Insert profile
    const profileId = await ctx.db.insert("profiles", {
      userId,
      username: args.username,
      usernameLower,
      displayName: args.displayName,
      bio: args.bio,
      isPublic: true,
      createdAt: Date.now(),
    });

    return await ctx.db.get(profileId);
  },
});

/**
 * Update the authenticated user's profile.
 * Username is immutable — not accepted as an argument.
 * Cleans up old avatar storage when avatar changes.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.isPublic !== undefined) patch.isPublic = args.isPublic;

    // Handle avatar change — clean up old storage
    if (args.avatarStorageId !== undefined) {
      if (
        profile.avatarStorageId &&
        profile.avatarStorageId !== args.avatarStorageId
      ) {
        try {
          await ctx.storage.delete(profile.avatarStorageId);
        } catch (err) {
          // Orphan is harmless — log and continue
          console.error("[updateProfile] Failed to delete old avatar:", err);
        }
      }
      patch.avatarStorageId = args.avatarStorageId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(profile._id, patch);
    }

    return await ctx.db.get(profile._id);
  },
});

/**
 * Generate an upload URL for avatar image storage.
 * Client POSTs the file to this URL, receives a storageId,
 * then calls updateProfile({ avatarStorageId }).
 */
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get a user's profile by userId.
 * Cross-user read: any authenticated user can read any profile.
 * Resolves avatar URL from storage if avatarStorageId exists.
 */
export const getProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    const avatarUrl = await resolveAvatarUrl(ctx.storage, profile.avatarStorageId);

    return {
      ...profile,
      avatarUrl,
    };
  },
});

/**
 * Get a user's profile by username (case-insensitive).
 * Cross-user read: any authenticated user can read any profile.
 * Resolves avatar URL from storage if avatarStorageId exists.
 */
export const getProfileByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const usernameLower = args.username.toLowerCase();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", usernameLower))
      .first();

    if (!profile) return null;

    const avatarUrl = await resolveAvatarUrl(ctx.storage, profile.avatarStorageId);

    return {
      ...profile,
      avatarUrl,
    };
  },
});

/**
 * Get profile stats for a user: total workouts, current streak,
 * total volume, and top exercises.
 *
 * Reuses `computePeriodSummary` for all-time stats and adds
 * streak computation.
 */
export const getProfileStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    // All-time stats via computePeriodSummary with undefined periodDays
    const summary = await computePeriodSummary(ctx.db, args.userId, undefined);

    // Streak computation
    const currentStreak = await computeCurrentStreak(ctx.db, args.userId);

    return {
      totalWorkouts: summary.workoutCount,
      currentStreak,
      totalVolume: summary.totalVolume,
      topExercises: summary.topExercises,
    };
  },
});

/**
 * Search profiles by display name using the full-text search index.
 * Returns up to 20 results. Requires authentication.
 */
export const searchProfiles = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("profiles")
      .withSearchIndex("search_displayName", (q) =>
        q.search("displayName", args.searchTerm),
      )
      .take(20);

    return results;
  },
});
