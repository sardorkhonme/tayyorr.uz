/** Platformalarning soddalashtirilgan belgilari (oq chiziqli). */
export function PlatformIcon({ platform, className = "h-6 w-6" }: { platform: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (platform) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common}>
          <path d="M21 4 3 11.2l6.4 2.3L18 7.5l-6.6 7.2 6.1 4.8z" />
          <path d="m9.4 13.5.6 5.5 2.6-3.6" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="m10 9.2 5 2.8-5 2.8z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.4 2.6 2.2 4.4 5 4.6" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M15 3.5h-2.2A3.3 3.3 0 0 0 9.5 6.8V21" />
          <path d="M6.5 10.5h8" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common}>
          <path d="M4 4l16 16M20 4 4 20" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
