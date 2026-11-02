/** tayyorr+ matnli logotipi. */
export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`select-none font-display font-bold tracking-tight text-zinc-900 ${className}`}>
      tayyorr
      <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">+</span>
    </span>
  );
}
