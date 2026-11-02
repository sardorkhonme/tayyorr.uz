"use client";

/**
 * "Hamyonni to'ldirish" — yagona to'lov sahifasini (plus.tayyorr.uz/pay) ochadi.
 * To'lovdan keyin foydalanuvchi shu sahifaga qaytadi (?return=).
 */
const PAY_URL = "/pay";

export function TopupButton({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={() => {
        const url = new URL(PAY_URL, window.location.origin);
        url.searchParams.set("return", window.location.href);
        window.location.href = url.toString();
      }}
    >
      {children}
    </button>
  );
}
