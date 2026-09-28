import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

/** The Google accounts allowed in, from ALLOWED_EMAILS (comma-separated). Nobody is allowed if it's empty. */
export function isAllowedEmail(email?: string | null) {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Someone who isn't on the list never gets an account.
        before: async (user) => (isAllowedEmail(user.email) ? { data: user } : false),
      },
    },
  },
  plugins: [nextCookies()],
});
