import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/server/db";

export const auth = betterAuth({
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  trustedOrigins: ["http://localhost:5050"],
});

export type Session = typeof auth.$Infer.Session;
