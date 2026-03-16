"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, LoaderCircle, UserRoundPlus, XCircle } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import { AppBadge } from "@/components/app-shell/AppBadge";
import { AppCard } from "@/components/app-shell/AppCard";

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

  const existingProfile = useQuery(
    api.profiles.getProfileByUsername,
    debouncedUsername ? { username: debouncedUsername } : "skip",
  );

  useEffect(() => {
    if (!debouncedUsername) return;
    if (existingProfile === undefined) {
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
        <div className="grid gap-3 sm:grid-cols-3">
          <AppCard tone="subtle" padding="md" className="sm:col-span-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Profile URL
            </p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-950">
              /profile/{username || "your_name"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep it recognizable. This becomes your public route and social identity.
            </p>
          </AppCard>
          <AppCard tone="highlight" padding="md" className="sm:col-span-2">
            <div className="flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  What this unlocks
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                  Badges, rankings, and shared profile surfaces stay aligned from the start.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppBadge tone="neutral">Username check</AppBadge>
                <AppBadge tone="neutral">Public profile</AppBadge>
                <AppBadge tone="neutral">Editable later</AppBadge>
              </div>
            </div>
          </AppCard>
        </div>

        <div className="grid gap-5">
          <div className="feature-form-field">
            <label htmlFor="username" className="feature-form-field__label">
              Username
            </label>
            <div className="feature-form-field__control-wrap">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="your_username"
                className="feature-form-input"
                maxLength={30}
                disabled={isSubmitting}
              />
              <div className="feature-status-pill" aria-live="polite">
                {usernameStatus.state === "checking" && (
                  <span className="feature-status-pill__item text-slate-500">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Checking
                  </span>
                )}
                {usernameStatus.state === "available" && (
                  <span className="feature-status-pill__item text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Available
                  </span>
                )}
                {usernameStatus.state === "taken" && (
                  <span className="feature-status-pill__item text-rose-700">
                    <XCircle className="h-3.5 w-3.5" /> Taken
                  </span>
                )}
                {usernameStatus.state === "idle" && (
                  <span className="feature-status-pill__item text-slate-500">
                    <UserRoundPlus className="h-3.5 w-3.5" /> Choose your handle
                  </span>
                )}
              </div>
            </div>
            <div className="min-h-[1.25rem]">
              {usernameStatus.state === "invalid" && (
                <p className="text-xs text-rose-600">{usernameStatus.message}</p>
              )}
              {usernameStatus.state === "checking" && (
                <p className="text-xs text-slate-500">Checking availability…</p>
              )}
              {usernameStatus.state === "available" && (
                <p className="text-xs text-emerald-700">✓ Username is available</p>
              )}
              {usernameStatus.state === "taken" && (
                <p className="text-xs text-rose-600">✗ Username is already taken</p>
              )}
            </div>
          </div>

          <div className="feature-form-field">
            <label htmlFor="displayName" className="feature-form-field__label">
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
              className="feature-form-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="feature-form-field">
            <label htmlFor="bio" className="feature-form-field__label">
              Bio <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself…"
              className="feature-form-input feature-form-input--textarea"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {formError && (
          <AppCard tone="subtle" padding="md" className="border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,246,247,0.95),rgba(255,238,240,0.88))]">
            <p className="text-sm text-rose-700">{formError}</p>
          </AppCard>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_22px_36px_rgba(15,23,42,0.22)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating Profile…" : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
