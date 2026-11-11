import type { IconName } from "@/components/icons";

/**
 * Qo'llanma ma'lumotlari — sayt (/qollanma) va mobil ilova (/api/m/guide) uchun umumiy.
 * Provayder xizmat nomlaridagi inglizcha yozuvlar (No Refill, Non-Drop, Instant Start ...) va qoidalar.
 */
export type Tone = "good" | "ok" | "bad" | "info";
export type Term = { names: string[]; title: string; text: string; tone: Tone };
export type Section = { id: string; icon: IconName; title: string; lead: string; terms: Term[] };

export const TONE: Record<Tone, { dot: string; label: string; cls: string }> = {
  good: { dot: "bg-emerald-500", label: "Tavsiya", cls: "bg-emerald-50 text-emerald-700" },
  ok: { dot: "bg-sky-500", label: "Yaxşi", cls: "bg-sky-50 text-sky-700" },
  bad: { dot: "bg-amber-500", label: "Ehtiyot böling", cls: "bg-amber-50 text-amber-800" },
  info: { dot: "bg-zinc-400", label: "Maʼlumot", cls: "bg-zinc-100 text-zinc-600" },
};

export const RULES = [
  { icon: "♻️", text: "Obunaçi va aʼzo uçun faqat yaşil ♻️ kafolatli xizmatni oling." },
  { icon: "🔓", text: "Sahifa oçiq bölsin, buyurtma tugaguncha username'ni özgartirmang." },
  { icon: "🧪", text: "Yangi xizmatni avval kiçik miqdorda sinab köring." },
];

export const SECTIONS: Section[] = [
  {
    id: "kafolat",
    icon: "shield",
    title: "Kafolat (Refill) va kamayiş (Drop)",
    lead:
      "Instagram, TikTok va Telegram vaqti-vaqti bilan soxta va faol bölmagan akkauntlarni öçirib turadi — şunda obunaçi, layk yoki aʼzolar soni kamayadi. Buni «drop» (tuşiş) deyişadi. Kafolatli xizmatda kamaygan qismi qayta töldiriladi, kafolatsizda — yöq.",
    terms: [
      {
        names: ["No Refill", "No-Refill"],
        title: "Kafolatsiz",
        text:
          "Kamaysa qayta töldirilmaydi. Arzon, lekin obunaçilar bir neça kun yoki hafta içida tuşib ketişi mumkin — bazan deyarli hammasi. Bizda «⚠️ Kafolatsiz» deb körsatiladi. Körişlar uçun muammo emas, obunaçi uçun tavsiya etilmaydi.",
        tone: "bad",
      },
      {
        names: ["Refill: 30 Days", "30 Days Refill", "Refill: 365 Days"],
        title: "N kun kafolat",
        text:
          "Şu kunlar içida kamaysa, provayder bepul qayta töldiradi. Qança uzoq bölsa — şunça yaxşi. Bizda «♻️ 30 kun kafolat» kabi körsatiladi.",
        tone: "good",
      },
      {
        names: ["Lifetime Refill", "Lifetime Guaranteed"],
        title: "Umrbod kafolat",
        text: "Kamaysa, muddat çegarasiz qayta töldiriladi (xizmat işlab turgan ekan). Obunaçi uçun eng işonçli tanlov.",
        tone: "good",
      },
      {
        names: ["Refill Button"],
        title: "Qayta töldiriş tugmasi",
        text: "Kamayganda qayta töldirişni söraş mumkin. Hozirça buning uçun supportga buyurtma raqami bilan yozasiz — biz provayderdan söraymiz.",
        tone: "good",
      },
      {
        names: ["Non-Drop", "Non Drop", "Drop: ~0%"],
        title: "Deyarli kamaymaydi",
        text: "Provayder bu akkauntlar deyarli öçirilmaydi deydi. Bu yaxşi belgi, lekin 100% vaʼda emas — kafolat bilan birga bölsa, eng yaxşisi.",
        tone: "good",
      },
      {
        names: ["Low Drop", "Low-Drop"],
        title: "Kam kamayadi",
        text: "Biroz tuşişi mumkin, lekin köp emas. Layk va körişlar uçun yetarli; obunaçi uçun kafolat ham bölsin.",
        tone: "ok",
      },
      {
        names: ["Drop: 45-60%", "Drop 20%"],
        title: "Kutilgan kamayiş foizi",
        text: "Provayder oldindan aytyapti: şunça foizi tuşib ketadi. Masalan 1000 ta olsangiz, 400–550 tasi qolişi mumkin. Kafolatsiz bölsa — tanlamang.",
        tone: "bad",
      },
      {
        names: ["Stable", "100% Stable"],
        title: "Barqaror",
        text: "Provayder fikriça kamayiş juda oz. «Non-Drop» bilan deyarli bir xil maʼno.",
        tone: "ok",
      },
    ],
  },
  {
    id: "tezlik",
    icon: "bolt",
    title: "Tezlik va boşlaniş",
    lead: "Buyurtma qaçon boşlanişi va qança tez yetkazilişi. Bu vaqtlar taxminiy — provayder band bölsa, sekinroq böliši mumkin.",
    terms: [
      {
        names: ["Instant", "Instant Start", "Start: INSTANT"],
        title: "Darhol boşlanadi",
        text: "Odatda buyurtmadan keyin bir neça daqiqa içida boşlanadi.",
        tone: "good",
      },
      {
        names: ["Start: 0-1H", "Start Time: 0-5 Min"],
        title: "Boşlaniş vaqti",
        text: "Buyurtma şu oraliq içida boşlanadi: H — soat, Min — daqiqa. «0-1H» — bir soatgaça.",
        tone: "info",
      },
      {
        names: ["Speed: 50K/Day", "Speed: 5K/Hour"],
        title: "Tezlik",
        text: "Bir kunda (Day) yoki soatda (Hour) taxminan qança yetkazilişi. K — ming: 50K = 50 000 ta.",
        tone: "info",
      },
      {
        names: ["Super Fast", "Very Instant"],
        title: "Juda tez",
        text: "Tez yetkaziladi. Obunaçi uçun juda tez öciş baʼzan Instagram eʼtiborini tortadi — katta miqdorni bölib bergan maʼqul.",
        tone: "ok",
      },
      {
        names: ["Slow", "Gradual"],
        title: "Sekin, bosqiçma-bosqiç",
        text: "Asta-sekin yetkaziladi — tabiiyroq körinadi va kamroq tuşadi. Şoşilmasangiz yaxşi tanlov.",
        tone: "ok",
      },
      {
        names: ["Extra Delivery"],
        title: "Ortiqça yetkaziladi",
        text: "Keyingi kamayişni qoplaş uçun biroz köproq yuboriladi.",
        tone: "ok",
      },
    ],
  },
  {
    id: "sifat",
    icon: "sparkles",
    title: "Akkauntlar sifati",
    lead:
      "Obunaçi, layk va izohlar qanday akkauntlardan kelişi. Esda tuting: bular — sonni oşiriş xizmatlari. Ular sizning mahsulotingizni sotib olmaydi va postlaringizni muntazam kuzatmaydi.",
    terms: [
      {
        names: ["Real", "Real Accounts", "100% Real"],
        title: "Haqiqiy körinişdagi akkauntlar",
        text: "Rasmi, postlari bor, tirik odamga öxşaydigan profillar. Kamroq öçiriladi va sahifangizda tabiiyroq körinadi.",
        tone: "good",
      },
      {
        names: ["HQ", "High Quality", "HQ Profiles"],
        title: "Sifatli profillar",
        text: "Töliq tözdirilgan (rasm, ism, postlar) profillar. Botlardan yaxşiroq.",
        tone: "ok",
      },
      {
        names: ["Old Accounts", "Premium Accounts"],
        title: "Eski / premium akkauntlar",
        text: "Ançadan beri mavjud akkauntlar — Instagram ularni kamroq öçiradi.",
        tone: "ok",
      },
      {
        names: ["MIX", "Mix Premium"],
        title: "Aralaş",
        text: "Har xil sifatdagi akkauntlar aralaşmasi.",
        tone: "info",
      },
      {
        names: ["Bot", "Bot Mix"],
        title: "Bot akkauntlar",
        text: "Eng arzon, lekin eng köp öçiriladi va sahifada soxta körinadi. Obunaçi uçun tavsiya etilmaydi.",
        tone: "bad",
      },
    ],
  },
  {
    id: "davlat",
    icon: "users",
    title: "Davlat va auditoriya",
    lead: "Akkauntlar qaysi davlatdan ekanligi. Instagram statistikangizda auditoriya şu davlat bölib körinadi.",
    terms: [
      {
        names: ["Worldwide", "WW", "Global"],
        title: "Turli davlatlar",
        text: "Butun dunyodan aralaş akkauntlar. Eng keng tarqalgan tur.",
        tone: "info",
      },
      {
        names: ["Indian", "Brazil", "USA", "Turkey", "Arab"],
        title: "Bitta davlat",
        text: "Faqat şu davlat akkauntlari. Son oşadi, lekin ular özbekça kontentni tuşunmaydi — faqat sonni oşiriş kerak bölsa tanlang.",
        tone: "info",
      },
      {
        names: ["Only Indonesia Link", "Only Thailand Link"],
        title: "Faqat şu davlat havolasi uçun",
        text: "Bu xizmat FAQAT şu davlatdagi sahifa/post uçun işlaydi. Boşqa havolaga bersangiz, bajarilmaydi.",
        tone: "bad",
      },
    ],
  },
  {
    id: "boshqa",
    icon: "grid",
    title: "Boşqa yozuvlar",
    lead: "Xizmat nomlarida tez-tez uçraydigan qolgan belgilar.",
    terms: [
      {
        names: ["Recommend", "Best", "Very Stable", "Cheapest"],
        title: "Provayderning öz reklamasi",
        text:
          "Bu sözlar — provayderning maqtovi, kafolat emas. Masalan, «Recommend» deb yozilgan xizmatning nomida «Drop: 45-60%» va «No Refill» ham turişi mumkin. Har doim kafolat yorliğiga qarang.",
        tone: "bad",
      },
      {
        names: ["Cancel Button", "Cancel Enable"],
        title: "Bekor qiliş mumkin",
        text: "Buyurtma juda sekin ketsa, bekor qilib, bajarilmagan qism pulini qaytariş mumkin. Buning uçun supportga yozing.",
        tone: "good",
      },
      {
        names: ["Min 100", "Max 100K", "Unlimited"],
        title: "Miqdor çegarasi",
        text: "Bir buyurtmada eng kam (Min) va eng köp (Max) miqdor. Unlimited — çeksiz. Kartada «100 – 300 000 ta» deb ham körsatilgan.",
        tone: "info",
      },
      {
        names: ["All Link"],
        title: "Barça havolalar",
        text: "Post, Reels, video — har qanday havola turiga işlaydi.",
        tone: "info",
      },
      {
        names: ["Last 5 Post"],
        title: "Oxirgi N ta postga",
        text: "Profil havolasini berasiz — xizmat oxirgi N ta postga bölib yetkaziladi.",
        tone: "info",
      },
      {
        names: ["Random Comments", "Custom Comments"],
        title: "Izoh turi",
        text: "Random — matni tasodifiy (siz tanlay olmaysiz). Custom — matnni özingiz yozasiz.",
        tone: "info",
      },
      {
        names: ["Concurrent", "60 Minutes", "Stay time"],
        title: "Jonli efir tomoşabinlari",
        text: "Efir davomida körsatilgan vaqt turadigan tomoşabinlar. Faqat efir boşlangandan keyin buyurtma bering.",
        tone: "info",
      },
      {
        names: ["Love", "Wow", "Haha", "Sad", "Angry"],
        title: "Reaksiya turi",
        text: "Qaysi reaksiya qöyilişi (Facebook, Telegram va boşqalar uçun).",
        tone: "info",
      },
      {
        names: ["Social Ads", "Native Ads", "Discovery"],
        title: "Körişlar manbai",
        text: "YouTube körişlari qayerdan kelişi: reklama, tavsiyalar va hokazo.",
        tone: "info",
      },
    ],
  },
];

export const PICKS: { icon: IconName; kind: string; text: string }[] = [
  { icon: "users", kind: "Obunaçi", text: "faqat ♻️ kafolatli" },
  { icon: "heart", kind: "Layk", text: "«Low Drop» / «Non-Drop» yetarli" },
  { icon: "eye", kind: "Köriş", text: "arzoni ham bölaveradi" },
  { icon: "message", kind: "Izoh", text: "matn kerak bölsa — «Custom»" },
];

