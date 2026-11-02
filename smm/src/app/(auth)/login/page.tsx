import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { LoginForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user?.id) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthShell mode="login">
      <LoginForm initialError={error ? "Kirishda xatolik yuz berdi, qayta urinib ko'ring" : undefined} />
    </AuthShell>
  );
}
