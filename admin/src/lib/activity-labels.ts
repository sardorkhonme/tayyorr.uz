// Klient-xavfsiz: faoliyat turlari va o'zbekcha nomlari (DB import qilmaydi)

export const ACTIVITY_LABEL: Record<string, string> = {
  AUTH_LOGIN: "Saytga kirdi",
  REGISTER: "Ro'yxatdan o'tdi",
  PROFILE_UPDATE: "Profilni tahrirladi",
  ACCOUNT_UPDATE: "Login / parolni o'zgartirdi",

  ORDER_CREATE: "Buyurtma yaratdi",
  ORDER_DELETE: "Buyurtmani o'chirdi",
  ORDER_CANCEL: "Buyurtmani bekor qildi",
  ORDER_DELIVER: "Ishni topshirdi",
  ORDER_FINALIZE: "Ishni yakunladi",
  ORDER_REVISION: "Ishni qayta ishlashga qaytardi",

  OFFER_CREATE: "Taklif yubordi",
  OFFER_ACCEPT: "Taklifni qabul qildi",
  OFFER_REJECT: "Taklifni rad etdi",

  CONTRACT_SEND: "Shartnoma yubordi",
  CONTRACT_ACCEPT: "Shartnomani qabul qildi",
  CONTRACT_DECLINE: "Shartnomani rad etdi",
  CONTRACT_CANCEL: "Shartnomani bekor qildi",
  CONTRACT_CANCEL_REQUEST: "Bekor qilishni so'radi",
  CONTRACT_CANCEL_RESPOND: "Bekor qilish so'roviga javob berdi",

  REVIEW_CREATE: "Baho qoldirdi",

  WALLET_TOPUP: "Hisobni to'ldirdi",
  PAYOUT_REQUEST: "Kartaga yechish so'radi",
  PAYOUT_CANCEL: "Yechish so'rovini bekor qildi",

  COMPLAINT_CREATE: "Shikoyat yubordi",
  USER_BLOCK: "Foydalanuvchini blokladi",
  USER_UNBLOCK: "Blokdan chiqardi",
};

// Filtr uchun mantiqiy guruhlar
export const ACTIVITY_GROUPS: { label: string; actions: string[] }[] = [
  { label: "Hammasi", actions: [] },
  {
    label: "Buyurtmalar",
    actions: [
      "ORDER_CREATE",
      "ORDER_DELETE",
      "ORDER_CANCEL",
      "ORDER_DELIVER",
      "ORDER_FINALIZE",
      "ORDER_REVISION",
    ],
  },
  {
    label: "Takliflar / shartnoma",
    actions: [
      "OFFER_CREATE",
      "OFFER_ACCEPT",
      "OFFER_REJECT",
      "CONTRACT_SEND",
      "CONTRACT_ACCEPT",
      "CONTRACT_DECLINE",
      "CONTRACT_CANCEL",
      "CONTRACT_CANCEL_REQUEST",
      "CONTRACT_CANCEL_RESPOND",
    ],
  },
  {
    label: "Hamyon",
    actions: ["WALLET_TOPUP", "PAYOUT_REQUEST", "PAYOUT_CANCEL"],
  },
  {
    label: "Hisob",
    actions: ["AUTH_LOGIN", "REGISTER", "PROFILE_UPDATE", "ACCOUNT_UPDATE"],
  },
  {
    label: "Xavfsizlik",
    actions: ["COMPLAINT_CREATE", "USER_BLOCK", "USER_UNBLOCK", "REVIEW_CREATE"],
  },
];

export function activityLabel(action: string): string {
  return ACTIVITY_LABEL[action] ?? action;
}
