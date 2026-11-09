import { redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { normalizeEmail } from "@/lib/email-otp";

import { OtpForm } from "../../auth-forms";
import { AuthShell } from "../../auth-shell";

export const metadata = { title: "Kodni kiritiş" };

/** Ro'yxatdan o'tish (2-sahifa): emailga yuborilgan 4 xonali kod. */
export default async function RegisterCodePage({ searchParams }: { searchParams: Promise<{ email?: string; code?: string }> }) {
  if (await currentUser()) redirect("/");
  const sp = await searchParams;
  const email = normalizeEmail(sp.email ?? "");
  const prefill = /^\d{4}$/.test(sp.code ?? "") ? sp.code! : "";
  if (!email) redirect("/register");
  return (
    <AuthShell mode="register">
      <OtpForm email={email} prefill={prefill} />
    </AuthShell>
  );
}
