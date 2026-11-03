// Ommaviy oferta / foydalanish shartlari.
// Versiya o'zgarganda foydalanuvchidan qayta rozilik so'raladi.
export const TERMS_VERSION = "2026-09-04";

export interface TermsSection {
  title: string;
  body?: string;
  points?: string[];
}

export const TERMS_INTRO =
  "tayyorr.uz — buyurtma beruvçilar va iş tayyorlovçilarni boğlovçi platforma. " +
  "Röyxatdan ötiş tugmasini bosiş orqali siz quyidagi şartlarning barçasini öqib çiqqaningizni va ularga töliq rozi ekaningizni tasdiqlaysiz.";

export const TERMS: TermsSection[] = [
  {
    title: "1. Maʼlumotlarni öz ixtiyoringiz bilan berasiz",
    body:
      "Ism, familiya, login, rasm, aloqa va boşqa maʼlumotlarni — xuddi boşqa har qanday saytdagi kabi — heç kimning majburlaşisiz, öz xohişingiz bilan taqdim etayotganingizni tasdiqlaysiz. " +
      "Bu maʼlumotlar xizmatning işlaşi, hisobingiz xavfsizligi va tomonlar örtasidagi işonç uçun işlatiladi. Istalgan vaqtda profilingizdan ularni tahrirlaşingiz mumkin.",
  },
  {
    title: "2. Har bir harakat uçun javobgarsiz",
    body:
      "Saytda siz nomingizdan qilingan har bir harakat — buyurtma, taklif, şartnoma, xabar, tölov, yuklangan fayl va şarh — uçun töliq javobgarlik sizning zimmangizda. " +
      "Loginingizni boşqalarga bermang. Hisobingiz orqali sodir bölgan har qanday amal siz tomoningizdan qilingan deb hisoblanadi.",
  },
  {
    title: "3. Taqiqlangan — yomon niyatli işlar",
    body:
      "Quyidagilarga buyurtma beriş ham, ularni bajariş ham qatʼiyan taqiqlanadi:",
    points: [
      "Imtihon, DTM, attestatsiya, litsenziya yoki sertifikatlaş sinovlarida ğirromlik qiliş uçun möljallangan materiallar;",
      "Boşqa şaxs nomidan soxta hujjat, diplom, sertifikat, spravka, iş tajribasi yoki tarjimai hol tayyorlaş;",
      "Birovning tayyor işini özinikidek rasmiy topşiriş maqsadidagi plagiat buyurtmalar;",
      "Qonunga zid, zöravonlik, ekstremizm, terrorizm, kamsitiş, nafrat, pornografiya yoki giyohvand moddalarni tarğib qiluvçi kontent;",
      "Firibgarlik, «qora» pul sxemalari, odamlarni aldaş yoki qörqitiş uçun matn, dizayn yoki dastur;",
      "Uçinçi şaxsning şaxsiy maʼlumotlarini uning roziligisiz töplaş yoki qayta işlaş;",
      "Mualliflik huquqi buzilgan yoki öğirlangan materiallar.",
    ],
  },
  {
    title: "4. Çatda özaro hurmat",
    body:
      "Muloqot faqat işga oid va xuşmuomala bölişi şart. Taqiqlanadi:",
    points: [
      "Haqorat, kamsitiş, tahdid, tovlamaçilik va şantaj;",
      "Spam, reklama, aloqa maʼlumotlarini majburan söraş yoki tarqatiş;",
      "Jinsiy yoki bezovta qiluvçi xabarlar;",
      "Tölovni sayt hamyonidan taşqarida amalga oşirişga undaş.",
    ],
  },
  {
    title: "5. Tölovlar va hamyon",
    body:
      "Barça hisob-kitob sayt hamyoni orqali yuritiladi. Şartnoma tuzilganda mablağ bloklanadi; iş yakunlanganda tayyorlovçiga ötadi (sayt komissiyasi uşlab qolinadi). " +
      "Şartnoma bekor qilinsa, mablağ şartlarga muvofiq buyurtmaçiga qaytariladi. Kartaga yeçiş sörovlari qayta işlanadi va notöğri karta maʼlumotlarida rad etilişi mumkin.",
  },
  {
    title: "6. Faoliyat qayd etib boriladi",
    body:
      "Xavfsizlik, nizolarni hal qiliş va suiisteʼmolning oldini oliş maqsadida saytdagi harakatlaringiz (kiriş, buyurtma, taklif, şartnoma, tölov va boşqalar) texnik jurnalda saqlanadi. " +
      "Bu maʼlumotlardan faqat administratsiya va tegişli qonuniy sörovlar doirasida foydalaniladi.",
  },
  {
    title: "7. Çeklovlar",
    body:
      "Uşbu şartlar buzilsa, administratsiya oldindan ogohlantirişsiz hisobni vaqtinça çeklaşi, buyurtmani yoki xabarni öçirişi yoxud hisobni butunlay öçirişi mumkin. " +
      "Jiddiy hollarda maʼlumotlar tegişli organlarga topşirilişi mumkin.",
  },
  {
    title: "8. Kelişuvning özgarişi",
    body:
      "Şartlar vaqti-vaqti bilan yangilanib turişi mumkin. Muhim özgarişlardan söng saytdan foydalanişni davom ettiriş yangi şartlarga rozilik deb hisoblanadi.",
  },
];
