/**
 * Click orqali hamyonni to'ldirish — tayyorr.uz bilan bir xil Click xizmati.
 * Prepare/Complete webhook'lari tayyorr.uz ga keladi va umumiy bazadagi
 * PENDING tranzaksiyani id bo'yicha topadi — shuning uchun bu yerda faqat
 * tranzaksiya yaratiladi va to'lov havolasi quriladi.
 */

export const CLICK_MIN = 1_000;
export const CLICK_MAX = 10_000_000;

export function clickConfigured() {
  return !!(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID);
}

export function buildClickPayUrl(opts: { amount: number; transactionParam: string; returnUrl: string }) {
  const params = new URLSearchParams({
    service_id: process.env.CLICK_SERVICE_ID || "",
    merchant_id: process.env.CLICK_MERCHANT_ID || "",
    amount: String(opts.amount),
    transaction_param: opts.transactionParam,
    return_url: opts.returnUrl,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}
