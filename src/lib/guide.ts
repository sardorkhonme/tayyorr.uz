import { db } from "@/lib/db";
import type { IconName } from "@/components/icons";

/**
 * "Qo'llanma" bo'limi — har bir rol uchun ketma-ket qadamlar va admin
 * yuklaydigan video. Video manzili AppSetting'da: "guideVideo:ORDERER" /
 * "guideVideo:PREPARER" (admin/src/lib/guide-settings.ts bilan bir xil kalit).
 */
export type GuideRole = "ORDERER" | "PREPARER";
export const GUIDE_ROLES: GuideRole[] = ["ORDERER", "PREPARER"];
export const guideVideoKey = (role: GuideRole) => `guideVideo:${role}`;

export async function getGuideVideo(role: GuideRole): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key: guideVideoKey(role) } }).catch(() => null);
  if (!row) return null;
  try {
    const v = JSON.parse(row.value) as { url?: string };
    return v.url || null;
  } catch {
    return null;
  }
}

export interface GuideStep {
  icon: IconName;
  title: string;
  /** Har biri alohida qator/band */
  points: string[];
  /** Qadamga tegishli sahifa */
  link?: { href: string; label: string };
}

export const ROLE_TITLE: Record<GuideRole, string> = {
  ORDERER: "Buyurtma beruvçi",
  PREPARER: "Tayyorlovçi",
};

export function guideSteps(
  role: GuideRole,
  opts: { starPrice: number; minOfferStars: number },
): GuideStep[] {
  const price = `${opts.starPrice.toLocaleString("ru-RU")} söm`;

  if (role === "ORDERER") {
    return [
      {
        icon: "package",
        title: "Buyurtma bering",
        points: [
          "«Asosiy menyu»dagi «Yangi buyurtma» tugmasini bosing.",
          "Sarlavha, turini (prezentatsiya, kurs işi, referat, esse, diplom işi yoki boşqa), tavsifni, topşiriş muddatini va byudjetni yozing.",
          "Tavsifda mavzu, talablar, hajm va formatni aniq yozsangiz, köngillilar narxni töğri aytadi.",
        ],
        link: { href: "/orders/new", label: "Yangi buyurtma" },
      },
      {
        icon: "hand",
        title: "Köngillilarni kuting",
        points: [
          "Tayyorlovçilar buyurtmangizga narx va izoh bilan ariza yuboradi.",
          "Har bir yangi ariza haqida support çatiga xabar keladi (Telegram bot ulangan bölsa — botga ham).",
          "Arizalar röyxatda navbat böyiça turadi: ariza uçun köproq star sarflagan tayyorlovçi yuqoriroqda.",
        ],
      },
      {
        icon: "users",
        title: "Tayyorlovçini tanlang",
        points: [
          "Har bir köngillining reytingi, baholari va özi haqidagi maʼlumotni köring — ismini bossangiz profili oçiladi.",
          "«Çat» tugmasi orqali narx, muddat va talablarni kelişib oling.",
          "Mos kelmagan arizani «Rad etiş» bilan yopişingiz mumkin.",
        ],
      },
      {
        icon: "wallet",
        title: "Hisobingizni töldiring",
        points: [
          "«Hamyon» bölimida Click yoki Payme orqali hisobingizni töldiring.",
          "Şartnoma summasi hisobingizda bölişi kerak — usiz şartnoma yuborib bölmaydi.",
        ],
        link: { href: "/wallet", label: "Hamyon" },
      },
      {
        icon: "file",
        title: "Şartnoma tuzing",
        points: [
          "Tanlangan köngilli yonidagi «Şartnoma tuziş» tugmasini bosing: kelişilgan summa, topşiriş muddati va kerak bölsa şartlarni yozing.",
          "Summa hisobingizdan uşlab turiladi — tayyorlovçiga faqat iş qabul qilingandan keyin ötadi.",
          "Tayyorlovçi şartnomani qabul qilguncha uni bekor qilsangiz, pul darhol qaytadi.",
        ],
      },
      {
        icon: "clock",
        title: "Iş jarayonini kuzating",
        points: [
          "Tayyorlovçi şartnomani qabul qilgaç iş boşlanadi — savollarni çatda yozing.",
          "Muddat tugaguncha iş topşirilmasa, şartnoma özi bekor böladi va pul hisobingizga qaytadi.",
        ],
      },
      {
        icon: "check-circle",
        title: "Işni qabul qiling",
        points: [
          "Tayyorlovçi «Işni topşirdim» desa, natijani tekşiring.",
          "Hammasi joyida bölsa — «Işni yakunlaş»: pul tayyorlovçiga ötadi.",
          "Tuzatiş kerak bölsa — «Qayta işlaş»: sababini va yangi muddatni yozing.",
          "3 iş kuni içida javob bermasangiz, iş qabul qilingan hisoblanadi va pul tayyorlovçiga ötadi.",
        ],
      },
      {
        icon: "star",
        title: "Baho qöying",
        points: [
          "Iş yakunlangaç tayyorlovçiga baho va fikr qoldiring — bu boşqa buyurtmaçilarga tanlaşda yordam beradi.",
        ],
      },
      {
        icon: "scale",
        title: "Bekor qiliş va nizolar",
        points: [
          "Imzolangan şartnomani bir tomonlama bekor qilib bölmaydi — «Bekor qilişni söraş» tugmasini bosib sababini yozing.",
          "Tayyorlovçi 3 iş kuni içida javob beradi: rozi bölsa — şartnoma bekor böladi va pul sizga qaytadi.",
          "Rad etsa — javobi sizga qaytadi: «Şartnomani davom ettiraman» yoki «Qarorimni özgartirmayman» (unda masalani admin hal qiladi).",
        ],
      },
      {
        icon: "lifebuoy",
        title: "Yordam kerak bölsa",
        points: [
          "Support çatiga yozing — «Xabarlar» bölimida.",
          "Qoida buzilsa, foydalanuvçi yonidagi «Şikoyat» tugmasidan foydalaning.",
        ],
        link: { href: "/messages", label: "Xabarlar" },
      },
    ];
  }

  return [
    {
      icon: "user",
      title: "Profilingizni töldiring",
      points: [
        "Rasm qöying va özingiz haqingizda yozing: qaysi işlarni qilasiz, tajribangiz.",
        "Buyurtmaçi arizangizni körganda aynan şu maʼlumotni, reyting va baholaringizni köradi.",
      ],
      link: { href: "/profile", label: "Profil" },
    },
    {
      icon: "star",
      title: "Star oling",
      points: [
        `Buyurtmaga ariza yuboriş uçun star kerak — kamida ${opts.minOfferStars} ta.`,
        `Star «Hamyon» bölimida sotib olinadi: 1 star = ${price}. Avval hisobingizni Click yoki Payme orqali töldiring.`,
        "Döstlaringizni referal havolangiz orqali taklif qilsangiz, har biri uçun +1 star olasiz.",
      ],
      link: { href: "/wallet", label: "Hamyon" },
    },
    {
      icon: "search",
      title: "Buyurtma toping",
      points: [
        "«Asosiy menyu»da oçiq buyurtmalar röyxati turadi.",
        "Buyurtmani oçib tavsifi, muddati va byudjetini diqqat bilan öqing.",
      ],
      link: { href: "/dashboard", label: "Asosiy menyu" },
    },
    {
      icon: "send",
      title: "Ariza yuboring",
      points: [
        "Narxingizni va qisqa izoh yozing: qanday bajarasiz, qançada tayyor böladi.",
        `Arizaga star qöying (kamida ${opts.minOfferStars} ta) — köproq star bilan navbatda yuqoriroq turasiz.`,
        "Keyin ham «Navbatda yuqoriga çiqiş» orqali star qöşib örningizni kötarişingiz mumkin.",
        "Barça arizalaringiz va ularning holati «Mening takliflarim» bölimida.",
      ],
      link: { href: "/offers", label: "Mening takliflarim" },
    },
    {
      icon: "message",
      title: "Buyurtmaçi bilan kelişing",
      points: [
        "Buyurtmaçi sizga çatda yozişi mumkin — tez va aniq javob bering.",
        "Narx, muddat va talablarni oldindan kelişib oling.",
      ],
    },
    {
      icon: "file",
      title: "Şartnomani qabul qiling",
      points: [
        "Buyurtmaçi şartnoma yuborsa — summa, topşiriş muddati va şartlarni tekşiring.",
        "Rozi bölsangiz «Qabul qiliş va boşlaş», aks holda «Rad etiş».",
        "Şartnoma summasi buyurtmaçi hisobida uşlab turiladi — işni topşirsangiz, pulingiz kafolatlangan.",
      ],
    },
    {
      icon: "check",
      title: "Işni bajaring va topşiring",
      points: [
        "Işni muddatgaça bajaring — muddat ötib ketsa, şartnoma bekor böladi va pul buyurtmaçiga qaytadi.",
        "Tayyor fayllarni çatga yuboring va «Işni topşirdim» tugmasini bosing.",
      ],
    },
    {
      icon: "coins",
      title: "Pulingizni oling",
      points: [
        "Buyurtmaçi «Işni yakunlaş»ni bossa — şartnoma summasi hamyoningizga tuşadi.",
        "«Qayta işlaş» desa — sababini öqib, yangi muddatgaça tuzatib qayta topşiring.",
        "Buyurtmaçi 3 iş kuni içida javob bermasa, pul avtomatik ravişda sizga ötadi.",
      ],
    },
    {
      icon: "banknote",
      title: "Kartaga yeçib oling",
      points: [
        "«Hamyon» bölimida kartangiz raqamini va summani kiriting.",
        "Yeçib olişda 5% komissiya uşlanadi; sörovni admin körib çiqib kartangizga ötkazadi.",
      ],
      link: { href: "/wallet", label: "Hamyon" },
    },
    {
      icon: "scale",
      title: "Bekor qiliş va nizolar",
      points: [
        "Imzolangan şartnomani bir tomonlama bekor qilib bölmaydi — «Bekor qilişni söraş» orqali sababini yozing.",
        "Ikkinçi tomon 3 iş kuni içida javob beradi; rad etsa, javobi söragan tomonga qaytadi va u davom ettiriş yoki adminga yuboriş haqida qaror qiladi.",
        "Muammo bölsa support çatiga yozing yoki «Şikoyat» tugmasidan foydalaning.",
      ],
      link: { href: "/messages", label: "Xabarlar" },
    },
  ];
}
