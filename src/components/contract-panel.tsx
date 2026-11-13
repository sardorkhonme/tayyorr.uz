"use client";

import { useState } from "react";

import { shortDateTime } from "@/lib/date";
import type { ContractView } from "@/lib/contract-view";
import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

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
  const [localErr, setLocalErr] = useFlashState<string | null>(null);

  const delivered = status === "DELIVERED";
  // PENDING: ikkinchi tomon javob kutilmoqda; PENDING + cancelRejectReason: rozi bo'lmadi — so'ragan tomon qaror qiladi
  const rejected = c.cancelState === "PENDING" && !!c.cancelRejectReason;
  const pending = c.cancelState === "PENDING" && !rejected;
  const disputed = c.cancelState === "DISPUTED";
  const iRequested = (pending || rejected) && c.cancelRequestedById === meId;
  const otherRequested = pending && !iRequested;
  const requester = c.cancelRequestedById
    ? c.cancelRequestedById === meId
      ? "Siz"
      : isOrderer
        ? "Tayyorlovçi"
        : "Buyurtmaçi"
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
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon name="file" className="h-[18px] w-[18px] text-emerald-300" />
          Şartnoma imzolangan
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          Summa: <b>{c.amount.toLocaleString()} söm</b>
          {isOrderer ? " · tayyorlovçi: " + c.preparerName : ""}
        </p>
        {c.deadline && (
          <p className="mt-0.5 text-sm text-zinc-400">
            Topşiriş muddati: <b className="text-zinc-200">{shortDateTime(c.deadline)}</b>
            {c.revisionCount > 0 && ` · qayta işlaş: ${c.revisionCount} marta`}
          </p>
        )}
        {delivered && c.reviewDueAt && (
          <p className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
            <Icon name="package" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />
            Iş topşirilgan{c.deliveredAt ? ` (${shortDateTime(c.deliveredAt)})` : ""}.{" "}
            {isOrderer ? "Tekşirib javob bering" : "Buyurtmaçi tekşirmoqda"} —{" "}
            <b className="text-zinc-200">{shortDateTime(c.reviewDueAt)}</b> gaça javob bölmasa, iş
            muvaffaqiyatli deb topiladi va pul tayyorlovçiga ötadi.
          </p>
        )}
        {!delivered && !c.cancelState && (
          <p className="mt-2 text-xs text-zinc-500">
            Muddat tugagunça iş topşirilmasa, şartnoma bekor böladi va pul buyurtmaçiga qaytadi.
          </p>
        )}
      </div>

      {/* bekor qilish so'rovi */}
      {pending && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-amber-200">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {requester} bekor qilişni söra{requester === "Siz" ? "dingiz" : "di"}
          </div>
          <div className="mt-1 text-zinc-300">Sabab: {c.cancelReason}</div>
          {c.cancelDueAt && (
            <div className="mt-1 text-xs text-zinc-400">
              {iRequested ? "Ikkinçi tomon" : "Siz"} {shortDateTime(c.cancelDueAt)} gaça javob{" "}
              {iRequested ? "beradi" : "bering"}. Javob bölmasa — rozi deb hisoblanadi va pul buyurtmaçiga
              qaytariladi.
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            {otherRequested && (
              <>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Şartnoma bekor qilinadi va ${c.amount.toLocaleString()} söm buyurtmaçiga qaytariladi. Rozimisiz?`,
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
                Sörovni qaytarib oliş
              </button>
            )}
          </div>
        </div>
      )}

      {/* rozi bo'linmadi — so'ragan tomon: davom ettiradi yoki adminga yuboradi */}
      {rejected && (
        <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-orange-200">
            <Icon name="x-circle" className="h-4 w-4 shrink-0" />
            {iRequested ? (isOrderer ? "Tayyorlovçi" : "Buyurtmaçi") : "Siz"} bekor qilişga rozi bölma{iRequested ? "di" : "dingiz"}
          </div>
          <div className="mt-1 text-zinc-300">Bekor qiliş sababi: {c.cancelReason}</div>
          <div className="mt-0.5 text-zinc-300">Rad etiş sababi: {c.cancelRejectReason}</div>
          <div className="mt-1 text-xs text-zinc-400">
            {iRequested ? (
              <>
                Endi siz tanlang{c.cancelDueAt ? <> — <b className="text-zinc-200">{shortDateTime(c.cancelDueAt)}</b> gaça</> : ""}: şartnomani davom ettiriş yoki
                masalani administratorga yuboriş. Tanlamasangiz — şartnoma davom etadi.
              </>
            ) : (
              <>
                Javobingiz yuborildi. Endi {requester.toLowerCase()} qaror qiladi: şartnomani davom ettiradi yoki masalani
                administratorga yuboradi{c.cancelDueAt ? ` (${shortDateTime(c.cancelDueAt)} gaça)` : ""}.
              </>
            )}
          </div>
          {iRequested && (
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => call(`/api/contracts/${c.id}`, "POST", { action: "WITHDRAW_CANCEL" })}
              >
                <Icon name="check-circle" className="h-4 w-4" />
                Şartnomani davom ettiraman
              </button>
              <button
                className="btn-ghost text-red-300"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Qaroringiz özgarmaydimi? Masala administratorga yuboriladi va u yakuniy qaror qabul qiladi.")) {
                    call(`/api/contracts/${c.id}`, "POST", { action: "INSIST_CANCEL" });
                  }
                }}
              >
                <Icon name="scale" className="h-4 w-4" />
                Qarorimni özgartirmayman
              </button>
            </div>
          )}
        </div>
      )}

      {disputed && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-red-200">
            <Icon name="scale" className="h-4 w-4 shrink-0" />
            Masala administrator körib çiqmoqda
          </div>
          <div className="mt-1 text-zinc-300">Bekor qiliş sababi: {c.cancelReason}</div>
          <div className="mt-0.5 text-zinc-300">Rad etiş sababi: {c.cancelRejectReason}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Admin bekor qiliş, davom ettiriş yoki yakunlaş böyiça qaror qabul qiladi. Qaror çatga yoziladi.
          </div>
        </div>
      )}

      {/* asosiy amallar */}
      {!disputed && (
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {isOrderer && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Iş yakunlanadi va ${c.amount.toLocaleString()} söm töliq tayyorlovçiga ötadi. Davom etilsinmi?`,
                  )
                ) {
                  call(`/api/orders/${orderId}/finalize`, "POST");
                }
              }}
            >
              <Icon name="check-circle" className="h-4 w-4" />
              Işni yakunlaş
            </button>
          )}
          {isOrderer && delivered && !c.cancelState && (
            <button className="btn-ghost" disabled={busy} onClick={() => open("revision")}>
              <Icon name="refresh" className="h-4 w-4" />
              Qayta işlaş
            </button>
          )}
          {!isOrderer && status === "IN_PROGRESS" && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => call(`/api/orders/${orderId}`, "PATCH", { status: "DELIVERED" })}
            >
              <Icon name="package" className="h-4 w-4" />
              Işni topşirdim
            </button>
          )}
          {!c.cancelState && (
            <button className="btn-ghost text-red-300" disabled={busy} onClick={() => open("cancel")}>
              <Icon name="x-circle" className="h-4 w-4" />
              Bekor qilişni söraş
            </button>
          )}
        </div>
      )}

      {form && (
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-medium text-white">
            {form === "cancel"
              ? "Bekor qiliş sababi"
              : form === "reject"
                ? "Nega rozi emassiz?"
                : "Nimani qayta işlaş kerak?"}
          </div>
          <p className="text-xs text-zinc-500">
            {form === "cancel"
              ? "Ikkinçi tomonga yuboriladi. U 3 iş kuni içida rozi bölsa (yoki javob bermasa) — pul buyurtmaçiga qaytadi. Rozi bölmasa — javobi sizga qaytadi: şartnomani davom ettirasiz yoki masalani admin'ga yuborasiz."
              : form === "reject"
                ? "Sabab bekor qilişni söragan tomonga yuboriladi. U şartnomani davom ettiriși yoki masalani admin'ga yuboriși mumkin."
                : "Iş tayyorlovçiga qaytadi. Yangi muddatgaça qayta topşirilmasa — şartnoma bekor bölib pul sizga qaytadi."}
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
          {localErr && <p className="flash-status text-sm text-red-400">{localErr}</p>}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className="btn-primary" disabled={busy} onClick={submit}>
              Yuboriş
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
