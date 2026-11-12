import { currentUser } from "@/lib/session";
import { DesktopRedirect } from "@/components/desktop-redirect";
import { SupportChat } from "@/components/support-chat";

export const metadata = { title: "Support" };

/** Support — telefon va planşet uçun butun ekran (kompyuterda popup işlatiladi). */
export default async function SupportPage() {
  const user = await currentUser();
  return (
    // telefon/planşet — butun ekran (header va pastki panel yaşiriladi, çatda yopiş tugmasi bor)
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] pb-[env(safe-area-inset-bottom)]">
      <DesktopRedirect />
      <SupportChat loggedIn={!!user} closable className="min-h-0 flex-1" />
    </div>
  );
}
