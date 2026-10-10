import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRestriction } from "@/lib/restriction";
import { RestrictionNotice } from "@/components/restriction-notice";
import { ProfileForm } from "@/components/profile-form";
import { AccountForm } from "@/components/account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getVersionLabel } from "@/lib/app-version";

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

  return (
    <div className="mx-auto max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">
        Profil
      </h1>
      <p className="mb-5 text-sm text-zinc-500">
        @{user.login} ·{" "}
        {user.role === "PREPARER" ? "Tayyorlovchi" : "Buyurtma beruvchi"}
        {user.email ? ` · ${user.email}` : ""}
      </p>
      <ProfileForm
        initial={{
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          about: user.about ?? "",
          avatarUrl: user.avatarUrl ?? "",
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
        }}
      />

      <div className="mt-4">
        <AccountForm initial={{ login: user.login ?? "" }} />
      </div>
      <p className="mt-2 text-center text-xs text-zinc-600">tayyorr.uz {versionLabel}</p>

      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="mb-3 text-sm text-zinc-500">
          Hisobdan chiqsangiz, qayta kirish uchun login/parol yoki Google kerak bo'ladi.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
