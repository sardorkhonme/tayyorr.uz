import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import {
  checkClickPaymentStatus,
  reverseClickPayment,
  clickMerchantApiConfigured,
} from "@/lib/click-merchant-api";
import { reverseWalletTopup } from "@/lib/wallet-reversal";

const ALREADY_CANCELLED_HINTS = ["аннулирован", "cancel", "отмен"];

function looksAlreadyCancelled(note: unknown): boolean {
  if (typeof note !== "string") return false;
  const low = note.toLowerCase();
  return ALREADY_CANCELLED_HINTS.some((h) => low.includes(h));
}

/**
 * Click orqali to'langan summani haqiqatan ham kartaga qaytaradi (Click
 * Merchant API — "To'lovni bekor qilish"), muvaffaqiyatli bo'lsa bizning
 * ichki hisobimizni ham (hamyon balansi) mos ravishda to'g'irlaydi.
 *
 * Avval Click'dan holatni so'raymiz — chunki "qaytarish" so'rovi uchun
 * kerak bo'ladigan payment_id bizning bazamizda saqlangan clickTransId
 * (Billing ID) bilan bir xil emas, u status javobidan olinadi (Click ID).
 * Agar Click'da bu to'lov allaqachon bekor qilingan bo'lsa (masalan
 * foydalanuvchi/bank tomonidan) — qayta "reversal" so'ramasdan, faqat
 * bizning ichki hisobimizni to'g'irlaymiz.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  if (!clickMerchantApiConfigured()) {
    return NextResponse.json(
      { error: "Click Merchant API sozlanmagan (CLICK_MERCHANT_USER_ID yo'q)" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const wtx = await db.walletTransaction.findUnique({ where: { id } });
  if (!wtx || wtx.method !== "CLICK") {
    return NextResponse.json({ error: "Click tranzaksiyasi emas" }, { status: 400 });
  }
  if (wtx.status !== "SUCCESS" || wtx.reversedAt) {
    return NextResponse.json(
      { error: "Faqat muvaffaqiyatli va hali bekor qilinmagan to'lovni qaytarish mumkin" },
      { status: 400 },
    );
  }

  const statusRes = await checkClickPaymentStatus(wtx.id, wtx.createdAt);
  if (statusRes.data?.error_code !== 0) {
    return NextResponse.json(
      { error: statusRes.data?.error_note || "Click holatni qaytarmadi" },
      { status: 400 },
    );
  }
  const paymentId = String(statusRes.data.payment_id ?? "");
  if (!paymentId) {
    return NextResponse.json({ error: "Click payment_id topilmadi" }, { status: 400 });
  }

  // allaqachon Click tomonida bekor qilingan bo'lsa — qayta so'ramaymiz
  if (!looksAlreadyCancelled(statusRes.data.error_note)) {
    const revRes = await reverseClickPayment(paymentId);
    if (revRes.data?.error_code !== 0 && !looksAlreadyCancelled(revRes.data?.error_note)) {
      return NextResponse.json(
        { error: revRes.data?.error_note || "Click to'lovni qaytarishni rad etdi" },
        { status: 400 },
      );
    }
  }

  await reverseWalletTopup(wtx, "admin_click_reversal");
  return NextResponse.json({ ok: true, clickStatus: statusRes.data });
}
