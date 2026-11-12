import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRestriction } from "@/lib/restriction";
import { getSupportUserId } from "@/lib/support";
import { RestrictionNotice } from "@/components/restriction-notice";
import { ProfileForm } from "@/components/profile-form";
import { AccountForm } from "@/components/account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSegmented } from "@/components/theme-toggle";
import { HeaderSetter, type HeaderAction } from "@/components/page-header";
import { getVersionLabel } from "@/lib/app-version";

/** Support suhbati — bo'lsa to'g'ridan-to'g'ri o'sha chat, bo'lmasa xabarlar ro'yxati (support tepada). */
async function supportHref(userId: string): Promise<string> {
  try {
    const supportId = await getSupportUserId();
    const conv = await db.conversation.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: supportId },
          { userAId: supportId, userBId: userId },
        ],
      },
      select: { id: true },
    });
    return conv ? `/messages/${conv.id}` : "/messages";
  } catch {
    return "/messages";
  }
}

export default async function ProfilePage() {
  const session = await auth();
  const restriction = await getRestriction(session!.user.id);
  if (restriction) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <RestrictionNotice restriction={restriction} />
        <SignOutButton />
      </div>
    );
  }
  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: {
      firstName: true,
      lastName: true,
      login: true,
      email: true,
      role: true,
      about: true,
      avatarUrl: true,
      birthDate: true,
    },
  });
  if (!user) return null;
  const versionLabel = await getVersionLabel();
  const isPreparer = user.role === "PREPARER";

  // header ikonkalari: tayyorlovchi — Qöllanma + Referal; buyurtmachi — Qöllanma + Yordam
  const actions: HeaderAction[] = [
    { key: "guide", icon: "help", label: "Qöllanma", href: "/guide" },
    isPreparer
      ? { key: "referral", icon: "gift", label: "Referal", href: "/referral" }
      : {
          key: "support",
          icon: "headset",
          label: "Yordam",
          href: await supportHref(session!.user.id),
        },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <HeaderSetter title="Profil" actions={actions} />

      <div className="px-1">
        {/* kompyuterda sarlavha yuqori panelda turadi */}
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white lg:hidden">
          Profil
        </h1>
        <p className="truncate text-sm text-zinc-500">
          @{user.login} · {isPreparer ? "Tayyorlovçi" : "Buyurtma beruvçi"}
          {user.email ? ` · ${user.email}` : ""}
        </p>
      </div>

      <section className="card flex flex-col gap-3">
        <div>
          <h2 className="font-semibold text-white">Köriniş</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Yoruğ yoki qoronği mavzu — barça qurilmalaringizda saqlanadi.
          </p>
        </div>
        <ThemeSegmented />
      </section>

      <ProfileForm
        initial={{
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          about: user.about ?? "",
          avatarUrl: user.avatarUrl ?? "",
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
        }}
      />

      <AccountForm initial={{ login: user.login ?? "" }} />

      <section className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Hisobdan çiqsangiz, qayta kiriş uçun login/parol yoki Google kerak böladi.
        </p>
        <SignOutButton />
      </section>

      <p className="text-center text-xs text-zinc-600">tayyorr.uz {versionLabel}</p>
    </div>
  );
}
