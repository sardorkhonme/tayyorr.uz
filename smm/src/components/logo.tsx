/** tayyorr+ matnli logotipi. */
export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`select-none font-display font-bold tracking-tight text-white ${className}`}>
      tayyorr
      <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">+</span>
    </span>
  );
}
