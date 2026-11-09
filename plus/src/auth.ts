import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { TERMS_VERSION } from "@/lib/register";
import { normalizeEmail, verifyOtp } from "@/lib/email-otp";

/**
 * plus.tayyorr.uz — alohida sessiya, lekin foydalanuvchilar tayyorr.uz bazasidan
 * (bitta hisob, bitta hamyon). Ro'yxatdan o'tish tayyorr.uz dagidek faqat Google
 * orqali — yangi User umumiy bazaga yoziladi, profil /onboarding da to'ldiriladi.
 */

class NoAccount extends CredentialsSignin {
  code = "no_account";
}
class OtpBad extends CredentialsSignin {
  code = "bad_code";
}
class OtpExpired extends CredentialsSignin {
  code = "expired";
}
class OtpTooMany extends CredentialsSignin {
  code = "too_many";
}

const credentialsSchema = z.object({
  // login yoki email
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
});

async function logLogin(userId: string, how: string) {
  await db.activityLog
    .create({ data: { userId, action: "AUTH_LOGIN", summary: `tayyorr+ ga ${how} bilan kirdi` } })
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
    // tayyorr.uz mobil ilovasi tayyorr+ ni WebView'da ochganda — bir martalik kalit bilan kirish
    // (kalitni tayyorr.uz beradi: src/app/api/mobile/plus-ticket)
    Credentials({
      id: "app-ticket",
      credentials: { ticket: { type: "text" } },
      async authorize(raw) {
        const ticket = typeof raw?.ticket === "string" ? raw.ticket : "";
        if (ticket.length < 20) return null;
        const row = await db.verificationToken.findUnique({ where: { token: ticket } });
        // "plus-app:" — mobil ilova, "plus-admin:" — admin tekshirish uchun kirdi (admin/.../impersonate)
        const fromAdmin = !!row?.identifier.startsWith("plus-admin:");
        if (!row || (!row.identifier.startsWith("plus-app:") && !fromAdmin)) return null;
        // bir martalik: o'chirilmasa (boshqa so'rov ishlatgan bo'lsa) — rad
        const del = await db.verificationToken.deleteMany({ where: { token: ticket } });
        if (del.count !== 1 || row.expires < new Date()) return null;
        const userId = row.identifier.slice(row.identifier.indexOf(":") + 1);
        const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) return null;
        await logLogin(user.id, fromAdmin ? "admin tekshiruvi (admin paneldan)" : "mobil ilova");
        return { id: user.id };
      },
    }),
    // email + 4 xonali kod: yangi email — hisob ochiladi (profil /onboarding da), bori — kiradi
    Credentials({
      id: "email-otp",
      credentials: { email: { type: "text" }, code: { type: "text" } },
      async authorize(raw) {
        const email = normalizeEmail(typeof raw?.email === "string" ? raw.email : "");
        const code = typeof raw?.code === "string" ? raw.code.replace(/\D/g, "") : "";
        if (!email || code.length !== 4) throw new OtpBad();
        const v = await verifyOtp(email, code);
        if (!v.ok) throw v.reason === "expired" ? new OtpExpired() : v.reason === "too_many" ? new OtpTooMany() : new OtpBad();

        let user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
        if (user) {
          if (!user.emailVerified) await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
          await logLogin(user.id, "email kod");
        } else {
          user = await db.user
            .create({
              data: {
                email,
                emailVerified: new Date(),
                signupMethod: "EMAIL",
                termsAcceptedAt: new Date(),
                termsVersion: TERMS_VERSION,
              },
              select: { id: true, emailVerified: true },
            })
            // parallel so'rovda allaqachon yaratilgan bo'lishi mumkin
            .catch(() => db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } }));
          if (!user) return null;
        }
        return { id: user.id };
      },
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
      if (!profile || !email || profile.email_verified === false) return "/login?error=google";
      const dbUser = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (dbUser) {
        await logLogin(dbUser.id, "Google");
        return true;
      }
      // yangi foydalanuvchi — Google orqali ro'yxatdan o'tish
      const firstName = typeof profile.given_name === "string" ? profile.given_name : null;
      const lastName = typeof profile.family_name === "string" ? profile.family_name : null;
      // yangi foydalanuvchi — profil (login, ism, rasm...) /onboarding da to'ldiriladi,
      // ro'yxatdan o'tish logi o'shanda yoziladi
      await db.user
        .create({
          data: {
            email,
            emailVerified: new Date(),
            name: typeof profile.name === "string" ? profile.name : firstName,
            firstName,
            lastName,
            image: typeof profile.picture === "string" ? profile.picture : null,
            signupMethod: "GOOGLE",
            termsAcceptedAt: new Date(),
            termsVersion: TERMS_VERSION,
          },
        })
        .catch(() => null); // parallel so'rovda allaqachon yaratilgan bo'lishi mumkin
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
