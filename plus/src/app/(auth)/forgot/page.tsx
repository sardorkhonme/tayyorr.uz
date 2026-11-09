import { ForgotForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Parolni tiklaş" };

export default function ForgotPage() {
  return (
    <AuthShell mode="none">
      <ForgotForm />
    </AuthShell>
  );
}
