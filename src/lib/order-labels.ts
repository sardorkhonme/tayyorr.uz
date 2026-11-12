/** Buyurtma turi va holati yorliqlari — server va klient komponentlarda umumiy. */

export const TYPE_LABEL: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

export const STATUS_CLS: Record<string, string> = {
  OPEN: "bg-emerald-500/15 text-emerald-300",
  IN_PROGRESS: "bg-indigo-500/15 text-indigo-300",
  DELIVERED: "bg-amber-500/15 text-amber-300",
  DONE: "bg-white/10 text-zinc-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};
