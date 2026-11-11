import { verifyInternal } from "@/lib/sso";

/** tayyorr+ bergan email-kod chiptasini tekshiradi (plus/src/lib/mobile-ticket.ts) — to'g'ri bo'lsa userId. */
export async function verifyMobileEmailTicket(ticket: string): Promise<string | null> {
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  return (await verifyInternal(`mobile-email:${userId}.${expRaw}`, sig)) ? userId : null;
}
