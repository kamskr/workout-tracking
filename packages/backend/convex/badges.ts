/**
 * Badge queries — public API for reading user badges.
 *
 * Provides an auth-gated query for retrieving a user's earned badges,
 * enriched with display metadata (name, emoji, description, category)
 * from BADGE_DEFINITIONS. Cross-user readable — any authenticated user
 * can view any other user's badges (same pattern as getProfileStats).
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { BADGE_DEFINITIONS } from "./lib/badgeDefinitions";

// Pre-build slug→definition lookup for O(1) enrichment
const definitionsBySlug = new Map(
  BADGE_DEFINITIONS.map((d) => [d.slug, d]),
);

/**
 * Get all badges earned by a user, enriched with display metadata.
 *
 * Auth-gated but cross-user readable — accepts any userId arg.
 * Returns badges sorted by awardedAt descending (most recent first).
 *
 * Each returned badge includes:
 *   - badgeSlug, awardedAt (from DB row)
 *   - name, emoji, description, category (from BADGE_DEFINITIONS)
 *
 * Unknown badge slugs (not in current definitions) are included with
 * fallback metadata and logged as "Unknown badge" for diagnostics.
 */
export const getUserBadges = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich with display metadata from BADGE_DEFINITIONS
    const enriched = userBadges.map((badge) => {
      const def = definitionsBySlug.get(badge.badgeSlug);
      if (!def) {
        console.log(
          `[Badge] Unknown badge slug "${badge.badgeSlug}" for user ${args.userId}`,
        );
      }
      return {
        _id: badge._id,
        badgeSlug: badge.badgeSlug,
        awardedAt: badge.awardedAt,
        name: def?.name ?? "Unknown Badge",
        emoji: def?.emoji ?? "❓",
        description: def?.description ?? "Unknown badge",
        category: def?.category ?? "workoutCount",
      };
    });

    // Sort by awardedAt descending (most recent first)
    enriched.sort((a, b) => b.awardedAt - a.awardedAt);

    return enriched;
  },
});
