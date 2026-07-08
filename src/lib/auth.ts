import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validators/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;
        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    // Fires once when a NEW user is created via OAuth (Google sign-in)
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await db.aICredit.upsert({
          where: { userId: user.id },
          create: { userId: user.id, credits: 50 },
          update: {},
        });
        await db.subscription.upsert({
          where: { userId: user.id },
          create: { userId: user.id, plan: "FREE" },
          update: {},
        });
      } catch (error) {
        console.error("OAuth user post-creation setup error:", error);
      }
    },
  },
  callbacks: {
    // ── signIn: controls whether sign-in is allowed ───────────────
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") return true;
      if (!user?.id) return false;
      return true;
    },

    // ── session: expose id, role, image, and all avatar fields ────
    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id as string;
        (session.user as { role?: string }).role = token.role as string;

        // Resolve the best available image for session.user.image
        // Priority: profileImageUrl → googleImageUrl → token.picture (from Google OAuth)
        const resolvedImage =
          (token.profileImageUrl  as string | null) ||
          (token.googleImageUrl   as string | null) ||
          (token.picture          as string | null) || // NextAuth's built-in Google picture field
          null;
        session.user.image = resolvedImage;

        // Also expose all avatar fields for components that need them
        const s = session.user as {
          profileImageUrl?: string | null;
          googleImageUrl?: string | null;
          selectedAvatarId?: string | null;
          avatarType?: string | null;
        };
        s.profileImageUrl  = (token.profileImageUrl  as string | null) ?? null;
        s.googleImageUrl   = (token.googleImageUrl   as string | null) ?? (token.picture as string | null) ?? null;
        s.selectedAvatarId = (token.selectedAvatarId as string | null) ?? null;
        s.avatarType       = (token.avatarType       as string | null) ?? null;
      }
      return session;
    },

    // ── jwt: stamp id, role, google picture, and avatar fields ───
    async jwt(params) {
      const { token, user, account, trigger, session: sessionData } = params;

      // Stamp id and role on first sign-in
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role || "USER";
        // Also persist user.image as token.picture so session.user.image is set
        if (user.image) token.picture = user.image;
      }

      // session.update() from client — refresh avatar fields in token
      if (trigger === "update" && sessionData) {
        if (sessionData.profileImageUrl  !== undefined) token.profileImageUrl  = sessionData.profileImageUrl;
        if (sessionData.googleImageUrl   !== undefined) token.googleImageUrl   = sessionData.googleImageUrl;
        if (sessionData.selectedAvatarId !== undefined) token.selectedAvatarId = sessionData.selectedAvatarId;
        if (sessionData.avatarType       !== undefined) token.avatarType       = sessionData.avatarType;
        // Also update token.picture so session.user.image reflects the change
        const newImage =
          (sessionData.profileImageUrl as string | null) ||
          (sessionData.googleImageUrl  as string | null) ||
          (token.picture              as string | null) ||
          null;
        token.picture = newImage;
      }

      // On initial sign-in (user object is present): load DB avatar fields
      // and capture the Google picture immediately into the DB + token.
      if (user && user.id) {
        const isGoogle    = account?.provider === "google";
        // For Google sign-in, user.image comes from Google's profile.picture
        const googleImage = isGoogle ? (user.image ?? (token.picture as string | null) ?? null) : null;

        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id as string },
            select: {
              image:           true,
              profileImageUrl: true,
              googleImageUrl:  true,
              selectedAvatarId:true,
              avatarType:      true,
            },
          });

          if (isGoogle && googleImage) {
            // Persist Google picture into both googleImageUrl and User.image
            const shouldSetGoogleType =
              !dbUser?.avatarType ||
              dbUser.avatarType === "DEFAULT" ||
              dbUser.avatarType === "GOOGLE";

            await db.user.update({
              where: { id: user.id as string },
              data: {
                image:          googleImage,         // keep User.image in sync
                googleImageUrl: googleImage,
                ...(shouldSetGoogleType ? { avatarType: "GOOGLE" } : {}),
              },
            });

            token.picture        = googleImage;
            token.googleImageUrl = googleImage;
            token.avatarType     = shouldSetGoogleType
              ? "GOOGLE"
              : (dbUser?.avatarType ?? "DEFAULT");
          } else {
            // Use whatever is already in the DB
            const storedGoogle = dbUser?.googleImageUrl || dbUser?.image || null;
            token.googleImageUrl = storedGoogle;
            token.avatarType     = dbUser?.avatarType ?? "DEFAULT";
            // Keep token.picture in sync
            if (storedGoogle && !token.picture) token.picture = storedGoogle;
          }

          token.profileImageUrl  = dbUser?.profileImageUrl  ?? null;
          token.selectedAvatarId = dbUser?.selectedAvatarId ?? null;

        } catch (e) {
          console.error("[jwt] avatar fields error:", e);
          if (isGoogle && googleImage) {
            token.picture        = googleImage;
            token.googleImageUrl = googleImage;
            token.avatarType     = "GOOGLE";
          }
        }
      }

      return token;
    },
  },
});
