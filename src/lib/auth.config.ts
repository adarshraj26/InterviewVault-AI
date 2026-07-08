import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers added in auth.ts to avoid Edge Runtime issues
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "USER";
      }

      // When session.update() is called from the client (e.g. after avatar change),
      // refresh profile picture fields from the update payload
      if (trigger === "update" && sessionData) {
        if (sessionData.profileImageUrl !== undefined)  token.profileImageUrl  = sessionData.profileImageUrl;
        if (sessionData.googleImageUrl !== undefined)   token.googleImageUrl   = sessionData.googleImageUrl;
        if (sessionData.selectedAvatarId !== undefined) token.selectedAvatarId = sessionData.selectedAvatarId;
        if (sessionData.avatarType !== undefined)       token.avatarType       = sessionData.avatarType;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;

        // Expose avatar fields on the session for client components
        (session.user as {
          profileImageUrl?: string | null;
          googleImageUrl?: string | null;
          selectedAvatarId?: string | null;
          avatarType?: string | null;
        }).profileImageUrl  = (token.profileImageUrl as string | null) ?? null;
        (session.user as {
          profileImageUrl?: string | null;
          googleImageUrl?: string | null;
          selectedAvatarId?: string | null;
          avatarType?: string | null;
        }).googleImageUrl   = (token.googleImageUrl as string | null) ?? null;
        (session.user as {
          profileImageUrl?: string | null;
          googleImageUrl?: string | null;
          selectedAvatarId?: string | null;
          avatarType?: string | null;
        }).selectedAvatarId = (token.selectedAvatarId as string | null) ?? null;
        (session.user as {
          profileImageUrl?: string | null;
          googleImageUrl?: string | null;
          selectedAvatarId?: string | null;
          avatarType?: string | null;
        }).avatarType       = (token.avatarType as string | null) ?? null;
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
