"use client";

import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const tree = (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Google login will be disabled.");
    }
    return tree;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>;
}
