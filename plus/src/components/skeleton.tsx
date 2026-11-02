/** Skeleton bloklari — har bir sahifa o'z shakliga mos yig'adi (.skel — globals.css). */

export function SBar({ className = "" }: { className?: string }) {
  return <div className={`skel rounded-lg ${className}`} />;
}

export function SCircle({ className = "h-10 w-10" }: { className?: string }) {
  return <div className={`skel shrink-0 rounded-full ${className}`} />;
}

export function SBlock({ className = "" }: { className?: string }) {
  return <div className={`skel rounded-3xl ${className}`} />;
}

/** Sarlavha bloki: kichik matn + katta sarlavha + tavsif. */
export function SHeading() {
  return (
    <div className="space-y-3">
      <SBar className="h-4 w-28" />
      <SBar className="h-9 w-72 max-w-full" />
      <SBar className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Oq karta ichida skeleton (haqiqiy .card o'rnini bosadi). */
export function SCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card !rounded-3xl p-6 ${className}`}>{children}</div>;
}
