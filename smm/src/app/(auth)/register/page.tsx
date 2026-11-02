import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { RegisterForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Ro'yxatdan o'tish" };

export default async function RegisterPage() {
  if ((await auth())?.user?.id) redirect("/");
  return (
    <AuthShell mode="register">
      <RegisterForm />
    </AuthShell>
  );
}
