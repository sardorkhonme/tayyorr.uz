import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-[#08080d] px-6 text-center text-zinc-100">
      <div
        aria-hidden
        className="blob"
        style={{
          top: "-8rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "32rem",
          height: "32rem",
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          opacity: 0.25,
        }}
      />
      <span className="relative text-[7rem] font-bold leading-none text-white/10">
        404
      </span>
      <h1 className="relative -mt-6 text-2xl font-semibold">
        Sahifa topilmadi
      </h1>
      <p className="relative max-w-sm text-sm text-zinc-500">
        Manzil notöğri yoki sahifa köçirilgan bölişi mumkin.
      </p>
      <Link href="/" className="btn-primary relative mt-2">
        Boş sahifa
      </Link>
    </main>
  );
}
