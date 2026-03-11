import { Auth } from "convex/server";

/**
 * Extract the authenticated user's ID from the Convex auth context.
 * Returns the Clerk `subject` (user ID) or undefined if not authenticated.
 *
 * Usage in queries/mutations:
 *   const userId = await getUserId(ctx);
 *   if (!userId) throw new Error("Not authenticated");
 */
export const getUserId = async (ctx: { auth: Auth }): Promise<string | undefined> => {
  return (await ctx.auth.getUserIdentity())?.subject;
};
