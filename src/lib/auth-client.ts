"use client";

import { createAuthClient } from "better-auth/react";

// Use NEXT_PUBLIC_APP_URL in production, fallback to window.location.origin for client-side
const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  // Fallback for SSR/build time - will be overridden on client
  return "http://localhost:5050/api/auth";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
