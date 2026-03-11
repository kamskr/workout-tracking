"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const DEBOUNCE_MS = 400;

type UsernameStatus =
  | { state: "idle" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" };

interface ProfileSetupFormProps {
  initialDisplayName: string;
}

export default function ProfileSetupForm({
  initialDisplayName,
}: ProfileSetupFormProps) {
  const router = useRouter();
  const createProfile = useMutation(api.profiles.createProfile);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    state: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced username to check availability
  const [debouncedUsername, setDebouncedUsername] = useState("");

  useEffect(() => {
    if (!username || !USERNAME_REGEX.test(username)) {
      setDebouncedUsername("");
      return;
    }
    setUsernameStatus({ state: "checking" });
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [username]);

  // Query for username availability (only when we have a valid debounced username)
  const existingProfile = useQuery(
    api.profiles.getProfileByUsername,
    debouncedUsername ? { username: debouncedUsername } : "skip",
  );

  // Update status based on query result
  useEffect(() => {
    if (!debouncedUsername) return;
    if (existingProfile === undefined) {
      // Still loading
      setUsernameStatus({ state: "checking" });
    } else if (existingProfile === null) {
      setUsernameStatus({ state: "available" });
    } else {
      setUsernameStatus({ state: "taken" });
    }
  }, [existingProfile, debouncedUsername]);

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUsername(value);
      setFormError(null);

      if (!value) {
        setUsernameStatus({ state: "idle" });
        return;
      }

      if (!USERNAME_REGEX.test(value)) {
        setUsernameStatus({
          state: "invalid",
          message:
            "Username must be 3-30 characters, alphanumeric and underscores only",
        });
        return;
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!USERNAME_REGEX.test(username)) {
      setFormError(
        "Username must be 3-30 characters, alphanumeric and underscores only",
      );
      return;
    }

    if (!displayName.trim()) {
      setFormError("Display name is required");
      return;
    }

    if (usernameStatus.state === "taken") {
      setFormError("Username is already taken");
      return;
    }

    setIsSubmitting(true);

    try {
      await createProfile({
        username,
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
      });
      router.push(`/profile/${username}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create profile";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  const isValid =
    USERNAME_REGEX.test(username) &&
    displayName.trim().length > 0 &&
    usernameStatus.state === "available";

  return (
    <div data-profile-setup-form>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <div className="relative mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="your_username"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              maxLength={30}
              disabled={isSubmitting}
            />
          </div>
          {/* Username status indicator */}
          <div className="mt-1.5 min-h-[1.25rem]">
            {usernameStatus.state === "invalid" && (
              <p className="text-xs text-red-600">{usernameStatus.message}</p>
            )}
            {usernameStatus.state === "checking" && (
              <p className="text-xs text-gray-400">
                Checking availability…
              </p>
            )}
            {usernameStatus.state === "available" && (
              <p className="text-xs text-green-600">
                ✓ Username is available
              </p>
            )}
            {usernameStatus.state === "taken" && (
              <p className="text-xs text-red-600">
                ✗ Username is already taken
              </p>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700"
          >
            Display Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setFormError(null);
            }}
            placeholder="Your Name"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            disabled={isSubmitting}
          />
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700"
          >
            Bio{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself…"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Form-level error */}
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating Profile…" : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
