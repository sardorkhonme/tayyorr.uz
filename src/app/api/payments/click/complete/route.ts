import { safeNext } from "@/lib/sso";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";
import { reverseWalletTopup } from "@/lib/wallet-reversal";
import { logToGroup, siteUrl as logSiteUrl, userLabel } from "@/lib/telegram-log";
import {
  CLICK_SERVICE_ID,
  ClickError,
  clickErrorNote,
  parseClickBody,
  verifyCompleteSign,
} from "@/lib/click";

const SMM_SITE_URL = process.env.SMM_SITE_URL || "https://plus.tayyorr.uz";

function fail(code: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, error_note: clickErrorNote(code), ...extra });
}

/** Click "Complete" bosqichi — to'lov yakunlandi, balansni oshiramiz. */
export async function POST(req: Request) {
  const b = await parseClickBody(req);

  const click_trans_id = b.click_trans_id ?? "";
  const service_id = b.service_id ?? "";
  const merchant_trans_id = b.merchant_trans_id ?? "";
  const merchant_prepare_id = b.merchant_prepare_id ?? "";
  const amount = b.amount ?? "";
  const action = b.action ?? "";
  const sign_time = b.sign_time ?? "";
  const sign_string = b.sign_string ?? "";
  const incomingError = Number(b.error ?? "0");

  if (service_id !== CLICK_SERVICE_ID) {
    return fail(ClickError.BAD_REQUEST, { click_trans_id, merchant_trans_id });
  }
  if (
    !verifyCompleteSign({
      click_trans_id,
      service_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      sign_time,
      sign_string,
    })
  ) {
    await logToGroup("errors", "🚨 Click imzosi notöğri (Complete)", [
      `click_trans_id: ${click_trans_id}`,
      `service_id: ${service_id}`,
      `merchant_trans_id: ${merchant_trans_id}`,
      `merchant_prepare_id: ${merchant_prepare_id}`,
      `amount: ${amount}`,
      `action: ${action}`,
      `error: ${incomingError}`,
      `sign_time: ${sign_time}`,
      `sign_string: ${sign_string}`,
    ]);
    return fail(ClickError.SIGN_FAILED, { click_trans_id, merchant_trans_id });
  }

  const wtx = await db.walletTransaction.findUnique({ where: { id: merchant_trans_id } });
  if (!wtx || wtx.method !== "CLICK") {
    return fail(ClickError.ORDER_NOT_FOUND, { click_trans_id, merchant_trans_id });
  }

  const meta = (wtx.meta as Record<string, unknown>) ?? {};
  if (String(meta.clickPrepareId ?? "") !== merchant_prepare_id) {
    return fail(ClickError.TRANSACTION_NOT_FOUND, { click_trans_id, merchant_trans_id });
  }

  const actionNum = Number(action);
  // tayyorr+ (plus.tayyorr.uz) da boshlangan to'lov — alohida topik va SMM havolalari
  const fromSmm = meta.source === "smm";
  // yagona to'lov sahifasi (plus.tayyorr.uz/pay) qaytish manzilini yozadi — xabar o'sha platformaga olib boradi
  const returnTo = safeNext(typeof meta.returnTo === "string" ? meta.returnTo : null);
  const payTopic = fromSmm ? "smmTopups" : "payments";
  const smmTag = fromSmm ? " — tayyorr+" : "";

  // Click bekor qilish/qaytarish haqida xabar bermoqda (action=0 yoki manfiy xato kodi).
  // Bu allaqachon SUCCESS bo'lgan to'lov uchun ham kelishi mumkin — Click.uz'da
  // to'lov keyinroq bekor qilinsa, shu Complete manzilining o'ziga qayta murojaat
  // qilinadi. Avval bu holat "allaqachon to'langan" deb noto'g'ri rad etilar edi,
  // natijada hisobdan mablag' hech qachon ayirilmas edi.
  if (actionNum === 0 || incomingError < 0) {
    if (wtx.status === "SUCCESS") {
      await reverseWalletTopup(wtx, "click_webhook_cancel");
      const u = await db.user.findUnique({
        where: { id: wtx.userId },
        select: { login: true, name: true, firstName: true, lastName: true, email: true, balance: true, walletCode: true },
      });
      await logToGroup(
        payTopic,
        `⚠️ Tölov bekor qilindi (Click${smmTag})`,
        [
          `Foydalanuvçi: ${userLabel(u)}`,
          u?.email ? `Email: ${u.email}` : "",
          u?.walletCode ? `Hisob kodi: ${u.walletCode}` : "",
          `Summa: ${wtx.amount.toLocaleString("ru-RU")} söm`,
          `Yangi balans: ${u ? u.balance.toLocaleString("ru-RU") : "?"} söm`,
          `Tranzaksiya ID: ${wtx.id}`,
          `click_trans_id: ${click_trans_id}`,
          `merchant_trans_id: ${merchant_trans_id}`,
          `service_id: ${service_id}`,
          `Foydalanuvçi ID: ${wtx.userId}`,
        ].filter(Boolean),
        logSiteUrl(`/sardorxon/admin/payments/${wtx.id}`),
      );
    } else if (wtx.status === "PENDING") {
      await db.walletTransaction.update({
        where: { id: wtx.id },
        data: { status: "FAILED" },
      });
    }
    return NextResponse.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: wtx.id,
      error: ClickError.SUCCESS,
      error_note: "Success",
    });
  }

  if (wtx.status === "SUCCESS") {
    return fail(ClickError.ALREADY_PAID, {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: wtx.id,
    });
  }

  const amt = Math.round(parseFloat(amount));
  if (!Number.isFinite(amt) || amt !== wtx.amount) {
    return fail(ClickError.WRONG_AMOUNT, { click_trans_id, merchant_trans_id });
  }

  const updatedUser = await db.$transaction(async (tx) => {
    await tx.walletTransaction.update({
      where: { id: wtx.id },
      data: {
        status: "SUCCESS",
        meta: { ...meta, clickTransId: click_trans_id },
      },
    });
    return tx.user.update({
      where: { id: wtx.userId },
      data: { balance: { increment: wtx.amount } },
      select: { login: true, name: true, firstName: true, lastName: true, email: true, balance: true, walletCode: true },
    });
  });

  await logActivity(
    wtx.userId,
    "WALLET_TOPUP",
    `Hisobni Click orqali töldirdi: ${wtx.amount.toLocaleString("ru-RU")} söm`,
    { amount: wtx.amount, clickTransId: click_trans_id },
  );

  await sendTelegramToUser(wtx.userId, {
    title: "💳 Hisob töldirildi",
    body: `${wtx.amount.toLocaleString("ru-RU")} söm Click orqali hamyoningizga tuşdi.`,
    url: returnTo ?? (fromSmm ? SMM_SITE_URL : siteUrl("/wallet")),
    buttonLabel: "Tranzaksiyalarni köriş",
  });
  await logToGroup(
    payTopic,
    `💳 Hisob töldirildi (Click${smmTag})`,
    [
      `Foydalanuvçi: ${userLabel(updatedUser)}`,
      updatedUser.email ? `Email: ${updatedUser.email}` : "",
      updatedUser.walletCode ? `Hisob kodi: ${updatedUser.walletCode}` : "",
      `Summa: ${wtx.amount.toLocaleString("ru-RU")} söm`,
      `Yangi balans: ${updatedUser.balance.toLocaleString("ru-RU")} söm`,
      `Tranzaksiya ID: ${wtx.id}`,
      `click_trans_id: ${click_trans_id}`,
      `merchant_trans_id: ${merchant_trans_id}`,
      `service_id: ${service_id}`,
      `Foydalanuvçi ID: ${wtx.userId}`,
    ].filter(Boolean),
    logSiteUrl(`/sardorxon/admin/payments/${wtx.id}`),
  );

  return NextResponse.json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id: wtx.id,
    error: ClickError.SUCCESS,
    error_note: "Success",
  });
}
