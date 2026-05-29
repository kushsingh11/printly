import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/types";
import { createUser, getUserByEmail } from "@/lib/sheets";

// Google provider is enabled only when its OAuth env vars are present.
const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.email, name: user.name, email: user.email, role: user.role };
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    // Auto-provision a Sheet record on first Google sign-in.
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        const existing = await getUserByEmail(email);
        if (!existing) {
          await createUser({ name: user.name ?? email, email, passwordHash: "", role: "STUDENT" });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const email = user.email?.toLowerCase() ?? "";
        token.uid = email;
        // Credentials sign-in already carries the role; Google sign-in doesn't,
        // so resolve it from the Sheet.
        let role = (user as { role?: Role }).role;
        if (!role && email) role = (await getUserByEmail(email))?.role;
        token.role = role ?? "STUDENT";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
