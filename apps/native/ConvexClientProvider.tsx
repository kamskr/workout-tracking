"use client";

import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const missingEnvKeys = [
  !convexUrl && "EXPO_PUBLIC_CONVEX_URL",
  !clerkPublishableKey && "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
].filter(Boolean) as string[];

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function StartupError({ missingKeys }: { missingKeys: string[] }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#FFFFFF",
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111827",
          textAlign: "center",
        }}
      >
        Native app startup blocked
      </Text>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: "#4B5563",
          textAlign: "center",
        }}
      >
        Missing required public env keys: {missingKeys.join(", ")}
      </Text>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 18,
          color: "#6B7280",
          textAlign: "center",
        }}
      >
        Check apps/native/.env and restart Expo after updating the missing keys.
      </Text>
    </View>
  );
}

export default function ConvexClientProvider({ children }: PropsWithChildren) {
  if (missingEnvKeys.length > 0 || !convex) {
    console.error(
      `[NativeStartup] Missing required public env keys: ${missingEnvKeys.join(", ")}`,
    );
    return <StartupError missingKeys={missingEnvKeys} />;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
