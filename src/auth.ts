import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { logActivity } from "@/lib/activity";
import { googleBirthdayEnabled, saveGoogleBirthday } from "@/lib/birthday";

const credentialsSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { login, password } = parsed.data;
        const user = await db.user.findUnique({ where: { login } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await logActivity(user.id, "AUTH_LOGIN", "Login/parol bilan kirdi");

        return {
          id: user.id,
          name: user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.email,
          image: user.avatarUrl ?? user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Credentials kirishi authorize() ichida allaqachon qayd qilinadi —
      // bu yerda faqat Google orqali kirishni (u orqali qayd qilinmagani
      // uchun) yozamiz, ikki marta yozilmasin.
      if (user?.id && account?.provider === "google") {
        await logActivity(user.id, "AUTH_LOGIN", "Google bilan kirdi");
        if (googleBirthdayEnabled()) await saveGoogleBirthday(user.id, account.access_token);
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;

      // Sign-in, profil yangilanishi, yoki profil hali tugallanmagan bo'lsa —
      // har safar DB dan yangi ma'lumot olamiz (onboarding tugagach loop bo'lmasin).
      if (user || trigger === "update" || !token.profileComplete) {
        const dbUser = token.sub
          ? await db.user.findUnique({ where: { id: token.sub } })
          : null;
        if (dbUser) {
          token.role = dbUser.role ?? null;
          token.login = dbUser.login ?? null;
          token.picture = dbUser.avatarUrl ?? dbUser.image ?? null;
          token.name = dbUser.name;
          token.profileComplete = !!(dbUser.role && dbUser.login);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as "ORDERER" | "PREPARER" | null) ?? null;
        session.user.login = (token.login as string | null) ?? null;
        session.user.profileComplete = !!token.profileComplete;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
});
