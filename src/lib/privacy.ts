// Maxfiylik siyosati — qaysi ma'lumotlar to'planadi va qanday ishlatiladi.
// Google OAuth tekshiruvi ham shu sahifaga havola qiladi (https://tayyorr.uz/privacy).
import type { TermsSection } from "@/lib/terms";

export const PRIVACY_UPDATED = "2026-10-11";

export const PRIVACY_INTRO =
  "Uşbu siyosat tayyorr.uz (veb-sayt va Android ilova) qaysi maʼlumotlarni töplaşi, " +
  "ulardan qanday foydalanişi va qanday himoya qilişini tuşuntiradi. Biz maʼlumotlaringizni " +
  "sotmaymiz va reklama maqsadida uçinçi şaxslarga bermaymiz.";

export const PRIVACY: TermsSection[] = [
  {
    title: "1. Google hisobidan olinadigan maʼlumotlar",
    body: "Google orqali kirganingizda faqat quyidagilarni olamiz:",
    points: [
      "ism va familiya, email manzil, profil rasmi — hisobingizni yaratiş va sizni taniş uçun;",
      "tuğilgan kun — faqat Google oynasida bunga ruxsat bersangiz. U hisobingizdagi yoş maʼlumotini tekşiriş uçun işlatiladi va boşqa foydalanuvçilarga körsatilmaydi.",
      "Google hisobingizdagi boşqa maʼlumotlar (kontaktlar, fayllar, xatlar va h.k.) olinmaydi.",
    ],
  },
  {
    title: "2. Özingiz kiritadigan maʼlumotlar",
    points: [
      "ism, familiya, login, parol (şifrlangan holda saqlanadi), tuğilgan sana, rol, özingiz haqingizda maʼlumot va profil rasmi;",
      "buyurtmalar, takliflar, şartnomalar, şarhlar va baholar;",
      "çatdagi xabarlar va yuborilgan fayllar (rasm, video, audio, hujjat);",
      "kartaga yeçib oliş sörovida körsatgan karta raqami va karta egasi nomi.",
    ],
  },
  {
    title: "3. Tölovlar",
    body:
      "Hisobni töldiriş Click tölov tizimining sahifasida amalga oşiriladi — karta maʼlumotlari tayyorr.uz'ga kelmaydi va saqlanmaydi. " +
      "Biz faqat tölov summasi, holati va vaqtini saqlaymiz.",
  },
  {
    title: "4. Texnik maʼlumotlar",
    body:
      "Xavfsizlik va firibgarlikning oldini oliş uçun kirişlar va muhim amallar vaqtida IP manzil va brauzer/qurilma maʼlumoti (User-Agent) saqlanadi. " +
      "Bildirişnomalar yoqilgan bölsa — ularni yetkaziş uçun kerakli texnik identifikator saqlanadi. " +
      "Telegram botni ulasangiz — Telegram çat identifikatoringiz va foydalanuvçi nomingiz saqlanadi.",
  },
  {
    title: "5. Maʼlumotlardan foydalaniş maqsadi",
    points: [
      "hisobingizni yuritiş va xizmatni körsatiş (buyurtma, taklif, çat, hamyon);",
      "yangi xabar va buyurtma holati haqida bildirişnoma yuboriş;",
      "xavfsizlik, firibgarlik va qoidabuzarliklarning oldini oliş, şikoyatlarni körib çiqiş;",
      "qonun talab qilgan hollarda vakolatli organlarga maʼlumot beriş.",
    ],
  },
  {
    title: "6. Kim köradi",
    body:
      "Profilingizdagi ism, login, rasm, reyting va siz yozgan maʼlumot boşqa foydalanuvçilarga körinadi; email manzil qisman yaşirilgan holda körsatiladi. " +
      "Çat xabarlari faqat suhbat iştirokçilariga körinadi (şikoyat bölganda — moderatorga). " +
      "Maʼlumotlar xizmatni taʼminlovçi hamkorlar serverlarida (maʼlumotlar bazasi va fayl saqlaş) şifrlangan aloqa orqali saqlanadi.",
  },
  {
    title: "7. Saqlaş muddati va öçiriş",
    body:
      "Maʼlumotlar hisobingiz faol bölgan davrda saqlanadi. Profil maʼlumotlarini istalgan vaqtda özgartirişingiz mumkin. " +
      "Hisobni va unga tegişli maʼlumotlarni öçirişni söraş uçun saytdagi yoki ilovadagi qöllab-quvvatlaş çatiga (\"tayyorr.uz support\") yozing — sörov 30 kun içida bajariladi " +
      "(qonunan saqlanişi şart bölgan tölov yozuvlari bundan mustasno).",
  },
  {
    title: "8. Boğlaniş",
    body:
      "Savollar va sörovlar uçun — sayt yoki ilovadagi \"Xabarlar\" bölimidagi \"tayyorr.uz support\" suhbati.",
  },
];
