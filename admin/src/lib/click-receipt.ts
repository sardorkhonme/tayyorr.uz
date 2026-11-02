import { checkClickPaymentStatus, getClickOfdData } from "@/lib/click-merchant-api";

export type ClickReceiptResult =
  | { ok: true; qrCodeURL: string; paymentId: string }
  | { ok: false; error: string };

/**
 * Bizning WalletTransaction uchun Click'ning rasmiy fiskal chek (OFD QR)
 * havolasini topadi. Avval holatni tekshirib to'g'ri Click payment_id'ni
 * olamiz (bazamizdagi clickTransId bilan bir xil emas), keyin o'sha ID
 * bo'yicha fiskal ma'lumotni so'raymiz.
 */
export async function fetchClickReceipt(wtx: {
  id: string;
  createdAt: Date;
}): Promise<ClickReceiptResult> {
  const statusRes = await checkClickPaymentStatus(wtx.id, wtx.createdAt);
  if (statusRes.data?.error_code !== 0) {
    return { ok: false, error: statusRes.data?.error_note || "Click holatni qaytarmadi" };
  }
  const paymentId = String(statusRes.data.payment_id ?? "");
  if (!paymentId) {
    return { ok: false, error: "Click payment_id topilmadi" };
  }

  const ofdRes = await getClickOfdData(paymentId);
  const qrCodeURL =
    typeof ofdRes.data?.qrCodeURL === "string" ? ofdRes.data.qrCodeURL : null;
  if (!qrCodeURL) {
    const note =
      typeof ofdRes.data?.error_note === "string" ? ofdRes.data.error_note : null;
    return { ok: false, error: note || "Bu to'lov uchun fiskal chek hali topilmadi" };
  }

  return { ok: true, qrCodeURL, paymentId };
}
