import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

import { AuthShell } from "../auth-shell";
import { ProfileWizard } from "../profile-wizard";

export const metadata = { title: "Profilni to'ldirish" };

/** Google orqali kirgan, profili to'liq bo'lmagan hisob — ro'yxatdan o'tishni yakunlash. */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { login: true, firstName: true, lastName: true, name: true, image: true, avatarUrl: true, passwordHash: true },
  });
  if (!u) redirect("/login");
  if (u.login) redirect("/");

  const [first, ...rest] = (u.name ?? "").trim().split(/\s+/);
  return (
    <AuthShell mode="none">
      <h1 className="font-display text-2xl font-bold text-zinc-900">Deyarli tayyor!</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">Ro&apos;yxatdan o&apos;tishni yakunlash uchun bir necha savol.</p>
      <ProfileWizard
        mode="complete"
        needsPassword={!u.passwordHash}
        initial={{
          firstName: u.firstName ?? first ?? "",
          lastName: u.lastName ?? rest.join(" "),
          avatar: u.avatarUrl ?? u.image,
        }}
      />
    </AuthShell>
  );
}
