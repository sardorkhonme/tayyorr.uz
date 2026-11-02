import { currentUser } from "@/auth";
import { SupportChat } from "@/components/support-chat";

export const metadata = { title: "Support" };

/** Support — telefonda butun ekran, kompyuterda kartada. */
export default async function SupportPage() {
  const user = await currentUser();
  return (
    <div className="-mx-4 -mb-24 -mt-6 sm:mx-0 sm:mb-0 sm:mt-0">
      <SupportChat
        loggedIn={!!user}
        className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-8rem)] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-xl lg:h-[calc(100dvh-5rem)]"
      />
    </div>
  );
}
