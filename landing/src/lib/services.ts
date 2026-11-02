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
    h: "Mablag' xavfsiz saqlanadi",
    p: "Kelishilgan summa ish yakunlangunicha platforma hisobida bloklanadi. Tayyorlovchi ishni topshirgach va siz qabul qilgach o'tkaziladi — oldindan pul yo'qotish xavfi yo'q.",
  },
  {
    h: "Reyting va sharhlar",
    p: "Har bir tayyorlovchining bajarilgan ishlari, o'rtacha bahosi va haqiqiy sharhlari ochiq. Ishni kimga topshirayotganingizni oldindan ko'rasiz.",
  },
  {
    h: "To'g'ridan-to'g'ri muloqot",
    p: "Buyurtma bo'yicha barcha savollar sayt ichidagi chatda hal qilinadi: talablar, misollar, oraliq natijalar — hammasi bir joyda.",
  },
];

export const SERVICES: Service[] = [
  {
    slug: "prezentatsiya-tayyorlash",
    title: "Prezentatsiya tayyorlash",
    metaTitle: "Prezentatsiya tayyorlash — buyurtma qilish",
    metaDescription:
      "Kurs ishi, diplom himoyasi yoki dars uchun professional PowerPoint prezentatsiya buyurtma qiling. Dizayn, matn va slaydlar — ishonchli tayyorlovchilardan.",
    tagline:
      "Himoya, taqdimot yoki dars uchun toza dizaynli slaydlarni tajribali mutaxassislardan buyurtma qiling.",
    intro: [
      "Prezentatsiya — ishingizning yuzi. Mazmun qanchalik kuchli bo'lmasin, tartibsiz slaydlar, o'qib bo'lmaydigan shrift va mos kelmaydigan ranglar taassurotni buzadi. tayyorr.uz orqali siz mavzuni, slaydlar sonini va muddatni ko'rsatib buyurtma qoldirasiz — tayyorlovchilar esa o'z narxi va namunalari bilan taklif yuboradi.",
      "Biz PowerPoint (PPTX), Google Slides yoki Canva formatidagi taqdimotlarni tayyorlaymiz: sarlavha slaydi, reja, asosiy qism, diagrammalar, xulosa va manbalar. Kerak bo'lsa spiker uchun qisqa matn (notes) ham qo'shiladi.",
    ],
    price: [
      "tayyorr.uz — bu birja: narx qat'iy emas, tayyorlovchilar taklif orqali belgilaydi. Odatda narxga slaydlar soni, dizayn murakkabligi (shablon yoki noldan), grafik va animatsiya hajmi hamda muddat ta'sir qiladi.",
      "Buyurtma qoldirganingizdan so'ng bir necha taklif olasiz va eng mos narx–sifat–muddat variantini o'zingiz tanlaysiz. Shoshilinch buyurtmalar (1–2 kun) biroz qimmatroq bo'ladi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Prezentatsiya qancha vaqtda tayyor bo'ladi?",
        a: "Oddiy 10–15 slaydli taqdimot ko'pincha 1–3 kunda tayyor bo'ladi. Aniq muddatni tayyorlovchi taklif yuborishda ko'rsatadi, siz esa muddati mos kelganini tanlaysiz.",
      },
      {
        q: "O'zimning matnim bo'lsa, faqat dizayn qilib berasizmi?",
        a: "Ha. Buyurtmada \"faqat dizayn\" deb belgilaysiz va tayyor matningizni yuklaysiz — tayyorlovchi uni chiroyli slaydlarga joylashtiradi.",
      },
      {
        q: "Tayyor faylni qaysi formatda olaman?",
        a: "Odatda tahrirlash mumkin bo'lgan PPTX. Kelishuvga qarab PDF, Google Slides havolasi yoki Canva loyihasi ham beriladi.",
      },
      {
        q: "Tuzatish (pravka) kiritsam bo'ladimi?",
        a: "Ha, oraliq natijani ko'rib chatda izohlaringizni yozasiz. Tuzatishlar shartlari tayyorlovchi bilan kelishiladi.",
      },
      {
        q: "To'lov qanday amalga oshadi?",
        a: "Summa platforma hamyoni orqali bloklanadi va ish qabul qilingandan keyingina tayyorlovchiga o'tadi.",
      },
    ],
  },
  {
    slug: "kurs-ishi",
    title: "Kurs ishi tayyorlash",
    metaTitle: "Kurs ishi tayyorlash — buyurtma va narx",
    metaDescription:
      "Kurs ishini reja, nazariy qism, amaliy tahlil va adabiyotlar ro'yxati bilan buyurtma qiling. Antiplagiat talablariga mos, muddatida.",
    tagline:
      "Reja tuzishdan yakuniy rasmiylashtirishgacha — kurs ishini bosqichma-bosqich tayyorlab beruvchilar.",
    intro: [
      "Kurs ishi — talabadan mustaqil tahlil, manbalar bilan ishlash va ilmiy uslubda yozishni talab qiladigan yirik ish. tayyorr.uz'da siz mavzu, fan, hajm (sahifalar soni), talab qilinadigan originallik foizi va topshirish muddatini ko'rsatasiz.",
      "Tayyorlovchilar odatda quyidagilarni bajaradi: mavzu bo'yicha reja, kirish, nazariy bob, amaliy yoki tahliliy bob, xulosa va tavsiyalar, foydalanilgan adabiyotlar ro'yxati hamda ilovalar. Rasmiylashtirish (shrift, interval, hoshiya, iqtiboslar) universitetingiz talablariga moslashtiriladi.",
    ],
    price: [
      "Narx taklif orqali shakllanadi va asosan hajm (sahifalar), fan murakkabligi, amaliy hisob-kitob yoki tahlil bor-yo'qligi va muddatga bog'liq. Statistik ma'lumot, so'rovnoma yoki dasturiy qism kerak bo'lsa, buni buyurtmada alohida yozing.",
      "Bir nechta tayyorlovchidan taklif kelgach, ularning reytingi, oldingi ishlari va narxini solishtirib tanlaysiz. Butun summani oldindan berish shart emas — u shartnoma bo'yicha bloklanadi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Kurs ishi originallik (antiplagiat) talabiga javob beradimi?",
        a: "Buyurtmada kerakli originallik foizini ko'rsatasiz. Tayyorlovchi shu talabga muvofiq yozadi; kelishuvga ko'ra tekshiruv hisobotini ham ilova qilishi mumkin.",
      },
      {
        q: "Universitetimning rasmiylashtirish talablari boshqacha — hisobga olinadimi?",
        a: "Ha. Metodik qo'llanma yoki namunani yuklang — shrift, interval, hoshiya va iqtiboslar uslubi o'shanga moslanadi.",
      },
      {
        q: "Ishni bo'lib-bo'lib olsam bo'ladimi?",
        a: "Ko'pincha ha: avval reja va nazariy qism, keyin qolgani. Bosqichlarni tayyorlovchi bilan chatda kelishasiz.",
      },
      {
        q: "Muddat qancha?",
        a: "O'rtacha kurs ishi 5–14 kun. Shoshilinch variantlar ham bo'ladi, lekin narxi yuqoriroq.",
      },
      {
        q: "Tayyorlovchi ishni bitirmasa-chi?",
        a: "Shartnoma bajarilmasa, bloklangan mablag' sizga qaytariladi. Nizolarda platforma administratsiyasi vositachilik qiladi.",
      },
    ],
  },
  {
    slug: "referat",
    title: "Referat tayyorlash",
    metaTitle: "Referat tayyorlash — tez va sifatli",
    metaDescription:
      "Istalgan fandan referat buyurtma qiling: reja, mavzu bayoni, xulosa va adabiyotlar. Qisqa muddatda, talab qilingan hajmda.",
    tagline:
      "Istalgan fan bo'yicha tuzilgan, manbalarga asoslangan referatni qisqa muddatda oling.",
    intro: [
      "Referat — mavzuni qisqa va tizimli yoritadigan ish. Ko'pincha 10–20 sahifa: titul, reja, kirish, 2–3 bo'lim, xulosa va foydalanilgan adabiyotlar. tayyorr.uz orqali mavzu va hajmni ko'rsatib buyurtma qoldirasiz.",
      "Tayyorlovchilar mavzuni ishonchli manbalar asosida yoritadi, iqtiboslarni to'g'ri rasmiylashtiradi va matnni sizning kursingiz darajasiga moslaydi. Kerak bo'lsa taqdimot ham qo'shimcha buyurtma sifatida qilinadi.",
    ],
    price: [
      "Referat odatda eng arzon ish turi, chunki hajmi kichik. Narxga baribir muddat (bugun yoki ertaga kerakmi), fan va originallik talabi ta'sir qiladi.",
      "Takliflar orasidan narx va tayyorlovchi reytingiga qarab tanlaysiz. To'lov ish qabul qilingandan keyin o'tadi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Referatni bugun buyurtma qilsam, ertaga olsam bo'ladimi?",
        a: "Ko'p hollarda ha. Shoshilinch buyurtmani ochib, muddatni 1 kun deb belgilang — shunga tayyor tayyorlovchilar taklif yuboradi.",
      },
      {
        q: "Mavzuni o'zim tanlashim shartmi?",
        a: "Yo'q. Faqat fan va yo'nalishni yozsangiz, tayyorlovchi mos mavzu taklif qilishi mumkin.",
      },
      {
        q: "Hajmi qancha bo'ladi?",
        a: "Siz belgilaysiz — masalan 12–15 sahifa. Talab bo'lmasa, standart 10–15 sahifa qilinadi.",
      },
      {
        q: "Manbalar ko'rsatiladimi?",
        a: "Ha, foydalanilgan adabiyotlar ro'yxati va matn ichida iqtiboslar rasmiylashtiriladi.",
      },
      {
        q: "Word faylida beriladimi?",
        a: "Ha, tahrir qilsa bo'ladigan .docx. Kerak bo'lsa PDF ham.",
      },
    ],
  },
  {
    slug: "mustaqil-ish",
    title: "Mustaqil ish tayyorlash",
    metaTitle: "Mustaqil ish tayyorlash — buyurtma qilish",
    metaDescription:
      "Fan bo'yicha mustaqil ishni talab qilingan mavzu, hajm va rasmiylashtirish bilan tayyorlab oling. Ishonchli tayyorlovchilardan, muddatida.",
    tagline:
      "Semestr davomida topshiriladigan mustaqil ishlarni talablarga mos holda tayyorlab beruvchilar.",
    intro: [
      "Mustaqil ish (MI) — ko'p universitetlarda har fandan talab qilinadigan yozma topshiriq. U referatga o'xshaydi, lekin ko'pincha aniq mavzular ro'yxati, hajmi va rasmiylashtirish shakli o'qituvchi tomonidan beriladi.",
      "tayyorr.uz'da siz shu talablarni (mavzu yoki mavzular, sahifa soni, muddat, namuna) buyurtmaga joylaysiz. Tayyorlovchi matnni tuzadi, manbalarni ko'rsatadi va faylni kerakli shaklda rasmiylashtiradi.",
    ],
    price: [
      "Mustaqil ish narxi kichik–o'rta oralig'ida bo'ladi va asosan hajm hamda muddatga bog'liq. Bir nechta MI'ni birdan buyurtma qilsangiz, tayyorlovchilar odatda qulayroq narx taklif qiladi.",
      "Barcha takliflarni ko'rib, reyting va narx bo'yicha tanlaysiz. Mablag' shartnoma bo'yicha bloklanib, ish qabul qilingach o'tkaziladi.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Bir nechta mustaqil ishni birga buyurtma qilsam bo'ladimi?",
        a: "Ha. Buyurtma tavsifida ularning ro'yxatini va har birining hajmini yozing — tayyorlovchi yagona narx taklif qiladi.",
      },
      {
        q: "O'qituvchi bergan namunaga mos bo'ladimi?",
        a: "Ha, namuna yoki metodik ko'rsatmani yuklasangiz, rasmiylashtirish o'shanga moslanadi.",
      },
      {
        q: "Originallik tekshiriladimi?",
        a: "Talab qilsangiz, tayyorlovchi belgilangan originallik foiziga amal qiladi.",
      },
      {
        q: "Qancha vaqt oladi?",
        a: "Bitta MI odatda 1–4 kun. Aniq muddat taklifda ko'rsatiladi.",
      },
      {
        q: "Fayl formati qanday?",
        a: "Word (.docx), kerak bo'lsa PDF. Titul varag'i ham qo'shiladi.",
      },
    ],
  },
  {
    slug: "diplom-ishi",
    title: "Diplom (bitiruv malakaviy) ishi tayyorlashda yordam",
    metaTitle: "Diplom ishi tayyorlashda yordam",
    metaDescription:
      "Bitiruv malakaviy ishi bo'yicha reja, nazariy va amaliy boblar, tahlil va rasmiylashtirishda tajribali mutaxassislardan yordam oling.",
    tagline:
      "Bitiruv ishining reja, adabiyotlar tahlili, amaliy qism va rasmiylashtirish bosqichlarida ko'mak.",
    intro: [
      "Diplom ishi — eng katta va mas'uliyatli talaba ishi: u chuqur tahlil, amaliy qism, ba'zan tajriba yoki hisob-kitobni talab qiladi. tayyorr.uz orqali siz mavzu, yo'nalish, hajm, originallik talabi va bosqichli muddatlarni ko'rsatib buyurtma qoldirasiz.",
      "Tayyorlovchilar reja va adabiyotlar ro'yxati, nazariy bob, amaliy yoki tahliliy bob, xulosa, tavsiyalar va ilovalar ustida ishlaydi. Ishni bob-bob qabul qilish va har bosqichda chatda muhokama qilish mumkin.",
    ],
    price: [
      "Diplom ishi narxi eng yuqori, chunki hajmi katta va tahlil chuqur. Narxga yo'nalish murakkabligi, amaliy qism turi (so'rovnoma, dastur, moliyaviy tahlil), sahifalar soni va umumiy muddat ta'sir qiladi.",
      "Bir nechta tajribali tayyorlovchidan taklif olib, portfolio va reytingni solishtirib tanlaysiz. To'lov bosqichli bo'lishi mumkin: har qabul qilingan bob uchun alohida yoki umumiy shartnoma bo'yicha.",
    ],
    points: COMMON_POINTS,
    faq: [
      {
        q: "Diplom ishini bo'laklab (bob-bob) olsam bo'ladimi?",
        a: "Ha, tavsiya etiladi. Odatda avval reja va nazariy bob, keyin amaliy bob, so'ng xulosa. Har bosqich chatda tasdiqlanadi.",
      },
      {
        q: "Amaliy qism (hisob-kitob, so'rovnoma) ham qilinadimi?",
        a: "Ha, buyurtmada aniq yozing: qanday ma'lumot, qanday tahlil yoki dastur kerak. Bu narx va muddatga ta'sir qiladi.",
      },
      {
        q: "Originallik qancha bo'ladi?",
        a: "Siz talab qilgan foiz bo'yicha. Kelishuvga ko'ra tekshiruv hisoboti ham beriladi.",
      },
      {
        q: "Rasmiylashtirish standarti hisobga olinadimi?",
        a: "Ha — universitet metodik qo'llanmasi bo'yicha shrift, interval, iqtibos va manbalar rasmiylashtiriladi.",
      },
      {
        q: "Ishni topshirgandan keyin savol tug'ilsa?",
        a: "Chat buyurtma yakunlangandan keyin ham ochiq qoladi — qo'shimcha izoh yoki kichik tuzatishlar bo'yicha tayyorlovchi bilan bog'lana olasiz.",
      },
    ],
  },
];

export function getService(slug: string): Service | null {
  return SERVICES.find((s) => s.slug === slug) ?? null;
}
