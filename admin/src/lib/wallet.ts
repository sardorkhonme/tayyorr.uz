import { db } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilar yo'q

function randomCode() {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `TYR-${s}`;
}

/** Foydalanuvchida walletCode bo'lmasa yaratadi va qaytaradi. */
export async function ensureWalletCode(userId: string): Promise<string> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { walletCode: true },
  });
  if (u?.walletCode) return u.walletCode;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { walletCode: code },
        select: { walletCode: true },
      });
      return updated.walletCode!;
    } catch {
      // unique to'qnashuvi — qayta urinamiz
    }
  }
  throw new Error("Wallet kodi yaratilmadi");
}

export function formatSom(value: number) {
  const grouped = value.toLocaleString("ru-RU").replace(/\s/g, " ");
  return `${grouped} so'm`;
}

/** "8600123456789012" -> "8600 **** **** 9012" */
export function maskCard(digitsOnly: string) {
  if (digitsOnly.length < 8) return "**** **** **** ****";
  return `${digitsOnly.slice(0, 4)} **** **** ${digitsOnly.slice(-4)}`;
}

/** Sodda Luhn tekshiruvi (demo). */
export function luhnValid(digitsOnly: string) {
  if (!/^\d{16}$/.test(digitsOnly)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let d = Number(digitsOnly[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
