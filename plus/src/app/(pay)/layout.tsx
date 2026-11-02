/** Yagona to'lov sahifasi — menyu va ortiqcha ma'lumotlarsiz, faqat to'lov. */
export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-100/70 to-transparent" />
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  );
}
