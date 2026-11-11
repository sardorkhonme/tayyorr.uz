import { signInternal } from "@/lib/sso";

/**
 * Mobil ilova email kod bilan ro'yxatdan o'tganda: kod shu yerda (Brevo shu loyihada) tekshiriladi,
 * keyin ilovaga 2 daqiqalik imzolangan chipta beriladi — ilova uni app.tayyorr.uz ga beradi va
 * o'sha yerda mobil token oladi (src/app/api/mobile/auth/email). Imzo — SSO_SECRET (ikkala loyihada bir xil).
 * Format: `<userId>.<exp>.<imzo>`; app tomonida src/lib/mobile-ticket.ts bilan bir xil.
 */
export async function signMobileEmailTicket(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + 120;
  const body = `${userId}.${exp}`;
  return `${body}.${await signInternal(`mobile-email:${body}`)}`;
}
