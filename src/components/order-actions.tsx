"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ReportButton } from "@/components/report-button";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";
import {
  ContractPanel,
  localInputToIso,
  toLocalInput,
} from "@/components/contract-panel";
import { shortDateTime } from "@/lib/date";
import type { ContractView } from "@/lib/contract-view";
import { Icon, StarIcon } from "@/components/icons";
import { MascotState } from "@/components/mascot";
import { errorText, fetchJson } from "@/components/fetch-json";

export const OFFER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Körib çiqilmoqda", cls: "bg-amber-500/15 text-amber-300" },
  ACCEPTED: { label: "Qabul qilingan", cls: "bg-emerald-500/15 text-emerald-300" },
  REJECTED: { label: "Rad etilgan", cls: "bg-red-500/15 text-red-300" },
  WITHDRAWN: { label: "Qaytarib olingan", cls: "bg-zinc-500/15 text-zinc-400" },
};

const OFFER_ICON: Record<string, "check-circle" | "x-circle" | "clock" | "reply"> = {
  PENDING: "clock",
  ACCEPTED: "check-circle",
  REJECTED: "x-circle",
  WITHDRAWN: "reply",
};

/** Taklif holati — yonidagi tugmalar (Chat, Shikoyat) bilan bir xil o'lchamda. */
function OfferBadge({ status, inline = false }: { status: string; inline?: boolean }) {
  const s = OFFER_STATUS[status] ?? { label: status, cls: "bg-white/10 text-zinc-300" };
  return (
    <span
      className={`inline-flex items-center font-semibold ${s.cls} ${
        inline ? "gap-1 rounded-full px-2 py-0.5 align-middle text-xs" : "w-full justify-center gap-2 self-stretch rounded-xl border border-current/20 px-[1.1rem] py-[0.6rem] text-sm leading-[1.2] sm:w-auto"
      }`}
    >
      <Icon name={OFFER_ICON[status] ?? "clock"} className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {s.label}
    </span>
  );
}

interface OfferView {
  id: string;
  price: number;
  message: string | null;
  status: string;
  preparerId: string;
  starsSpent: number;
  createdAt: string;
  preparer: {
    name: string;
    image: string | null;
    login: string | null;
    about: string | null;
    rating: number | null;
    ratingCount: number;
  };
}

interface QueueRow {
  position: number;
  mine: boolean;
  starsSpent: number;
  visible: string;
  hiddenLen: number;
}

interface Props {
  orderId: string;
  status: string;
  isOrderer: boolean;
  isPreparer: boolean;
  isAssigned: boolean;
  ordererId: string;
  reviewed: boolean;
  myReview: { stars: number; comment: string | null } | null;
  myOffer: {
    id: string;
    price: number;
    message: string | null;
    status: string;
    starsSpent: number;
  } | null;
  offers: OfferView[];
  queue: QueueRow[];
  meId: string;
  orderDeadline: string | null;
  contracts: ContractView[];
  /** ariza uchun minimal star — admin panelda belgilanadi */
  minOfferStars: number;
}


export function OrderActions(props: Props) {
  const router = useRouter();
  const {
    orderId,
    status,
    isOrderer,
    isPreparer,
    isAssigned,
    ordererId,
    reviewed,
    myReview,
    myOffer,
    offers,
    queue,
    meId,
    orderDeadline,
    contracts,
    minOfferStars: MIN_OFFER_STARS,
  } = props;

  const [price, setPrice] = useState(myOffer?.price?.toString() ?? "");
  const [message, setMessage] = useState(myOffer?.message ?? "");
  const [boostStars, setBoostStars] = useState("");
  const [offerStars, setOfferStars] = useState(String(MIN_OFFER_STARS));
  const [busy, setBusy] = useState(false);
  const [err, setErrState] = useState<string | null>(null);
  // xato qaysi bölim yonida körinsin (taklif formasi, navbat/boost yoki umumiy)
  const [errAt, setErrAt] = useState<"offer" | "boost" | "contract" | "general">("general");
  const setErr = (m: string | null, at: "offer" | "boost" | "contract" | "general" = "general") => {
    setErrState(m);
    setErrAt(at);
  };
  const errFor = (at: "offer" | "boost" | "contract" | "general") =>
    err && errAt === at ? (
      <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {err}
      </p>
    ) : null;

  // shartnoma yuborish formasi (qaysi tayyorlovchiga)
  const [contractFor, setContractFor] = useState<string | null>(null);
  const [cAmount, setCAmount] = useState("");
  const [cNote, setCNote] = useState("");
  const [cDeadline, setCDeadline] = useState("");
  // bosilgan taklif — amallar oynasi (blursiz, markazda)
  const [openOffer, setOpenOffer] = useState<string | null>(null);

  const sentContract = contracts.find((c) => c.status === "SENT") ?? null;
  const acceptedContract = contracts.find((c) => c.status === "ACCEPTED") ?? null;
  const myIncomingContract =
    isPreparer && sentContract?.preparerId === meId ? sentContract : null;

  async function sendContract(preparerId: string) {
    if (!cAmount || Number(cAmount) <= 0) {
      setErr("Summani kiriting", "contract");
      return false;
    }
    const deadline = localInputToIso(cDeadline);
    if (!deadline || new Date(deadline).getTime() <= Date.now()) {
      setErr("Şartnoma muddatini (sana va vaqt) tanlang", "contract");
      return false;
    }
    const ok = await call(`/api/orders/${orderId}/contract`, "POST", {
      preparerId,
      amount: Number(cAmount),
      note: cNote || undefined,
      deadline,
    }, "contract");
    if (!ok) return false;
    setContractFor(null);
    setCAmount("");
    setCNote("");
    return true;
  }

  /** Taklif qatoridagi muddat: şu tayyorlovçiga yuborilgan şartnoma muddati, bölmasa buyurtma muddati. */
  function offerDeadlineText(o: OfferView) {
    const c = contracts.find((x) => x.preparerId === o.preparerId && x.deadline);
    const d = c?.deadline ?? orderDeadline;
    return d ? shortDateTime(d) : "muddat yöq";
  }

  async function boost() {
    const stars = Number(boostStars);
    if (!stars || stars <= 0) {
      setErr("Star sonini kiriting", "boost");
      return;
    }
    const ok = await call(`/api/orders/${orderId}/offers/boost`, "POST", { stars }, "boost");
    if (ok) setBoostStars("");
  }

  async function startChat(userId: string) {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchJson<{ conversationId: string }>("/api/chat/start", {
        method: "POST",
        json: { userId, orderId },
      });
      router.push(`/messages/${data.conversationId}`);
      // sahifa almaşmasa (masalan tarmoq sekin) — tugma abadiy bloklanib qolmasin
      setTimeout(() => setBusy(false), 8000);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  async function call(
    url: string,
    method: string,
    body?: unknown,
    at: "offer" | "boost" | "contract" | "general" = "general",
  ): Promise<boolean> {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(url, { method, json: body });
      router.refresh();
      return true;
    } catch (e) {
      setErr(errorText(e), at);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {errFor("general")}

      {isAssigned && (
        <button
          type="button"
          className="btn-ghost w-full sm:w-fit"
          disabled={busy}
          onClick={() => startChat(ordererId)}
        >
          <Icon name="message" className="h-4 w-4" />
          Buyurtmaçi bilan yozişiş
        </button>
      )}

      {/* Tayyorlovchiga kelgan shartnoma */}
      {myIncomingContract && (
        <div className="card border-indigo-400/30 bg-indigo-500/5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon name="file" className="h-[18px] w-[18px] text-indigo-300" />
            Sizga şartnoma yuborildi
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            Kelişilgan summa:{" "}
            <b>{myIncomingContract.amount.toLocaleString()} söm</b>
          </p>
          {myIncomingContract.deadline && (
            <p className="mt-1 text-sm text-zinc-300">
              Topşiriş muddati:{" "}
              <b>{shortDateTime(myIncomingContract.deadline)}</b>
            </p>
          )}
          {myIncomingContract.note && (
            <p className="mt-1 text-sm text-zinc-400">
              Izoh: {myIncomingContract.note}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Qabul qilganingizdan keyin şartnomani faqat ikki tomon roziligi
            (yoki admin qarori) bilan bekor qiliş mumkin. Muddatgaça iş
            topşirilmasa — şartnoma bekor böladi.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                call(`/api/contracts/${myIncomingContract.id}`, "POST", {
                  action: "ACCEPT",
                })
              }
            >
              Qabul qiliş va boşlaş
            </button>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() =>
                call(`/api/contracts/${myIncomingContract.id}`, "POST", {
                  action: "DECLINE",
                })
              }
            >
              Rad etiş
            </button>
          </div>
        </div>
      )}

      {/* Buyurtmachi: yuborilgan shartnoma holati */}
      {isOrderer && sentContract && (
        <div className="card border-indigo-400/30 bg-indigo-500/5">
          <p className="text-sm text-zinc-300">
            <Icon name="file" className="mr-1 inline-block h-4 w-4 align-[-3px] text-indigo-300" />
            <b>{sentContract.preparerName}</b> ga şartnoma yuborildi —{" "}
            {sentContract.amount.toLocaleString()} söm. Javob kutilmoqda.
          </p>
          <button
            className="btn-ghost mt-2"
            disabled={busy}
            onClick={() =>
              call(`/api/contracts/${sentContract.id}`, "POST", { action: "CANCEL" })
            }
          >
            Bekor qiliş
          </button>
        </div>
      )}

      {/* Tayyorlovchi: taklif yuborish */}
      {isPreparer && !isAssigned && status === "OPEN" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            call(
              `/api/orders/${orderId}/offers`,
              "POST",
              {
                price: Number(price),
                message: message || undefined,
                ...(myOffer ? {} : { stars: Number(offerStars) || MIN_OFFER_STARS }),
              },
              "offer",
            );
          }}
          className="card flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {myOffer ? "Taklifni yangilaş" : "Taklif yuboriş"}
            </h2>
            {myOffer && <OfferBadge status={myOffer.status} inline />}
          </div>
          <div className={`grid gap-3 ${myOffer ? "" : "grid-cols-2"}`}>
            <div className="min-w-0">
              <label className="label truncate">Narx (söm)</label>
              <input
                className="input"
                type="number"
                min={1}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            {!myOffer && (
              <div className="min-w-0">
                <label className="label truncate">Star (kamida {MIN_OFFER_STARS})</label>
                <input
                  className="input"
                  type="number"
                  min={MIN_OFFER_STARS}
                  step={1}
                  required
                  value={offerStars}
                  onChange={(e) => setOfferStars(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="label">Xabar</label>
            <textarea
              className="input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {!myOffer && (
            <div>
              <p className="text-xs leading-relaxed text-amber-300">
                <StarIcon className="mr-1 h-3 w-3" />
                Star — navbatdagi boşlanğiç örningiz. Kamida {MIN_OFFER_STARS} star talab qiladi — navbatda
                yuqoriroqda turiş uçun boşidanoq köproq yuborişingiz
                mumkin. Star balansingizdan sarflanadi.{" "}
                <Link href="/wallet" className="underline hover:text-amber-200">
                  Star yetarli emasmi? Hamyondan sotib oling →
                </Link>
              </p>
            </div>
          )}
          {errFor("offer")}
          <button className="btn-primary" disabled={busy}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="spin-ring" aria-hidden />
                Yuborilmoqda…
              </span>
            ) : myOffer ? (
              "Yangilaş"
            ) : (
              <span>
                Yuboriş ({Number(offerStars) || MIN_OFFER_STARS}{" "}
                <StarIcon className="h-3.5 w-3.5" />)
              </span>
            )}
          </button>
        </form>
      )}

      {/* Navbat — taklif yuborish qismidan pastroqda, shunga qarab qancha
          star sarflashni tanlaydi (ismlar qisman yashirilgan) */}
      {isPreparer && !isOrderer && status === "OPEN" && queue.length > 0 && (
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Navbat ({queue.length})</h2>
            {myOffer && (
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-zinc-500">
                Siz sarflagan:
                <b className="inline-flex items-center gap-0.5 text-amber-300">
                  {myOffer.starsSpent} <StarIcon className="h-3 w-3" />
                </b>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">Köproq star sarflagan yuqorida turadi.</p>
          <ul className="flex flex-col gap-1.5">
            {queue.map((q) => (
              <li
                key={q.position}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  q.mine
                    ? "border border-indigo-400/30 bg-indigo-500/10"
                    : "bg-white/[0.03]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-zinc-500">#{q.position}</span>
                  <span className="font-medium text-white">
                    {q.visible}
                    {q.hiddenLen > 0 && (
                      <span
                        aria-hidden
                        className="select-none blur-[3px]"
                      >
                        {"•".repeat(Math.min(q.hiddenLen, 10))}
                      </span>
                    )}
                  </span>
                  {q.mine && (
                    <span className="text-xs text-indigo-300">(siz)</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs text-amber-300">
                  {q.starsSpent} <StarIcon className="h-3 w-3" />
                </span>
              </li>
            ))}
          </ul>

          {/* star bilan navbatda yuqoriga çiqiş — navbatning özida */}
          {myOffer && myOffer.status === "PENDING" && (
            <div className="mt-1 flex flex-col gap-2 border-t border-white/10 pt-3">
              <div className="text-sm font-medium text-white">Navbatda yuqoriga çiqiş</div>
              <div className="flex items-stretch gap-2">
                <input
                  className="input h-10 w-24 shrink-0"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="star"
                  aria-label="Star soni"
                  value={boostStars}
                  onChange={(e) => setBoostStars(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary h-10 min-w-0 flex-1"
                  disabled={busy}
                  onClick={boost}
                >
                  <Icon name="rocket" className="h-4 w-4 shrink-0" />
                  <span className="truncate">{busy ? "Kutilmoqda…" : "Yuqoriga çiqiş"}</span>
                </button>
              </div>
              {errFor("boost")}
              <p className="text-xs text-zinc-500">
                Qöşimça star navbatdagi örningizni kötaradi.{" "}
                <Link href="/wallet" className="underline hover:text-zinc-300">
                  Star sotib oliş →
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Buyurtmachi: takliflar — bitta quti, ičida ixçam qatorlar; amallar qator bosilganda oynada */}
      {isOrderer && (
        <section className="card !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
            <h2 className="text-base font-semibold text-white">Takliflar</h2>
            <span className="text-sm text-zinc-500">{offers.length} ta</span>
          </div>
          {offers.length === 0 ? (
            <MascotState
              pose="empty-offers"
              size={170}
              className="!pb-7 !pt-3"
              title="Hozirça taklif yöq"
              message="Tayyorlovçilar takliflarini yuborişi bilan ular şu yerda paydo böladi."
            />
          ) : (
            <ul className="px-2 pb-2">
              {offers.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setOpenOffer(o.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition hover:bg-white/[0.04] active:scale-[0.99] [li+li>&]:mt-0.5"
                  >
                    <OfferAvatar name={o.preparer.name} image={o.preparer.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-white">
                        {o.preparer.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                        <Icon name="star" className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        <span className="shrink-0">
                          {o.preparer.rating != null
                            ? `${o.preparer.rating.toFixed(1)} (${o.preparer.ratingCount})`
                            : "yangi"}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{offerDeadlineText(o)}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[15px] font-semibold text-white">
                        {o.price.toLocaleString("ru-RU")} <span className="text-xs font-normal text-zinc-400">söm</span>
                      </span>
                      <OfferBadge status={o.status} inline />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isOrderer && openOffer && (() => {
        const o = offers.find((x) => x.id === openOffer);
        if (!o) return null;
        return (
          <OfferDialog onClose={() => { setOpenOffer(null); setContractFor(null); }}>
            <div className="flex items-start gap-3">
              <OfferAvatar name={o.preparer.name} image={o.preparer.image} size="lg" />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${o.preparerId}`} className="block truncate font-semibold text-white hover:underline">
                  {o.preparer.name}
                </Link>
                {o.preparer.login && <div className="truncate text-xs text-zinc-500">@{o.preparer.login}</div>}
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Stars value={o.preparer.rating ?? 0} />
                  <span className="text-zinc-300">
                    {o.preparer.rating != null ? o.preparer.rating.toFixed(1) : "yangi"}
                  </span>
                  <span className="text-xs text-zinc-500">({o.preparer.ratingCount} baho)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setOpenOffer(null); setContractFor(null); }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Yopiş"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div>
                <div className="text-xs text-zinc-500">Narx</div>
                <div className="font-semibold text-white">{o.price.toLocaleString("ru-RU")} söm</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Muddat</div>
                <div className="font-medium text-white">{offerDeadlineText(o)}</div>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                <OfferBadge status={o.status} inline />
                <span className="inline-flex items-center gap-0.5 text-xs text-amber-300">
                  {o.starsSpent} <StarIcon className="h-3 w-3" />
                </span>
              </div>
            </div>

            {o.message && <p className="mt-3 whitespace-pre-line text-sm text-zinc-300">{o.message}</p>}
            {o.preparer.about && <p className="mt-2 text-xs text-zinc-500">{o.preparer.about}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2 [&>*]:h-11">
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => startChat(o.preparerId)}
              >
                <Icon name="message" className="h-4 w-4" />
                Çat
              </button>
              <ReportButton suspectId={o.preparerId} orderId={orderId} label="Şikoyat" />
              {status === "OPEN" && o.status === "PENDING" && !sentContract && (
                <>
                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={() => {
                      setContractFor(contractFor === o.preparerId ? null : o.preparerId);
                      setCAmount(String(o.price));
                      setCNote("");
                      setCDeadline(
                        orderDeadline && new Date(orderDeadline).getTime() > Date.now()
                          ? toLocalInput(orderDeadline)
                          : "",
                      );
                    }}
                  >
                    <Icon name="file" className="h-4 w-4" />
                    Şartnoma tuziş
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await call(`/api/offers/${o.id}`, "PATCH", { action: "REJECT" });
                      if (ok) setOpenOffer(null);
                    }}
                  >
                    Rad etiş
                  </button>
                </>
              )}
            </div>

            {contractFor === o.preparerId && (
              <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-sm font-medium text-white">Kelişilgan şartnoma</div>
                <div>
                  <label className="label">Kelişilgan summa (söm)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={cAmount}
                    onChange={(e) => setCAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Topşiriş muddati (sana va vaqt)</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={cDeadline}
                    min={toLocalInput(new Date().toISOString())}
                    onChange={(e) => setCDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Izoh / şartlar (ixtiyoriy)</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={cNote}
                    onChange={(e) => setCNote(e.target.value)}
                  />
                </div>
                {errFor("contract")}
                <button
                  className="btn-primary w-full"
                  disabled={busy}
                  onClick={async () => {
                    if (await sendContract(o.preparerId)) setOpenOffer(null);
                  }}
                >
                  {busy ? "Yuborilmoqda…" : "Şartnoma yuboriş"}
                </button>
              </div>
            )}
            {errFor("general")}
          </OfferDialog>
        );
      })()}

      {/* Baholash (ish yakunlangач buyurtmachi) */}
      {isOrderer && status === "DONE" &&
        (reviewed ? (
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-white">Sizning bahoyingiz</h2>
            <Stars value={myReview?.stars ?? 0} size="md" />
            {myReview?.comment && (
              <p className="mt-2 text-sm text-zinc-400">«{myReview.comment}»</p>
            )}
          </div>
        ) : (
          <ReviewForm orderId={orderId} />
        ))}

      {/* Tayyorlovchiga qo'yilgan baho va sharh */}
      {isAssigned && status === "DONE" && (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-white">Sizga qöyilgan baho</h2>
          {reviewed ? (
            <>
              <Stars value={myReview?.stars ?? 0} size="md" />
              {myReview?.comment ? (
                <p className="mt-2 text-sm text-zinc-400">«{myReview.comment}»</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Şarh qoldirilmagan.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Buyurtmaçi hali baho qöymagan.
            </p>
          )}
        </div>
      )}

      {/* Imzolangan shartnoma: topshirish / yakunlash / qayta ishlash / bekor qilish so'rovi */}
      {acceptedContract && (isOrderer || isAssigned) &&
        (status === "IN_PROGRESS" || status === "DELIVERED") && (
          <ContractPanel
            orderId={orderId}
            status={status}
            contract={acceptedContract}
            meId={meId}
            isOrderer={isOrderer}
            busy={busy}
            call={call}
          />
        )}

      {isOrderer && status === "OPEN" && (
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Buyurtma bekor qilinsinmi?")) {
                call(`/api/orders/${orderId}`, "PATCH", { status: "CANCELLED" });
              }
            }}
          >
            Buyurtmani bekor qiliş
          </button>
        </div>
      )}
    </div>
  );
}

function OfferAvatar({ name, image, size = "md" }: { name: string; image: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-12 w-12 text-base" : "h-11 w-11 text-[15px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 font-semibold text-zinc-300 ${cls}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        name.trim().slice(0, 1).toUpperCase() || "?"
      )}
    </span>
  );
}

/** Taklif amallari oynasi — markazda, blursiz (faqat yengil xiralik), Escape / tashqariga bosilsa yopiladi. */
function OfferDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="menu-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="pop-in relative max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-[var(--surface-2)] p-4 shadow-2xl shadow-black/40 sm:p-5"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
