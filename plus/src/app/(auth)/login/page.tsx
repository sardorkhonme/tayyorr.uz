import { redirect } from "next/navigation";

import { currentUser } from "@/auth";

import { LoginForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Kiriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // sessiya cookie'si qolgan, lekin hisob o'chirilgan bo'lsa — forma ochiladi
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthShell mode="login">
      <LoginForm initialError={error ? "Kirişda xatolik yuz berdi, qayta urinib köring" : undefined} />
    </AuthShell>
  );
}
