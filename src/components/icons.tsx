/**
 * tayyorr.uz ikonkalari — bitta uslub: 24×24, yumaloq uchli 1.8px chiziq
 * (tayyorr+ bilan bir xil). UI'da emoji o'rniga shu ishlatiladi.
 */
import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "message"
  | "messages"
  | "wallet"
  | "card"
  | "banknote"
  | "coins"
  | "user"
  | "users"
  | "sparkles"
  | "hand"
  | "gift"
  | "package"
  | "megaphone"
  | "pin"
  | "alert"
  | "chart"
  | "link"
  | "film"
  | "phone"
  | "rocket"
  | "star"
  | "thumbs-up"
  | "thumbs-down"
  | "paperclip"
  | "file"
  | "scale"
  | "check"
  | "check-circle"
  | "close"
  | "x-circle"
  | "refresh"
  | "trash"
  | "ban"
  | "pencil"
  | "sun"
  | "moon"
  | "bell"
  | "search"
  | "globe"
  | "camera"
  | "send"
  | "bot"
  | "help"
  | "download"
  | "eye"
  | "lifebuoy"
  | "play"
  | "pause"
  | "plus"
  | "arrow-up"
  | "reply"
  | "clock"
  | "headset";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10a1.5 1.5 0 0 0 1.5 1.5h3.5V15a1.5 1.5 0 0 1 1.5-1.5h0A1.5 1.5 0 0 1 13.5 15v5.5H17a1.5 1.5 0 0 0 1.5-1.5V9" />
    </>
  ),
  message: (
    <>
      <path d="M20 11.5c0 4-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4 19.5l1.3-3.6A6.6 6.6 0 0 1 4 11.5c0-4 3.6-7 8-7s8 3 8 7z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.6" />
    </>
  ),
  messages: (
    <>
      <path d="M14.5 9a2 2 0 0 1-2 2H7l-3.5 3.5V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z" />
      <path d="M17.5 8.5h1a2 2 0 0 1 2 2V21L17 17.5h-5.5a2 2 0 0 1-2-2v-1.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <path d="M16 13.5h.01" strokeWidth="2.6" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 14.5h3" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" strokeWidth="2.6" />
    </>
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M15.2 9.7a5.5 5.5 0 1 1-5.5 5.5" />
      <path d="M8 7.5h1.5v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-6 7-6s6.2 2.4 7 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5" />
      <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18 14.3c1.9.8 3.2 2.6 3.5 5.2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5 12.6 8a2 2 0 0 0 1.4 1.4L18.5 11l-4.5 1.6a2 2 0 0 0-1.4 1.4L11 18.5 9.4 14A2 2 0 0 0 8 12.6L3.5 11 8 9.4A2 2 0 0 0 9.4 8z" />
      <path d="M18.5 3v3M17 4.5h3" />
      <path d="M19 16.5v2.5M17.75 17.75h2.5" />
    </>
  ),
  hand: (
    <>
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5" />
      <path d="M14 10.5V6.5a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M8 12.5 6.6 11a1.5 1.5 0 0 0-2.2 2l3.1 4.1A6.5 6.5 0 0 0 12.7 20h.3a5 5 0 0 0 5-5v-2" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
      <path d="M12 8v12" />
      <path d="M12 8C10.5 4.5 6.5 4 6.5 6.3 6.5 8 9 8 12 8zM12 8c1.5-3.5 5.5-4 5.5-1.7C17.5 8 15 8 12 8z" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 3.8 7.2v9.6L12 21l8.2-4.2V7.2z" />
      <path d="M3.8 7.2 12 11.4l8.2-4.2" />
      <path d="M12 11.4V21" />
      <path d="m7.9 5.1 8.2 4.2" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M16.5 9a4 4 0 0 1 0 6" />
      <path d="M19 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  pin: (
    <>
      <path d="M9 3.5h6" />
      <path d="M10 3.5V9l-3 4h10l-3-4V3.5" />
      <path d="M12 13v7.5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.8h.01" strokeWidth="2.6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16.5v-5M12 16.5V6.5M17 16.5v-8" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9h17" />
      <path d="m8 4.5 2 4.5M13.5 4.5l2 4.5" />
      <path d="M10.5 12.3v4.4l3.8-2.2z" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  rocket: (
    <>
      <path d="M14.5 4.5c2.6-1.4 5-1 5-1s.4 2.4-1 5l-5.6 5.6-3-3z" />
      <path d="M9.9 11.1 7.5 10.6a1 1 0 0 0-.9.3L4.5 13l3.7 1" />
      <path d="M12.9 14.1l.5 2.4a1 1 0 0 1-.3.9L11 19.5l-1-3.7" />
      <path d="M6.5 17.5c-1.5.4-2.3 2-2.5 3 1-.2 2.6-1 3-2.5" />
      <circle cx="15.8" cy="8.2" r="1.3" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  "thumbs-up": (
    <>
      <path d="M7.5 10.5V20" />
      <path d="M7.5 10.5 11 3.8a1.9 1.9 0 0 1 3.5 1.3L13.8 9H19a2 2 0 0 1 2 2.4l-1.3 6.6a2.5 2.5 0 0 1-2.4 2H4.5a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1z" />
    </>
  ),
  "thumbs-down": (
    <>
      <path d="M7.5 13.5V4" />
      <path d="M7.5 13.5 11 20.2a1.9 1.9 0 0 0 3.5-1.3L13.8 15H19a2 2 0 0 0 2-2.4l-1.3-6.6a2.5 2.5 0 0 0-2.4-2H4.5a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1z" />
    </>
  ),
  paperclip: (
    <path d="M20 11.5 12.2 19.3a4.8 4.8 0 0 1-6.8-6.8l8-8a3.2 3.2 0 0 1 4.5 4.5l-8 8a1.6 1.6 0 0 1-2.3-2.3l7.3-7.3" />
  ),
  file: (
    <>
      <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3.5v17" />
      <path d="M8 20.5h8" />
      <path d="M4.5 7h15" />
      <path d="M4.5 7 2 13.5a2.5 2.5 0 0 0 5 0zM19.5 7 17 13.5a2.5 2.5 0 0 0 5 0z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1" />
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1" />
      <path d="M17.5 3.5V7H14" />
      <path d="M6.5 20.5V17H10" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="m6.5 7 .8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  pencil: (
    <>
      <path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="m13.5 6.5 3 3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A2 2 0 0 1 6 6.5h1.8l1.4-2h5.6l1.4 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  send: (
    <>
      <path d="M20.5 3.5 10.5 13.5" />
      <path d="M20.5 3.5 14 20.5l-3.5-7-7-3.5z" />
    </>
  ),
  bot: (
    <>
      <rect x="4.5" y="8" width="15" height="11" rx="3" />
      <path d="M12 5v3" />
      <circle cx="12" cy="4" r="1" />
      <path d="M9.5 13h.01M14.5 13h.01" strokeWidth="2.6" />
      <path d="M2.5 12.5v2.5M21.5 12.5v2.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3" />
      <path d="M12 16.8h.01" strokeWidth="2.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m6 6 3.5 3.5M14.5 14.5 18 18M18 6l-3.5 3.5M9.5 14.5 6 18" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  plus: <path d="M12 5v14M5 12h14" />,
  "arrow-up": (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  reply: (
    <>
      <path d="M9.5 14.5 4.5 9.5l5-5" />
      <path d="M4.5 9.5H14a5.5 5.5 0 0 1 5.5 5.5v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  headset: (
    <>
      <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
      <rect x="3.5" y="13" width="4" height="6" rx="1.8" />
      <rect x="16.5" y="13" width="4" height="6" rx="1.8" />
      <path d="M18.5 19v.5a2 2 0 0 1-2 2H13" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8,
  ...rest
}: { name: IconName; className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Star (ichki valyuta) belgisi — "⭐" o'rniga: to'ldirilgan sariq yulduzcha. */
export function StarIcon({
  className = "h-4 w-4",
  empty = false,
}: {
  className?: string;
  /** reytingda bo'sh yulduzcha uchun */
  empty?: boolean;
}) {
  return (
    <Icon
      name="star"
      className={`inline-block shrink-0 align-[-0.15em] ${empty ? "text-zinc-600" : "text-amber-400"} ${className}`}
      fill={empty ? "none" : "currentColor"}
      strokeWidth={1.5}
    />
  );
}

export function BlockedIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}

export function EyeIcon({
  off = false,
  className = "h-4 w-4",
}: {
  off?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function RocketIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function TelegramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.94 4.9 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.78 8.7-7.86c.38-.34-.08-.53-.59-.19l-10.75 6.77-4.63-1.45c-1.01-.31-1.03-1 .21-1.48l18.1-6.98c.84-.31 1.57.19 1.3 1.48Z" />
    </svg>
  );
}

export function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Quvvat (hisobdan chiqish) — "⏻" belgisi ko'p telefon shriftlarida yo'q, shuning uchun SVG. */
export function PowerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 3v9" />
      <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
    </svg>
  );
}

/** Hisobdan chiqish — eshik va strelka (tayyorr+ dagi bilan bir xil). */
export function LogoutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h9" />
    </svg>
  );
}

/** Mikrofon — ovozli xabar. */
export function MicIcon({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
