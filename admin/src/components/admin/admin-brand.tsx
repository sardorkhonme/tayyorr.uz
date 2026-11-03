/** Admin panel logosi: T belgisi + "Tayyorr.uz" + kichik "admin" yorlig'i. */
export function AdminBrand({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" className={`${lg ? "h-10 w-10" : "h-8 w-8"} shrink-0 object-contain`} />
      <span className={`font-display font-bold tracking-tight text-white ${lg ? "text-2xl" : "text-lg"}`}>
        Tayyorr<span className="text-indigo-400">.uz</span>
      </span>
      <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
        admin
      </span>
    </span>
  );
}
