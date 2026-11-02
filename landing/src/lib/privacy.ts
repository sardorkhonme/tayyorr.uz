// Maxfiylik siyosati — qaysi ma'lumotlar to'planadi va qanday ishlatiladi.
// Google OAuth tekshiruvi ham shu sahifaga havola qiladi (https://tayyorr.uz/privacy).
import type { TermsSection } from "@/lib/terms";

export const PRIVACY_UPDATED = "2026-10-11";

export const PRIVACY_INTRO =
  "Ushbu siyosat tayyorr.uz (veb-sayt va Android ilova) qaysi ma'lumotlarni to'plashi, " +
  "ulardan qanday foydalanishi va qanday himoya qilishini tushuntiradi. Biz ma'lumotlaringizni " +
  "sotmaymiz va reklama maqsadida uchinchi shaxslarga bermaymiz.";

export const PRIVACY: TermsSection[] = [
  {
    title: "1. Google hisobidan olinadigan ma'lumotlar",
    body: "Google orqali kirganingizda faqat quyidagilarni olamiz:",
    points: [
      "ism va familiya, email manzil, profil rasmi — hisobingizni yaratish va sizni tanish uchun;",
      "tug'ilgan kun — faqat Google oynasida bunga ruxsat bersangiz. U hisobingizdagi yosh ma'lumotini tekshirish uchun ishlatiladi va boshqa foydalanuvchilarga ko'rsatilmaydi.",
      "Google hisobingizdagi boshqa ma'lumotlar (kontaktlar, fayllar, xatlar va h.k.) olinmaydi.",
    ],
  },
  {
    title: "2. O'zingiz kiritadigan ma'lumotlar",
    points: [
      "ism, familiya, login, parol (shifrlangan holda saqlanadi), tug'ilgan sana, rol, o'zingiz haqingizda ma'lumot va profil rasmi;",
      "buyurtmalar, takliflar, shartnomalar, sharhlar va baholar;",
      "chatdagi xabarlar va yuborilgan fayllar (rasm, video, audio, hujjat);",
      "kartaga yechib olish so'rovida ko'rsatgan karta raqami va karta egasi nomi.",
    ],
  },
  {
    title: "3. To'lovlar",
    body:
      "Hisobni to'ldirish Click to'lov tizimining sahifasida amalga oshiriladi — karta ma'lumotlari tayyorr.uz'ga kelmaydi va saqlanmaydi. " +
      "Biz faqat to'lov summasi, holati va vaqtini saqlaymiz.",
  },
  {
    title: "4. Texnik ma'lumotlar",
    body:
      "Xavfsizlik va firibgarlikning oldini olish uchun kirishlar va muhim amallar vaqtida IP manzil va brauzer/qurilma ma'lumoti (User-Agent) saqlanadi. " +
      "Bildirishnomalar yoqilgan bo'lsa — ularni yetkazish uchun kerakli texnik identifikator saqlanadi. " +
      "Telegram botni ulasangiz — Telegram chat identifikatoringiz va foydalanuvchi nomingiz saqlanadi.",
  },
  {
    title: "5. Ma'lumotlardan foydalanish maqsadi",
    points: [
      "hisobingizni yuritish va xizmatni ko'rsatish (buyurtma, taklif, chat, hamyon);",
      "yangi xabar va buyurtma holati haqida bildirishnoma yuborish;",
      "xavfsizlik, firibgarlik va qoidabuzarliklarning oldini olish, shikoyatlarni ko'rib chiqish;",
      "qonun talab qilgan hollarda vakolatli organlarga ma'lumot berish.",
    ],
  },
  {
    title: "6. Kim ko'radi",
    body:
      "Profilingizdagi ism, login, rasm, reyting va siz yozgan ma'lumot boshqa foydalanuvchilarga ko'rinadi; email manzil qisman yashirilgan holda ko'rsatiladi. " +
      "Chat xabarlari faqat suhbat ishtirokchilariga ko'rinadi (shikoyat bo'lganda — moderatorga). " +
      "Ma'lumotlar xizmatni ta'minlovchi hamkorlar serverlarida (ma'lumotlar bazasi va fayl saqlash) shifrlangan aloqa orqali saqlanadi.",
  },
  {
    title: "7. Saqlash muddati va o'chirish",
    body:
      "Ma'lumotlar hisobingiz faol bo'lgan davrda saqlanadi. Profil ma'lumotlarini istalgan vaqtda o'zgartirishingiz mumkin. " +
      "Hisobni va unga tegishli ma'lumotlarni o'chirishni so'rash uchun saytdagi yoki ilovadagi qo'llab-quvvatlash chatiga (\"tayyorr.uz support\") yozing — so'rov 30 kun ichida bajariladi " +
      "(qonunan saqlanishi shart bo'lgan to'lov yozuvlari bundan mustasno).",
  },
  {
    title: "8. Bog'lanish",
    body:
      "Savollar va so'rovlar uchun — sayt yoki ilovadagi \"Xabarlar\" bo'limidagi \"tayyorr.uz support\" suhbati.",
  },
];
