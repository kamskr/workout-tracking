"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Check if the user already has a profile
  const profile = useQuery(
    api.profiles.getProfile,
    user?.id ? { userId: user.id } : "skip",
  );

  // Redirect to existing profile if one exists
  useEffect(() => {
    if (profile && profile.username) {
      router.replace(`/profile/${profile.username}`);
    }
  }, [profile, router]);

  // Loading state while Clerk user or profile query is pending
  if (!isUserLoaded || (user?.id && profile === undefined)) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-400">
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium">Loading…</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // If profile already exists, show nothing while redirect happens
  if (profile) {
    return null;
  }

  const initialDisplayName = user?.fullName ?? "";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Set Up Your Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Choose a username and tell others about yourself.
          </p>
        </div>

        {/* Form card */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <ProfileSetupForm initialDisplayName={initialDisplayName} />
        </div>
      </div>
    </main>
  );
}
