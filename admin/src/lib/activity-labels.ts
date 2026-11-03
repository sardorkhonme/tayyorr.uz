// Klient-xavfsiz: faoliyat turlari va o'zbekcha nomlari (DB import qilmaydi)

export const ACTIVITY_LABEL: Record<string, string> = {
  AUTH_LOGIN: "Saytga kirdi",
  REGISTER: "Röyxatdan ötdi",
  PROFILE_UPDATE: "Profilni tahrirladi",
  ACCOUNT_UPDATE: "Login / parolni özgartirdi",

  ORDER_CREATE: "Buyurtma yaratdi",
  ORDER_DELETE: "Buyurtmani öçirdi",
  ORDER_CANCEL: "Buyurtmani bekor qildi",
  ORDER_DELIVER: "Işni topşirdi",
  ORDER_FINALIZE: "Işni yakunladi",
  ORDER_REVISION: "Işni qayta işlaşga qaytardi",

  OFFER_CREATE: "Taklif yubordi",
  OFFER_ACCEPT: "Taklifni qabul qildi",
  OFFER_REJECT: "Taklifni rad etdi",

  CONTRACT_SEND: "Şartnoma yubordi",
  CONTRACT_ACCEPT: "Şartnomani qabul qildi",
  CONTRACT_DECLINE: "Şartnomani rad etdi",
  CONTRACT_CANCEL: "Şartnomani bekor qildi",
  CONTRACT_CANCEL_REQUEST: "Bekor qilişni söradi",
  CONTRACT_CANCEL_RESPOND: "Bekor qiliş söroviga javob berdi",

  REVIEW_CREATE: "Baho qoldirdi",

  WALLET_TOPUP: "Hisobni töldirdi",
  PAYOUT_REQUEST: "Kartaga yeçiş söradi",
  PAYOUT_CANCEL: "Yeçiş sörovini bekor qildi",

  COMPLAINT_CREATE: "Şikoyat yubordi",
  USER_BLOCK: "Foydalanuvçini blokladi",
  USER_UNBLOCK: "Blokdan çiqardi",
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
    label: "Takliflar / şartnoma",
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
