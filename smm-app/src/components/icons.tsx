/**
 * tayyorr+ ikonkalari — bitta uslub: 24×24, yumaloq uchli 1.8px chiziq.
 * Emoji o'rniga hamma joyda shu ishlatiladi.
 */
import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "rocket"
  | "package"
  | "external"
  | "logout"
  | "wallet"
  | "plus"
  | "sparkles"
  | "users"
  | "eye"
  | "heart"
  | "message"
  | "share"
  | "grid"
  | "check"
  | "close"
  | "camera"
  | "clock"
  | "user-x"
  | "arrow-right"
  | "arrow-left"
  | "hand"
  | "party"
  | "search"
  | "shield"
  | "bolt"
  | "headset"
  | "bell"
  | "send"
  | "image"
  | "download"
  | "play"
  | "pause"
  | "file"
  | "tag"
  | "refresh";

const PATHS: Record<IconName, React.ReactNode> = {
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 0 0 5.6 7.2L4 9" />
      <path d="M4 4.5V9h4.5" />
      <path d="M4 12.5a8 8 0 0 0 14.4 4.3L20 15" />
      <path d="M20 19.5V15h-4.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.1V4.9A1.4 1.4 0 0 1 4.9 3.5h7.2a1.4 1.4 0 0 1 1 .4l7 7a1.4 1.4 0 0 1 0 2l-7.2 7.2a1.4 1.4 0 0 1-2 0l-7-7a1.4 1.4 0 0 1-.4-1z" />
      <path d="M8 8h.01" strokeWidth="2.6" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10a1.5 1.5 0 0 0 1.5 1.5h3.5V15a1.5 1.5 0 0 1 1.5-1.5h0A1.5 1.5 0 0 1 13.5 15v5.5H17a1.5 1.5 0 0 0 1.5-1.5V9" />
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
  package: (
    <>
      <path d="M12 3 3.8 7.2v9.6L12 21l8.2-4.2V7.2z" />
      <path d="M3.8 7.2 12 11.4l8.2-4.2" />
      <path d="M12 11.4V21" />
      <path d="m7.9 5.1 8.2 4.2" />
    </>
  ),
  external: (
    <>
      <path d="M8 16 16 8" />
      <path d="M9.5 8H16v6.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h9" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <path d="M16 13.5h.01" strokeWidth="2.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  sparkles: (
    <>
      <path d="M11 3.5 12.6 8a2 2 0 0 0 1.4 1.4L18.5 11l-4.5 1.6a2 2 0 0 0-1.4 1.4L11 18.5 9.4 14A2 2 0 0 0 8 12.6L3.5 11 8 9.4A2 2 0 0 0 9.4 8z" />
      <path d="M18.5 3v3M17 4.5h3" />
      <path d="M19 16.5v2.5M17.75 17.75h2.5" />
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
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 8.8 5.5c1.4 0 2.5.7 3.2 1.8.7-1.1 1.8-1.8 3.2-1.8a4.3 4.3 0 0 1 4.3 4.3C19.5 15.4 12 20 12 20z" />
  ),
  message: (
    <>
      <path d="M20 11.5c0 4-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4 19.5l1.3-3.6A6.6 6.6 0 0 1 4 11.5c0-4 3.6-7 8-7s8 3 8 7z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.6" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V3.5" />
      <path d="M8 7.5 12 3.5l4 4" />
      <path d="M8.5 10.5H7A2 2 0 0 0 5 12.5v6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  camera: (
    <>
      <path d="M4 8.5A2 2 0 0 1 6 6.5h1.8l1.4-2h5.6l1.4 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  "user-x": (
    <>
      <circle cx="10" cy="8.5" r="3.5" />
      <path d="M3.5 19.5c.6-3.3 3.2-5.5 6.5-5.5 1.3 0 2.5.3 3.5.9" />
      <path d="m16.5 15.5 4 4M20.5 15.5l-4 4" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
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
  party: (
    <>
      <path d="M4 20 8.5 8l7.5 7.5z" />
      <path d="M13 6.5c.4-1.4 0-2.6-1-3.5M17.5 11c1.4-.4 2.6 0 3.5 1M15.5 4.5l.01.01M19.5 8.5l.01.01M19 3.5l.01.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 6 1.8 6H4.2S6 14 6 9.5z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
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
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 15.5-4.2-4.2a1.2 1.2 0 0 0-1.7 0L6.5 19.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  play: <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z" />,
  pause: (
    <>
      <path d="M8.5 5.5v13" />
      <path d="M15.5 5.5v13" />
    </>
  ),
  file: (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
      <path d="M13.5 3.5v5h5" />
    </>
  ),
  send: (
    <>
      <path d="M20.5 3.5 10.5 13.5" />
      <path d="M20.5 3.5 14 20.5l-3.5-7-7-3.5z" />
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
