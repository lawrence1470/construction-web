"use client";

import { createAuthClient } from "better-auth/react";
import { getBaseURL } from "./utils/getBaseURL";

export const authClient = createAuthClient({
  baseURL: `${getBaseURL()}/api/auth`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
