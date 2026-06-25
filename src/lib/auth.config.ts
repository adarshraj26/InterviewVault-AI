import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers added in auth.ts to avoid Edge Runtime issues
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Allow OAuth sign in always
      if (account?.provider !== "credentials") return true;
      // For credentials, user must exist
      if (!user?.id) return false;
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
