// Ommaviy oferta / foydalanish shartlari.
// Versiya o'zgarganda foydalanuvchidan qayta rozilik so'raladi.
export const TERMS_VERSION = "2026-09-04";

export interface TermsSection {
  title: string;
  body?: string;
  points?: string[];
}

export const TERMS_INTRO =
  "tayyorr.uz — buyurtma beruvchilar va ish tayyorlovchilarni bog'lovchi platforma. " +
  "Ro'yxatdan o'tish tugmasini bosish orqali siz quyidagi shartlarning barchasini o'qib chiqqaningizni va ularga to'liq rozi ekaningizni tasdiqlaysiz.";

export const TERMS: TermsSection[] = [
  {
    title: "1. Ma'lumotlarni o'z ixtiyoringiz bilan berasiz",
    body:
      "Ism, familiya, login, rasm, aloqa va boshqa ma'lumotlarni — xuddi boshqa har qanday saytdagi kabi — hech kimning majburlashisiz, o'z xohishingiz bilan taqdim etayotganingizni tasdiqlaysiz. " +
      "Bu ma'lumotlar xizmatning ishlashi, hisobingiz xavfsizligi va tomonlar o'rtasidagi ishonch uchun ishlatiladi. Istalgan vaqtda profilingizdan ularni tahrirlashingiz mumkin.",
  },
  {
    title: "2. Har bir harakat uchun javobgarsiz",
    body:
      "Saytda siz nomingizdan qilingan har bir harakat — buyurtma, taklif, shartnoma, xabar, to'lov, yuklangan fayl va sharh — uchun to'liq javobgarlik sizning zimmangizda. " +
      "Loginingizni boshqalarga bermang. Hisobingiz orqali sodir bo'lgan har qanday amal siz tomoningizdan qilingan deb hisoblanadi.",
  },
  {
    title: "3. Taqiqlangan — yomon niyatli ishlar",
    body:
      "Quyidagilarga buyurtma berish ham, ularni bajarish ham qat'iyan taqiqlanadi:",
    points: [
      "Imtihon, DTM, attestatsiya, litsenziya yoki sertifikatlash sinovlarida g'irromlik qilish uchun mo'ljallangan materiallar;",
      "Boshqa shaxs nomidan soxta hujjat, diplom, sertifikat, spravka, ish tajribasi yoki tarjimai hol tayyorlash;",
      "Birovning tayyor ishini o'zinikidek rasmiy topshirish maqsadidagi plagiat buyurtmalar;",
      "Qonunga zid, zo'ravonlik, ekstremizm, terrorizm, kamsitish, nafrat, pornografiya yoki giyohvand moddalarni targ'ib qiluvchi kontent;",
      "Firibgarlik, «qora» pul sxemalari, odamlarni aldash yoki qo'rqitish uchun matn, dizayn yoki dastur;",
      "Uchinchi shaxsning shaxsiy ma'lumotlarini uning roziligisiz to'plash yoki qayta ishlash;",
      "Mualliflik huquqi buzilgan yoki o'g'irlangan materiallar.",
    ],
  },
  {
    title: "4. Chatda o'zaro hurmat",
    body:
      "Muloqot faqat ishga oid va xushmuomala bo'lishi shart. Taqiqlanadi:",
    points: [
      "Haqorat, kamsitish, tahdid, tovlamachilik va shantaj;",
      "Spam, reklama, aloqa ma'lumotlarini majburan so'rash yoki tarqatish;",
      "Jinsiy yoki bezovta qiluvchi xabarlar;",
      "To'lovni sayt hamyonidan tashqarida amalga oshirishga undash.",
    ],
  },
  {
    title: "5. To'lovlar va hamyon",
    body:
      "Barcha hisob-kitob sayt hamyoni orqali yuritiladi. Shartnoma tuzilganda mablag' bloklanadi; ish yakunlanganda tayyorlovchiga o'tadi (sayt komissiyasi ushlab qolinadi). " +
      "Shartnoma bekor qilinsa, mablag' shartlarga muvofiq buyurtmachiga qaytariladi. Kartaga yechish so'rovlari qayta ishlanadi va noto'g'ri karta ma'lumotlarida rad etilishi mumkin.",
  },
  {
    title: "6. Faoliyat qayd etib boriladi",
    body:
      "Xavfsizlik, nizolarni hal qilish va suiiste'molning oldini olish maqsadida saytdagi harakatlaringiz (kirish, buyurtma, taklif, shartnoma, to'lov va boshqalar) texnik jurnalda saqlanadi. " +
      "Bu ma'lumotlardan faqat administratsiya va tegishli qonuniy so'rovlar doirasida foydalaniladi.",
  },
  {
    title: "7. Cheklovlar",
    body:
      "Ushbu shartlar buzilsa, administratsiya oldindan ogohlantirishsiz hisobni vaqtincha cheklashi, buyurtmani yoki xabarni o'chirishi yoxud hisobni butunlay o'chirishi mumkin. " +
      "Jiddiy hollarda ma'lumotlar tegishli organlarga topshirilishi mumkin.",
  },
  {
    title: "8. Kelishuvning o'zgarishi",
    body:
      "Shartlar vaqti-vaqti bilan yangilanib turishi mumkin. Muhim o'zgarishlardan so'ng saytdan foydalanishni davom ettirish yangi shartlarga rozilik deb hisoblanadi.",
  },
];
