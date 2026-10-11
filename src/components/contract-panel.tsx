"use client";

import { useState } from "react";

import { shortDateTime } from "@/lib/date";
import type { ContractView } from "@/lib/contract-view";

/** ISO -> <input type="datetime-local"> qiymati (brauzer vaqti bilan). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

type Form = null | "cancel" | "reject" | "revision";

/**
 * Imzolangan shartnoma paneli (ikkala tomonga): muddat, topshirish,
 * yakunlash / qayta ishlash va ikki tomonlama bekor qilish so'rovi.
 */
export function ContractPanel({
  orderId,
  status,
  contract: c,
  meId,
  isOrderer,
  busy,
  call,
}: {
  orderId: string;
  status: string;
  contract: ContractView;
  meId: string;
  isOrderer: boolean;
  busy: boolean;
  call: (url: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [form, setForm] = useState<Form>(null);
  const [reason, setReason] = useState("");
  const [deadline, setDeadline] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const delivered = status === "DELIVERED";
  const pending = c.cancelState === "PENDING";
  const disputed = c.cancelState === "DISPUTED";
  const iRequested = pending && c.cancelRequestedById === meId;
  const otherRequested = pending && !iRequested;
  const requester = c.cancelRequestedById
    ? c.cancelRequestedById === meId
      ? "Siz"
      : isOrderer
        ? "Tayyorlovchi"
        : "Buyurtmachi"
    : "";

  function open(f: Form) {
    setLocalErr(null);
    setReason("");
    if (f === "revision") {
      const cur = c.deadline && new Date(c.deadline).getTime() > Date.now() + 3600_000 ? c.deadline : null;
      setDeadline(toLocalInput(cur ?? new Date(Date.now() + 2 * 86400_000).toISOString()));
    }
    setForm(form === f ? null : f);
  }

  async function submit() {
    if (reason.trim().length < 5) {
      setLocalErr("Sababni yozing (kamida 5 belgi)");
      return;
    }
    let ok = false;
    if (form === "cancel") {
      ok = await call(`/api/contracts/${c.id}`, "POST", { action: "REQUEST_CANCEL", reason: reason.trim() });
    } else if (form === "reject") {
      ok = await call(`/api/contracts/${c.id}`, "POST", { action: "REJECT_CANCEL", reason: reason.trim() });
    } else if (form === "revision") {
      const iso = localInputToIso(deadline);
      if (!iso) {
        setLocalErr("Yangi muddatni (sana va vaqt) tanlang");
        return;
      }
      ok = await call(`/api/orders/${orderId}/revision`, "POST", { reason: reason.trim(), deadline: iso });
    }
    if (ok) setForm(null);
  }

  return (
    <div className="card flex flex-col gap-3 border-emerald-400/25 bg-emerald-500/5">
      <div>
        <h2 className="font-semibold text-white">📄 Shartnoma imzolangan</h2>
        <p className="mt-1 text-sm text-zinc-300">
          Summa: <b>{c.amount.toLocaleString()} so'm</b>
          {isOrderer ? " · tayyorlovchi: " + c.preparerName : ""}
        </p>
        {c.deadline && (
          <p className="mt-0.5 text-sm text-zinc-400">
            Topshirish muddati: <b className="text-zinc-200">{shortDateTime(c.deadline)}</b>
            {c.revisionCount > 0 && ` · qayta ishlash: ${c.revisionCount} marta`}
          </p>
        )}
        {delivered && c.reviewDueAt && (
          <p className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
            📦 Ish topshirilgan{c.deliveredAt ? ` (${shortDateTime(c.deliveredAt)})` : ""}.{" "}
            {isOrderer ? "Tekshirib javob bering" : "Buyurtmachi tekshirmoqda"} —{" "}
            <b className="text-zinc-200">{shortDateTime(c.reviewDueAt)}</b> gacha javob bo'lmasa, ish
            muvaffaqiyatli deb topiladi va pul tayyorlovchiga o'tadi.
          </p>
        )}
        {!delivered && !c.cancelState && (
          <p className="mt-2 text-xs text-zinc-500">
            Muddat tugaguncha ish topshirilmasa, shartnoma bekor bo'ladi va pul buyurtmachiga qaytadi.
          </p>
        )}
      </div>

      {/* bekor qilish so'rovi */}
      {pending && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
          <div className="font-medium text-amber-200">
            ⚠️ {requester} bekor qilishni so'ra{requester === "Siz" ? "dingiz" : "di"}
          </div>
          <div className="mt-1 text-zinc-300">Sabab: {c.cancelReason}</div>
          {c.cancelDueAt && (
            <div className="mt-1 text-xs text-zinc-400">
              {iRequested ? "Ikkinchi tomon" : "Siz"} {shortDateTime(c.cancelDueAt)} gacha javob{" "}
              {iRequested ? "beradi" : "bering"}. Javob bo'lmasa — rozi deb hisoblanadi va pul buyurtmachiga
              qaytariladi.
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {otherRequested && (
              <>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Shartnoma bekor qilinadi va ${c.amount.toLocaleString()} so'm buyurtmachiga qaytariladi. Rozimisiz?`,
                      )
                    ) {
                      call(`/api/contracts/${c.id}`, "POST", { action: "APPROVE_CANCEL" });
                    }
                  }}
                >
                  Roziman — bekor qilinsin
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => open("reject")}>
                  Rozi emasman
                </button>
              </>
            )}
            {iRequested && (
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={() => call(`/api/contracts/${c.id}`, "POST", { action: "WITHDRAW_CANCEL" })}
              >
                So'rovni qaytarib olish
              </button>
            )}
          </div>
        </div>
      )}

      {disputed && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">
          <div className="font-medium text-red-200">⚖️ Masala administrator ko'rib chiqmoqda</div>
          <div className="mt-1 text-zinc-300">Bekor qilish sababi: {c.cancelReason}</div>
          <div className="mt-0.5 text-zinc-300">Rad etish sababi: {c.cancelRejectReason}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Admin bekor qilish, davom ettirish yoki yakunlash bo'yicha qaror qabul qiladi. Qaror chatga yoziladi.
          </div>
        </div>
      )}

      {/* asosiy amallar */}
      {!disputed && (
        <div className="flex flex-wrap gap-2">
          {isOrderer && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Ish yakunlanadi va ${c.amount.toLocaleString()} so'm to'liq tayyorlovchiga o'tadi. Davom etilsinmi?`,
                  )
                ) {
                  call(`/api/orders/${orderId}/finalize`, "POST");
                }
              }}
            >
              ✅ Ishni yakunlash
            </button>
          )}
          {isOrderer && delivered && !c.cancelState && (
            <button className="btn-ghost" disabled={busy} onClick={() => open("revision")}>
              🔁 Qayta ishlash
            </button>
          )}
          {!isOrderer && status === "IN_PROGRESS" && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => call(`/api/orders/${orderId}`, "PATCH", { status: "DELIVERED" })}
            >
              📦 Ishni topshirdim
            </button>
          )}
          {!c.cancelState && (
            <button className="btn-ghost text-red-300" disabled={busy} onClick={() => open("cancel")}>
              ✖ Bekor qilishni so'rash
            </button>
          )}
        </div>
      )}

      {form && (
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-medium text-white">
            {form === "cancel"
              ? "Bekor qilish sababi"
              : form === "reject"
                ? "Nega rozi emassiz?"
                : "Nimani qayta ishlash kerak?"}
          </div>
          <p className="text-xs text-zinc-500">
            {form === "cancel"
              ? "Ikkinchi tomonga yuboriladi. U 3 ish kuni ichida rozi bo'lsa (yoki javob bermasa) — pul buyurtmachiga qaytadi, rozi bo'lmasa — admin hal qiladi."
              : form === "reject"
                ? "Sabab admin va ikkinchi tomonga ko'rinadi. Masalani admin hal qiladi."
                : "Ish tayyorlovchiga qaytadi. Yangi muddatgacha qayta topshirilmasa — shartnoma bekor bo'lib pul sizga qaytadi."}
          </p>
          <textarea
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sababni batafsil yozing..."
          />
          {form === "revision" && (
            <div>
              <label className="label">Yangi muddat (sana va vaqt)</label>
              <input
                className="input"
                type="datetime-local"
                value={deadline}
                min={toLocalInput(new Date().toISOString())}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          )}
          {localErr && <p className="text-sm text-red-400">{localErr}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={submit}>
              Yuborish
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => setForm(null)}>
              Bekor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
