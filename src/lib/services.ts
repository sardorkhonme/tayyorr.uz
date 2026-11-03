export interface ServiceFaq {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  /** sahifadagi <h1> */
  title: string;
  /** brauzer <title> (~60 belgigacha) */
  metaTitle: string;
  /** meta description (~155 belgi) */
  metaDescription: string;
  /** h1 ostidagi bitta jumla */
  tagline: string;
  /** kirish paragraflari */
  intro: string[];
  /** narx qanday belgilanishi haqida */
  price: string[];
  /** "nega tayyorr.uz" — 3 ta afzallik */
  points: { h: string; p: string }[];
  faq: ServiceFaq[];
}

const COMMON_POINTS: Service["points"] = [
  {
    h: "Mablağ xavfsiz saqlanadi",
    p: "Kelişilgan summa iş yakunlanguniça platforma hisobida bloklanadi. Tayyorlovçi işni topşirgaç va siz qabul qilgaç ötkaziladi — oldindan pul yöqotiş xavfi yöq.",
  },
  {
    h: "Reyting va şarhlar",
    p: "Har bir tayyorlovçining bajarilgan işlari, örtaça bahosi va haqiqiy şarhlari oçiq. Işni kimga topşirayotganingizni oldindan körasiz.",
  },
  {
    h: "Töğridan-töğri muloqot",
    p: "Buyurtma böyiça barça savollar sayt içidagi çatda hal qilinadi: talablar, misollar, oraliq natijalar — hammasi bir joyda.",
  },
];

export const SERVICES: Service[] = [
  {
    slug: "prezentatsiya-tayyorlash",
    title: "Prezentatsiya tayyorlaş",
    metaTitle: "Prezentatsiya tayyorlaş — buyurtma qiliş",
    metaDescription:
      "Kurs işi, diplom himoyasi yoki dars uçun professional PowerPoint prezentatsiya buyurtma qiling. Dizayn, matn va slaydlar — işonçli tayyorlovçilardan.",
    tagline:
      "Himoya, taqdimot yoki dars uçun toza dizaynli slaydlarni tajribali mutaxassislardan buyurtma qiling.",
    intro: [
      "Prezentatsiya — işingizning yuzi. Mazmun qançalik kuçli bölmasin, tartibsiz slaydlar, öqib bölmaydigan şrift va mos kelmaydigan ranglar taassurotni buzadi. tayyorr.uz orqali siz mavzuni, slaydlar sonini va muddatni körsatib buyurtma qoldirasiz — tayyorlovçilar esa öz narxi va namunalari bilan taklif yuboradi.",
      "Biz PowerPoint (PPTX), Google Slides yoki Canva formatidagi taqdimotlarni tayyorlaymiz: sarlavha slaydi, reja, asosiy qism, diagrammalar, xulosa va manbalar. Kerak bölsa spiker uçun qisqa matn (notes) ham qöşiladi.",
    ],
    price: [
      "tayyorr.uz — bu birja: narx qatʼiy emas, tayyorlovçilar taklif orqali belgilaydi. Odatda narxga slaydlar soni, dizayn murakkabligi (şablon yoki noldan), grafik va animatsiya hajmi hamda muddat taʼsir qiladi.",
      "Buyurtma qoldirganingizdan söng bir neça taklif olasiz va eng mos narx–sifat–muddat variantini özingiz tanlaysiz. Şoşilinç buyurtmalar (1–2 kun) biroz qimmatroq böladi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Prezentatsiya qança vaqtda tayyor böladi?",
        a: "Oddiy 10–15 slaydli taqdimot köpinça 1–3 kunda tayyor böladi. Aniq muddatni tayyorlovçi taklif yuborişda körsatadi, siz esa muddati mos kelganini tanlaysiz.",
      },
      {
        q: "Özimning matnim bölsa, faqat dizayn qilib berasizmi?",
        a: "Ha. Buyurtmada \"faqat dizayn\" deb belgilaysiz va tayyor matningizni yuklaysiz — tayyorlovçi uni çiroyli slaydlarga joylaştiradi.",
      },
      {
        q: "Tayyor faylni qaysi formatda olaman?",
        a: "Odatda tahrirlaş mumkin bölgan PPTX. Kelişuvga qarab PDF, Google Slides havolasi yoki Canva loyihasi ham beriladi.",
      },
      {
        q: "Tuzatiş (pravka) kiritsam böladimi?",
        a: "Ha, oraliq natijani körib çatda izohlaringizni yozasiz. Tuzatişlar şartlari tayyorlovçi bilan kelişiladi.",
      },
      {
        q: "Tölov qanday amalga oşadi?",
        a: "Summa platforma hamyoni orqali bloklanadi va iş qabul qilingandan keyingina tayyorlovçiga ötadi.",
      },
    ],
  },
  {
    slug: "kurs-ishi",
    title: "Kurs işi tayyorlaş",
    metaTitle: "Kurs işi tayyorlaş — buyurtma va narx",
    metaDescription:
      "Kurs işini reja, nazariy qism, amaliy tahlil va adabiyotlar röyxati bilan buyurtma qiling. Antiplagiat talablariga mos, muddatida.",
    tagline:
      "Reja tuzişdan yakuniy rasmiylaştirişgaça — kurs işini bosqiçma-bosqiç tayyorlab beruvçilar.",
    intro: [
      "Kurs işi — talabadan mustaqil tahlil, manbalar bilan işlaş va ilmiy uslubda yozişni talab qiladigan yirik iş. tayyorr.uz'da siz mavzu, fan, hajm (sahifalar soni), talab qilinadigan originallik foizi va topşiriş muddatini körsatasiz.",
      "Tayyorlovçilar odatda quyidagilarni bajaradi: mavzu böyiça reja, kiriş, nazariy bob, amaliy yoki tahliliy bob, xulosa va tavsiyalar, foydalanilgan adabiyotlar röyxati hamda ilovalar. Rasmiylaştiriş (şrift, interval, hoşiya, iqtiboslar) universitetingiz talablariga moslaştiriladi.",
    ],
    price: [
      "Narx taklif orqali şakllanadi va asosan hajm (sahifalar), fan murakkabligi, amaliy hisob-kitob yoki tahlil bor-yöqligi va muddatga boğliq. Statistik maʼlumot, sörovnoma yoki dasturiy qism kerak bölsa, buni buyurtmada alohida yozing.",
      "Bir neçta tayyorlovçidan taklif kelgaç, ularning reytingi, oldingi işlari va narxini soliştirib tanlaysiz. Butun summani oldindan beriş şart emas — u şartnoma böyiça bloklanadi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Kurs işi originallik (antiplagiat) talabiga javob beradimi?",
        a: "Buyurtmada kerakli originallik foizini körsatasiz. Tayyorlovçi şu talabga muvofiq yozadi; kelişuvga köra tekşiruv hisobotini ham ilova qilişi mumkin.",
      },
      {
        q: "Universitetimning rasmiylaştiriş talablari boşqaça — hisobga olinadimi?",
        a: "Ha. Metodik qöllanma yoki namunani yuklang — şrift, interval, hoşiya va iqtiboslar uslubi öşanga moslanadi.",
      },
      {
        q: "Işni bölib-bölib olsam böladimi?",
        a: "Köpinça ha: avval reja va nazariy qism, keyin qolgani. Bosqiçlarni tayyorlovçi bilan çatda kelişasiz.",
      },
      {
        q: "Muddat qança?",
        a: "Örtaça kurs işi 5–14 kun. Şoşilinç variantlar ham böladi, lekin narxi yuqoriroq.",
      },
      {
        q: "Tayyorlovçi işni bitirmasa-çi?",
        a: "Şartnoma bajarilmasa, bloklangan mablağ sizga qaytariladi. Nizolarda platforma administratsiyasi vositaçilik qiladi.",
      },
    ],
  },
  {
    slug: "referat",
    title: "Referat tayyorlaş",
    metaTitle: "Referat tayyorlaş — tez va sifatli",
    metaDescription:
      "Istalgan fandan referat buyurtma qiling: reja, mavzu bayoni, xulosa va adabiyotlar. Qisqa muddatda, talab qilingan hajmda.",
    tagline:
      "Istalgan fan böyiça tuzilgan, manbalarga asoslangan referatni qisqa muddatda oling.",
    intro: [
      "Referat — mavzuni qisqa va tizimli yoritadigan iş. Köpinça 10–20 sahifa: titul, reja, kiriş, 2–3 bölim, xulosa va foydalanilgan adabiyotlar. tayyorr.uz orqali mavzu va hajmni körsatib buyurtma qoldirasiz.",
      "Tayyorlovçilar mavzuni işonçli manbalar asosida yoritadi, iqtiboslarni töğri rasmiylaştiradi va matnni sizning kursingiz darajasiga moslaydi. Kerak bölsa taqdimot ham qöşimça buyurtma sifatida qilinadi.",
    ],
    price: [
      "Referat odatda eng arzon iş turi, çunki hajmi kiçik. Narxga baribir muddat (bugun yoki ertaga kerakmi), fan va originallik talabi taʼsir qiladi.",
      "Takliflar orasidan narx va tayyorlovçi reytingiga qarab tanlaysiz. Tölov iş qabul qilingandan keyin ötadi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Referatni bugun buyurtma qilsam, ertaga olsam böladimi?",
        a: "Köp hollarda ha. Şoşilinç buyurtmani oçib, muddatni 1 kun deb belgilang — şunga tayyor tayyorlovçilar taklif yuboradi.",
      },
      {
        q: "Mavzuni özim tanlaşim şartmi?",
        a: "Yöq. Faqat fan va yönalişni yozsangiz, tayyorlovçi mos mavzu taklif qilişi mumkin.",
      },
      {
        q: "Hajmi qança böladi?",
        a: "Siz belgilaysiz — masalan 12–15 sahifa. Talab bölmasa, standart 10–15 sahifa qilinadi.",
      },
      {
        q: "Manbalar körsatiladimi?",
        a: "Ha, foydalanilgan adabiyotlar röyxati va matn içida iqtiboslar rasmiylaştiriladi.",
      },
      {
        q: "Word faylida beriladimi?",
        a: "Ha, tahrir qilsa böladigan .docx. Kerak bölsa PDF ham.",
      },
    ],
  },
  {
    slug: "mustaqil-ish",
    title: "Mustaqil iş tayyorlaş",
    metaTitle: "Mustaqil iş tayyorlaş — buyurtma qiliş",
    metaDescription:
      "Fan böyiça mustaqil işni talab qilingan mavzu, hajm va rasmiylaştiriş bilan tayyorlab oling. Işonçli tayyorlovçilardan, muddatida.",
    tagline:
      "Semestr davomida topşiriladigan mustaqil işlarni talablarga mos holda tayyorlab beruvçilar.",
    intro: [
      "Mustaqil iş (MI) — köp universitetlarda har fandan talab qilinadigan yozma topşiriq. U referatga öxşaydi, lekin köpinça aniq mavzular röyxati, hajmi va rasmiylaştiriş şakli öqituvçi tomonidan beriladi.",
      "tayyorr.uz'da siz şu talablarni (mavzu yoki mavzular, sahifa soni, muddat, namuna) buyurtmaga joylaysiz. Tayyorlovçi matnni tuzadi, manbalarni körsatadi va faylni kerakli şaklda rasmiylaştiradi.",
    ],
    price: [
      "Mustaqil iş narxi kiçik–örta oraliğida böladi va asosan hajm hamda muddatga boğliq. Bir neçta MIʼni birdan buyurtma qilsangiz, tayyorlovçilar odatda qulayroq narx taklif qiladi.",
      "Barça takliflarni körib, reyting va narx böyiça tanlaysiz. Mablağ şartnoma böyiça bloklanib, iş qabul qilingaç ötkaziladi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Bir neçta mustaqil işni birga buyurtma qilsam böladimi?",
        a: "Ha. Buyurtma tavsifida ularning röyxatini va har birining hajmini yozing — tayyorlovçi yagona narx taklif qiladi.",
      },
      {
        q: "Öqituvçi bergan namunaga mos böladimi?",
        a: "Ha, namuna yoki metodik körsatmani yuklasangiz, rasmiylaştiriş öşanga moslanadi.",
      },
      {
        q: "Originallik tekşiriladimi?",
        a: "Talab qilsangiz, tayyorlovçi belgilangan originallik foiziga amal qiladi.",
      },
      {
        q: "Qança vaqt oladi?",
        a: "Bitta MI odatda 1–4 kun. Aniq muddat taklifda körsatiladi.",
      },
      {
        q: "Fayl formati qanday?",
        a: "Word (.docx), kerak bölsa PDF. Titul varaği ham qöşiladi.",
      },
    ],
  },
  {
    slug: "diplom-ishi",
    title: "Diplom (bitiruv malakaviy) işi tayyorlaşda yordam",
    metaTitle: "Diplom işi tayyorlaşda yordam",
    metaDescription:
      "Bitiruv malakaviy işi böyiça reja, nazariy va amaliy boblar, tahlil va rasmiylaştirişda tajribali mutaxassislardan yordam oling.",
    tagline:
      "Bitiruv işining reja, adabiyotlar tahlili, amaliy qism va rasmiylaştiriş bosqiçlarida kömak.",
    intro: [
      "Diplom işi — eng katta va masʼuliyatli talaba işi: u çuqur tahlil, amaliy qism, baʼzan tajriba yoki hisob-kitobni talab qiladi. tayyorr.uz orqali siz mavzu, yönaliş, hajm, originallik talabi va bosqiçli muddatlarni körsatib buyurtma qoldirasiz.",
      "Tayyorlovçilar reja va adabiyotlar röyxati, nazariy bob, amaliy yoki tahliliy bob, xulosa, tavsiyalar va ilovalar ustida işlaydi. Işni bob-bob qabul qiliş va har bosqiçda çatda muhokama qiliş mumkin.",
    ],
    price: [
      "Diplom işi narxi eng yuqori, çunki hajmi katta va tahlil çuqur. Narxga yönaliş murakkabligi, amaliy qism turi (sörovnoma, dastur, moliyaviy tahlil), sahifalar soni va umumiy muddat taʼsir qiladi.",
      "Bir neçta tajribali tayyorlovçidan taklif olib, portfolio va reytingni soliştirib tanlaysiz. Tölov bosqiçli bölişi mumkin: har qabul qilingan bob uçun alohida yoki umumiy şartnoma böyiça.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Diplom işini bölaklab (bob-bob) olsam böladimi?",
        a: "Ha, tavsiya etiladi. Odatda avval reja va nazariy bob, keyin amaliy bob, söng xulosa. Har bosqiç çatda tasdiqlanadi.",
      },
      {
        q: "Amaliy qism (hisob-kitob, sörovnoma) ham qilinadimi?",
        a: "Ha, buyurtmada aniq yozing: qanday maʼlumot, qanday tahlil yoki dastur kerak. Bu narx va muddatga taʼsir qiladi.",
      },
      {
        q: "Originallik qança böladi?",
        a: "Siz talab qilgan foiz böyiça. Kelişuvga köra tekşiruv hisoboti ham beriladi.",
      },
      {
        q: "Rasmiylaştiriş standarti hisobga olinadimi?",
        a: "Ha — universitet metodik qöllanmasi böyiça şrift, interval, iqtibos va manbalar rasmiylaştiriladi.",
      },
      {
        q: "Işni topşirgandan keyin savol tuğilsa?",
        a: "Çat buyurtma yakunlangandan keyin ham oçiq qoladi — qöşimça izoh yoki kiçik tuzatişlar böyiça tayyorlovçi bilan boğlana olasiz.",
      },
    ],
  },
];

export function getService(slug: string): Service | null {
  return SERVICES.find((s) => s.slug === slug) ?? null;
}
