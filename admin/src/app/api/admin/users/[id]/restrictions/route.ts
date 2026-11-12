import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { shortDateTime } from "@/lib/date";
import { withSource, type MessageSource } from "@/lib/message-source";
import { KIND_RULES, PLATFORM_NAME } from "@/lib/smm-adjust";
import { getSupportUserId } from "@/lib/support";

const SCOPES = ["smm", "smm_service", "uz_all", "uz_orders", "uz_offers", "uz_chat", "payout", "topup", "family"] as const;

/** Foydalanuvchiga yuboriladigan xabardagi nomlar (src/lib/restriction-scope.ts bilan bir xil). */
const LABEL: Record<string, string> = {
  smm: "butunlay (barça xizmatlar)",
  uz_all: "butunlay (buyurtma, taklif, şaxsiy xabarlar)",
  uz_orders: "buyurtma beriş",
  uz_offers: "taklif yuboriş",
  uz_chat: "şaxsiy xabar yoziş",
  payout: "pul yeçib oliş",
  topup: "hisobni töldiriş",
  family: "guruhga yoziş",
};

/** Har bir cheklov qaysi tizimga tegishli — xabar o'sha tizimning support chatiga boradi. */
const SYSTEMS: { key: string; name: string; source: MessageSource; scopes: string[] }[] = [
  { key: "uz", name: "Tayyorr.uz", source: "tayyorr.uz", scopes: ["uz_all", "uz_orders", "uz_offers", "uz_chat"] },
  { key: "smm", name: "Tayyorr SMM", source: "smm", scopes: ["smm", "smm_service"] },
  { key: "wallet", name: "Hamyon", source: "ikkalasi", scopes: ["payout", "topup"] },
  { key: "family", name: "Tayyorr’s Family", source: "tayyorr+", scopes: ["family"] },
];

const addSchema = z.object({
  scopes: z.array(z.enum(SCOPES)).default([]),
  /**
   * smm_service uchun nishonlar: "p:<platforma>" — butun platforma (masalan Instagram),
   * "g:<platforma>:<tur>" — platformadagi tur (Instagram layklari), yoki xizmat id'si.
   */
  serviceIds: z.array(z.string().regex(/^(p:[a-z0-9_-]{1,30}|g:[a-z0-9_-]{1,30}:[a-z0-9_-]{1,30}|[a-z0-9]{10,40})$/)).max(300).default([]),
  until: z.string().optional(),
  indefinite: z.boolean().optional().default(false),
  reason: z.string().trim().max(1000).optional(),
  /** foydalanuvchiga support orqali xabar (har tizimga alohida) */
  notify: z.boolean().optional().default(true),
});

/** Qisman cheklov qo'yish: tanlangan imkoniyatlar (va SMM xizmatlari) — bitta muddat va sabab bilan. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { id } = await params;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri maʼlumot" }, { status: 400 });
  const { scopes, serviceIds, indefinite, reason, notify } = parsed.data;
  const plain = scopes.filter((s) => s !== "smm_service");
  if (!plain.length && !serviceIds.length) return NextResponse.json({ error: "Nimani çeklaşni tanlang" }, { status: 400 });

  let until: Date;
  if (indefinite) until = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000);
  else {
    until = new Date(parsed.data.until ?? "");
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Muddat kelajakda bölsin" }, { status: 400 });
    }
  }
  const user = await db.user.findUnique({ where: { id }, select: { isSupport: true } });
  if (!user || user.isSupport) return NextResponse.json({ error: "Foydalanuvçi topilmadi" }, { status: 404 });

  // bir xil soha (va xizmat) bo'yicha eski cheklov yangisi bilan almashadi
  await db.$transaction([
    db.userRestriction.deleteMany({
      where: { userId: id, OR: [{ scope: { in: plain } }, { scope: "smm_service", target: { in: serviceIds } }] },
    }),
    db.userRestriction.createMany({
      data: [
        ...plain.map((scope) => ({ userId: id, scope, until, reason: reason || null })),
        ...serviceIds.map((target) => ({ userId: id, scope: "smm_service", target, until, reason: reason || null })),
      ],
    }),
  ]);
  if (notify) await notifyUser(id, plain, serviceIds, until, indefinite, reason).catch(() => {});
  return NextResponse.json({ ok: true });
}

/** Cheklov haqida xabar: har bir tizim uchun alohida — qaysi tizimda, aynan nima, qachongacha va sababi. */
async function notifyUser(userId: string, plain: string[], targets: string[], until: Date, indefinite: boolean, reason?: string) {
  const ids = targets.filter((t) => !t.includes(":"));
  const services = ids.length
    ? await db.smmService.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const svcName = new Map(services.map((s) => [s.id, s.name]));
  const kindLabel = (k: string) => KIND_RULES.find((r) => r.key === k)?.label ?? k;
  const targetLabel = (t: string) => {
    if (t.startsWith("p:")) return `${PLATFORM_NAME[t.slice(2)] ?? t.slice(2)} — barça xizmatlar`;
    if (t.startsWith("g:")) {
      const [, p, k] = t.split(":");
      return `${PLATFORM_NAME[p] ?? p} → ${kindLabel(k)}`;
    }
    return `xizmat: ${svcName.get(t) ?? "—"}`;
  };

  const when = indefinite ? "muddatsiz" : `${shortDateTime(until)} gaça`;
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, userId);
  for (const sys of SYSTEMS) {
    const items = [
      ...plain.filter((s) => sys.scopes.includes(s)).map((s) => LABEL[s] ?? s),
      ...(sys.key === "smm" && !plain.includes("smm") ? targets.map(targetLabel) : []),
    ];
    if (!items.length) continue;
    const body =
      `⚠️ ${sys.name}'da sizga çeklov qöyildi (${when}):\n` +
      items.map((x) => `• ${x}`).join("\n") +
      (reason ? `\nSabab: ${reason}` : "") +
      `\nQolgan imkoniyatlardan odatdagidek foydalanişingiz mumkin. Savollar bölsa — şu yerga yozing.`;
    const m = await createMessage({ conversationId: conv.id, senderId: supportId, body: withSource(body, sys.source), system: false });
    await deliverMessage(m);
  }
}

/** Bitta qisman cheklovni olib tashlash (?rid=...). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { id } = await params;
  const rid = new URL(req.url).searchParams.get("rid");
  if (!rid) return NextResponse.json({ error: "rid kerak" }, { status: 400 });
  await db.userRestriction.deleteMany({ where: { id: rid, userId: id } });
  return NextResponse.json({ ok: true });
}
