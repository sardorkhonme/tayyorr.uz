/**
 * Kartaga yechish komissiyasi — foydalanuvchiga ogohlantirish sifatida ko'rsatiladi:
 * so'ralgan summa hamyondan yechiladi, admin kartaga 95% ni o'tkazadi.
 * tayyorr+ va mobil ilovada ham shu qiymat (smm/src/lib/payout.ts, wallet_screen.dart).
 */
export const PAYOUT_COMMISSION_PERCENT = 5;

export function payoutNet(amount: number) {
  const commission = Math.ceil((amount * PAYOUT_COMMISSION_PERCENT) / 100);
  return { commission, net: amount - commission };
}
