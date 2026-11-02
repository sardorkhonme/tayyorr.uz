import { shortDate } from "@/lib/date";

const ONLINE_MS = 2 * 60 * 1000;

export function presenceText(lastSeenAt: Date | string | null | undefined): {
  online: boolean;
  text: string;
} {
  if (!lastSeenAt) return { online: false, text: "oflayn" };
  const d = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  const diff = Date.now() - d.getTime();
  if (diff < ONLINE_MS) return { online: true, text: "onlayn" };

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { online: false, text: `${mins} daq oldin onlayn` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { online: false, text: `${hrs} soat oldin onlayn` };
  const days = Math.floor(hrs / 24);
  if (days < 7) return { online: false, text: `${days} kun oldin onlayn` };
  return { online: false, text: `oxirgi: ${shortDate(d)}` };
}
