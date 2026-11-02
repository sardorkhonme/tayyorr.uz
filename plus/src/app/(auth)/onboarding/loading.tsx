import { SBar, SBlock } from "@/components/skeleton";

export default function OnboardingLoading() {
  return (
    <main className="hero-bg grid min-h-dvh place-items-center px-5 py-10 lg:ml-[46%]">
      <div className="card w-full max-w-md space-y-5 !rounded-3xl p-8">
        <SBar className="h-7 w-48" />
        <SBar className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <SBlock key={i} className="h-14 !rounded-2xl" />
          ))}
        </div>
        <SBar className="h-14 w-full !rounded-xl" />
      </div>
    </main>
  );
}
