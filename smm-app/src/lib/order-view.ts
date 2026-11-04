/** Buyurtma holati va bajarilish ko'rsatkichlari — ro'yxat va batafsil sahifa uchun umumiy. */

export const ORDER_STATUS: Record<string, { label: string; cls: string; bar: string; hint: string }> = {
  PENDING: {
    label: "Navbatda",
    cls: "bg-zinc-100 text-zinc-600",
    bar: "bg-zinc-400",
    hint: "Buyurtma qabul qilindi va navbatga qöyildi.",
  },
  PROCESSING: {
    label: "Qabul qilindi",
    cls: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
    hint: "Buyurtma işga tuşiş uçun tayyorlanmoqda — odatda bir necha daqiqa.",
  },
  IN_PROGRESS: {
    label: "Bajarilmoqda",
    cls: "bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
    hint: "Yetkazilmoqda. Sahifa öz-özidan yangilanib turadi.",
  },
  COMPLETED: {
    label: "Bajarildi",
    cls: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    hint: "Buyurtma töliq bajarildi.",
  },
  PARTIAL: {
    label: "Qisman",
    cls: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    hint: "Bir qismi yetkazildi, qolgan qismi uçun pul hamyoningizga qaytarildi.",
  },
  CANCELED: {
    label: "Bekor qilindi",
    cls: "bg-red-50 text-red-700",
    bar: "bg-red-400",
    hint: "Buyurtma bekor böldi, pul töliq hamyoningizga qaytarildi.",
  },
  FAILED: {
    label: "Xatolik",
    cls: "bg-red-50 text-red-700",
    bar: "bg-red-400",
    hint: "Buyurtma qabul qilinmadi, pul töliq hamyoningizga qaytarildi.",
  },
};

export const ACTIVE = ["PENDING", "PROCESSING", "IN_PROGRESS"];

export function statusOf(status: string) {
  return ORDER_STATUS[status] ?? ORDER_STATUS.PENDING;
}

/**
 * Nechtasi yetkazilgani: provayder `remains` (qolgan) qaytaradi.
 * Bajarildi — remains bo'lmasa ham to'liq; bekor/xato — remains bo'lmasa 0.
 */
export function progressOf(o: { quantity: number; remains: number | null; startCount: number | null; status: string }) {
  let delivered: number;
  if (o.remains != null) delivered = o.quantity - Math.max(o.remains, 0);
  else delivered = o.status === "COMPLETED" ? o.quantity : 0;
  delivered = Math.min(Math.max(delivered, 0), o.quantity);
  const pct = o.quantity > 0 ? Math.round((delivered / o.quantity) * 100) : 0;
  return {
    delivered,
    left: o.quantity - delivered,
    pct,
    /** buyurtmagacha bo'lgan son + yetkazilgan — sahifada taxminan shuncha bo'lishi kerak */
    expected: o.startCount != null && o.startCount >= 0 ? o.startCount + delivered : null,
  };
}
