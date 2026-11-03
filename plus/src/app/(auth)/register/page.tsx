import { redirect } from "next/navigation";

import { currentUser } from "@/auth";

import { RegisterForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Röyxatdan ötiş" };

export default async function RegisterPage() {
  // sessiya cookie'si qolgan, lekin hisob o'chirilgan bo'lsa — forma ochiladi
  if (await currentUser()) redirect("/");
  return (
    <AuthShell mode="register">
      <RegisterForm />
    </AuthShell>
  );
}
