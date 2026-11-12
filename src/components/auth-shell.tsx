import { AuroraBackground } from "@/components/aurora-background";
import { ForceDark } from "@/components/force-dark";
import { Logo } from "@/components/logo";
import { LANDING_URL } from "@/lib/site";
import { WebOnboarding } from "@/components/web-onboarding";

export function AuthShell({
  children,
  width = "max-w-md",
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <ForceDark />
      {/* telefon/planşetda birinçi tashrif — 3 ta tanişuv sahifasi (login/register da) */}
      <WebOnboarding />
      <AuroraBackground />
      <a href={LANDING_URL} className="mb-8">
        <Logo className="text-3xl sm:text-4xl" markClassName="h-11 sm:h-12" />
      </a>
      <div className={`w-full ${width} animate-rise`}>{children}</div>
    </main>
  );
}
