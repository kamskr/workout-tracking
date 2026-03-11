import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

const weightUnitArg = v.union(v.literal("kg"), v.literal("lbs"));

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get the current user's preferences, or a default if none exist.
 */
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return prefs ?? { weightUnit: "kg" as const };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Set the user's weight unit preference. Upserts — creates if missing, patches if exists.
 */
export const setUnitPreference = mutation({
  args: {
    unit: weightUnitArg,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { weightUnit: args.unit });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        weightUnit: args.unit,
      });
    }
  },
});
