import { currentUser } from "@/lib/session";
import { DesktopRedirect } from "@/components/desktop-redirect";
import { SupportChat } from "@/components/support-chat";

export const metadata = { title: "Support" };

/** Support — telefon va planshet uchun butun ekran (kompyuterda popup ishlatiladi). */
export default async function SupportPage() {
  const user = await currentUser();
  return (
    <div className="-mx-4 -mt-8 sm:mx-0 sm:mt-0">
      <DesktopRedirect />
      <SupportChat
        loggedIn={!!user}
        closable
        className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-8rem)] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-xl"
      />
    </div>
  );
}
