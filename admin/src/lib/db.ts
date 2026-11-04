import { PrismaClient } from "@prisma/client";

import { signal, STAFF_CHANNEL, userChannel } from "@/lib/realtime";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type Row = Record<string, unknown> | null | undefined;
const str = (v: unknown) => (typeof v === "string" ? v : null);

/**
 * Prisma + real-time signallar: xabar, hamyon va SMM buyurtma bazaga yozilganda tegishli odamga
 * (lib/realtime.ts) signal ketadi — hech qayerda alohida "signal yubor" deb yozish shart emas.
 * Bir xil fayl to'rt loyihada: src, admin, plus, smm-app (lib/db.ts).
 */
function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // suhbat ishtirokchilari + admin panel — javobdan keyin aniqlanadi (tranzaksiya yopilgan bo'ladi)
  async function participants(conversationId: string) {
    const c = await base.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });
    return [c && userChannel(c.userAId), c && userChannel(c.userBId), STAFF_CHANNEL];
  }
  function chatSignal(conversationId: string | null) {
    if (conversationId) signal(() => participants(conversationId), { name: "chat", data: { c: conversationId } });
  }

  // reaksiya — xabar orqali suhbatni topamiz
  function reactionSignal(messageId: string | null) {
    if (!messageId) return;
    signal(
      async () => {
        const m = await base.message.findUnique({ where: { id: messageId }, select: { conversationId: true } });
        return m ? participants(m.conversationId) : [];
      },
      { name: "chat" },
    );
  }

  return base.$extends({
    query: {
      message: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          if (/^(create|update|upsert|delete)/.test(operation)) {
            const a = args as { where?: Row; data?: Row };
            const conv =
              str((r as Row)?.conversationId) ?? str(a.where?.conversationId) ?? str(a.data?.conversationId);
            chatSignal(conv);
          }
          return r;
        },
      },
      messageReaction: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          if (/^(create|update|upsert|delete)/.test(operation)) {
            const messageId = str((r as Row)?.messageId) ?? str((args as { where?: Row }).where?.messageId);
            reactionSignal(messageId);
          }
          return r;
        },
      },
      walletTransaction: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          if (/^(create|update|upsert)/.test(operation)) {
            const data = (args as { data?: Row | Row[] }).data;
            const ids = [str((r as Row)?.userId), ...(Array.isArray(data) ? data : [data]).map((d) => str(d?.userId))];
            signal(ids.map((id) => id && userChannel(id)), { name: "wallet" });
          }
          return r;
        },
      },
      user: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          // faqat balans o'zgarganda (masalan, increment/decrement)
          const a = args as { where?: Row; data?: Row };
          if (/^(update|upsert)/.test(operation) && a.data && "balance" in a.data) {
            const id = str((r as Row)?.id) ?? str(a.where?.id);
            if (id) signal([userChannel(id)], { name: "wallet" });
          }
          return r;
        },
      },
      smmOrder: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          const a = args as { where?: Row; data?: Row };
          // faqat holat o'zgarganda — "tekshirildi" vaqti (checkedAt) yozilishi signal emas,
          // aks holda sahifa yangilanishi → tekshiruv → signal → yana yangilanish aylanib qoladi
          const meaningful =
            /^(create|update|upsert)/.test(operation) &&
            (operation.startsWith("create") ||
              ["status", "remains", "startCount", "refundAmount", "error"].some((k) => a.data && k in a.data));
          if (meaningful && (r as { count?: number })?.count !== 0) {
            const uid = str((r as Row)?.userId) ?? str(a.where?.userId) ?? str(a.data?.userId);
            const orderId = str(a.where?.id);
            if (uid) signal([userChannel(uid)], { name: "order" });
            else if (orderId) {
              signal(
                async () => {
                  const o = await base.smmOrder.findUnique({ where: { id: orderId }, select: { userId: true } });
                  return [o && userChannel(o.userId)];
                },
                { name: "order" },
              );
            }
          }
          return r;
        },
      },
    },
  });
}

// kengaytma faqat yozuvlarni kuzatadi, API o'zgarmaydi — tranzaksiya turlari (Prisma.TransactionClient) mos qolsin
export const db = globalForPrisma.prisma ?? (createClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
