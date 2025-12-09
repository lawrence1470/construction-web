"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:5050/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
