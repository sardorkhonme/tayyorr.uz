import type { Contract, Order } from "@prisma/client";

/** Shartnomaning klientga (web sahifa va mobil ilova) beriladigan ko'rinishi. */
export function contractView(
  c: Contract & { preparer: { name: string | null; login: string | null } },
  order: Pick<Order, "deadline">,
) {
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return {
    id: c.id,
    status: c.status,
    amount: c.amount,
    note: c.note,
    // shartnomada muddat bo'lmasa — buyurtma muddati amal qiladi
    deadline: iso(c.deadline ?? order.deadline),
    preparerId: c.preparerId,
    preparerName: c.preparer.name ?? c.preparer.login ?? "Tayyorlovchi",
    createdAt: c.createdAt.toISOString(),
    deliveredAt: iso(c.deliveredAt),
    reviewDueAt: iso(c.reviewDueAt),
    revisionCount: c.revisionCount,
    cancelState: c.cancelState,
    cancelRequestedById: c.cancelRequestedById,
    cancelReason: c.cancelReason,
    cancelDueAt: iso(c.cancelDueAt),
    cancelRejectReason: c.cancelRejectReason,
    disputeResolution: c.disputeResolution,
    disputeNote: c.disputeNote,
  };
}

export type ContractView = ReturnType<typeof contractView>;
