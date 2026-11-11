import { guaranteeLabel, guaranteeOf, isGuaranteeTag, verdictOf } from "@/lib/guarantee";
import { KINDS, kindOf, splitServiceName } from "@/lib/kinds";
import { ACTIVE, progressOf, statusOf } from "@/lib/order-view";
import { platformOf } from "@/lib/platforms";

/**
 * Mobil ilova (Flutter) uchun tayyor ko'rinish — saytdagi kartochka/sahifalar bilan bir xil hisob-kitob
 * (tur, sarlavha, teglar, kafolat, tavsiya, holat va bajarilish). Ilova /api/m/* ni SSO belgisi bilan chaqiradi.
 */
export function serviceView(s: {
  id: string;
  platform: string;
  category: string;
  name: string;
  description: string | null;
  rate: number;
  oldRate: number | null;
  discount: number;
  min: number;
  max: number;
  refill: boolean;
}) {
  const kind = kindOf(s.category, s.name);
  const { title, tags } = splitServiceName(s.name);
  const g = guaranteeOf(s.name, s.refill);
  const v = verdictOf(s.name, s.refill, kind);
  return {
    id: s.id,
    platform: s.platform,
    kind,
    category: s.category,
    title,
    tags: tags.filter((t) => !isGuaranteeTag(t)).slice(0, 6),
    description: s.description,
    rate: s.rate,
    oldRate: s.oldRate,
    discount: s.discount,
    min: s.min,
    max: s.max,
    guarantee: { label: guaranteeLabel(g), ok: g.kind !== "none" },
    verdict: v,
  };
}

export function orderView(o: {
  id: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  remains: number | null;
  startCount: number | null;
  refundAmount: number | null;
  providerOrderId: number | string | null;
  checkedAt: Date | null;
  createdAt: Date;
  service: { name: string; platform: string; category: string; refill: boolean };
}) {
  const st = statusOf(o.status);
  const p = progressOf(o);
  const kind = kindOf(o.service.category, o.service.name);
  const { title, tags } = splitServiceName(o.service.name);
  const g = guaranteeOf(o.service.name, o.service.refill);
  return {
    id: o.id,
    code: o.id.slice(-8).toUpperCase(),
    title,
    tags: tags.filter((t) => !isGuaranteeTag(t)).slice(0, 6),
    platform: o.service.platform,
    platformName: platformOf(o.service.platform).name,
    kind,
    kindLabel: KINDS.find((k) => k.key === kind)?.label ?? "",
    guarantee: { label: guaranteeLabel(g), ok: g.kind !== "none" },
    link: o.link,
    quantity: o.quantity,
    charge: o.charge,
    status: o.status,
    statusLabel: st.label,
    statusHint: st.hint,
    active: ACTIVE.includes(o.status),
    accepted: !!o.providerOrderId,
    delivered: p.delivered,
    left: p.left,
    pct: p.pct,
    startCount: o.startCount,
    expected: p.expected,
    refund: o.refundAmount ?? 0,
    checkedAt: o.checkedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}
