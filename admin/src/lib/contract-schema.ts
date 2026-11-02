import { z } from "zod";

const reason = z.string().trim().min(5, "Sababni yozing (kamida 5 belgi)").max(1000);

/** Shartnoma amallari — web va mobil API uchun umumiy. */
export const contractActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT") }),
  z.object({ action: z.literal("DECLINE") }),
  z.object({ action: z.literal("CANCEL") }),
  z.object({ action: z.literal("REQUEST_CANCEL"), reason }),
  z.object({ action: z.literal("APPROVE_CANCEL") }),
  z.object({ action: z.literal("REJECT_CANCEL"), reason }),
  z.object({ action: z.literal("WITHDRAW_CANCEL") }),
]);

export const revisionSchema = z.object({
  reason,
  deadline: z.string().datetime({ message: "Yangi muddatni tanlang" }),
});
