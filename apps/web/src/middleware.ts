import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// NOTE: /shared routes are intentionally NOT protected — they serve
// unauthenticated visitors viewing shared workout links (S03 sharing).
const isProtectedRoute = createRouteMatcher([
  "/notes(.*)",
  "/exercises(.*)",
  "/workouts(.*)",
  "/templates(.*)",
  "/analytics(.*)",
  "/profile(.*)",
  "/feed(.*)",
  "/leaderboards(.*)",
  "/challenges(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
