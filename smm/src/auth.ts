import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";

/**
 * smm.tayyorr.uz — alohida sessiya, lekin foydalanuvchilar tayyorr.uz bazasidan.
 * Bu yerda yangi hisob yaratilmaydi: ro'yxatdan o'tish faqat tayyorr.uz da.
 */

class NoAccount extends CredentialsSignin {
  code = "no_account";
}

const credentialsSchema = z.object({
  // login yoki email
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
});

async function logLogin(userId: string, how: string) {
  await db.activityLog
    .create({ data: { userId, action: "AUTH_LOGIN", summary: `TayyorrSMM ga ${how} bilan kirdi` } })
    .catch(() => {});
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        identifier: { label: "Login yoki email", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;

        const user = identifier.includes("@")
          ? await db.user.findUnique({ where: { email: identifier.toLowerCase() } })
          : await db.user.findUnique({ where: { login: identifier } });
        if (!user) throw new NoAccount();
        if (!user.passwordHash) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        await logLogin(user.id, "login/parol");
        return { id: user.id };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified === false) return "/login?error=no_account";
      const dbUser = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (!dbUser) return "/login?error=no_account";
      await logLogin(dbUser.id, "Google");
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        // Google `sub` emas, tayyorr.uz dagi user id ishlatiladi
        const dbUser = await db.user.findUnique({
          where: { email: profile.email.toLowerCase() },
          select: { id: true },
        });
        token.sub = dbUser?.id;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Joriy foydalanuvchi (bazadan yangi holatda) yoki null. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      login: true,
      email: true,
      avatarUrl: true,
      image: true,
      balance: true,
      walletCode: true,
      bannedUntil: true,
    },
  });
}
