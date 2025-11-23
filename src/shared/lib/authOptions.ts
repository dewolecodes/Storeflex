import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { NextAuthOptions } from "next-auth";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        // Compare provided password with stored hashed password
        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Persist tenantId into the JWT at sign-in and expose it on session
    async jwt({ token, user }: { token: JWT; user?: unknown }): Promise<JWT> {
      if (user && typeof user === 'object' && user !== null) {
        const u = user as Record<string, unknown>;
        if (typeof u.tenantId === 'string') token.tenantId = u.tenantId as unknown as string;
        if (typeof u.role === 'string') token.role = u.role as unknown as string;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token?.tenantId) {
        const s = session as unknown as { user?: Record<string, unknown> };
        s.user = { ...(s.user ?? {}), tenantId: token.tenantId as unknown as string, role: token.role as unknown as string };
        return s as unknown as Session;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
