import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { ForceDark } from "@/components/force-dark";
import { Logo } from "@/components/logo";
import { ScrollHeader } from "@/components/scroll-header";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { HeroMockup } from "@/components/hero-mockup";
import { HeroBgVideo } from "@/components/hero-bg-video";
import { LandingVideos } from "@/components/landing-videos";
import { LandingFaq } from "@/components/landing-faq";
import { PhoneScrollShowcase } from "@/components/phone-scroll-showcase";
import { TelegramIcon, InstagramIcon } from "@/components/icons";
import { SERVICES } from "@/lib/services";
import { db } from "@/lib/db";

const TELEGRAM_URL = "https://t.me/tayyorruz";
const INSTAGRAM_URL = "https://instagram.com/tayyorr.uz";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const session = await auth();
  const userExists = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      })
    : null;
  const loggedIn = !!userExists;

  const [heroVideo, videoRows, faqRows, phoneSlideRows] = await Promise.all([
    db.heroVideo.findUnique({ where: { id: "hero" } }),
    db.landingVideo.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: 4,
    }),
    db.landingFaq.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    db.landingPhoneSlide.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070c] text-zinc-100 antialiased">
      <ForceDark />
      <RevealOnScroll />

      {/* ---------- background ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="blob animate-float-a"
          style={{
            top: "-8rem",
            left: "-8rem",
            width: "32rem",
            height: "32rem",
            background: "radial-gradient(circle at 30% 30%, #6366f1, transparent 70%)",
            opacity: 0.4,
          }}
        />
        <div
          className="blob animate-float-b"
          style={{
            top: "6rem",
            right: "-12rem",
            width: "34rem",
            height: "34rem",
            background: "radial-gradient(circle at 60% 40%, #7c3aed, transparent 70%)",
            opacity: 0.3,
          }}
        />
        {heroVideo?.active && <HeroBgVideo url={heroVideo.videoUrl} />}
        {/* video pastki chetida keyingi bo'limga silliq qo'shilishi uchun —
            faqat videoning o'zi balandligida (butun sahifada emas, aks holda
            gradient deyarli sezilmay, video ostida keskin chiziq qolib
            ketardi va keyingi bo'lim bilan qo'shilib ko'rinardi) */}
        <div className="absolute inset-x-0 top-0 h-[46rem] bg-gradient-to-b from-transparent via-transparent to-[#07070c] sm:h-[40rem] lg:h-[46rem]" />
      </div>

      {/* ---------- nav (fixed) ---------- */}
      <ScrollHeader>
        <Logo className="h-4 sm:h-6" />
        <div className="hidden items-center gap-7 text-sm text-zinc-400 sm:flex">
          <Link href="/xizmatlar" className="transition hover:text-white">
            Xizmatlar
          </Link>
          <a href="#qanday" className="transition hover:text-white">
            Qanday ishlaydi
          </a>
          <a href="#turlar" className="transition hover:text-white">
            Ish turlari
          </a>
          <a href="#imkoniyat" className="transition hover:text-white">
            Imkoniyatlar
          </a>
          <a href="#ilova" className="transition hover:text-white">
            Ilova
          </a>
        </div>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Asosiy menyu
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Boshlash
              </Link>
            </>
          )}
        </div>
      </ScrollHeader>

      {/* ---------- hero ---------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-20 sm:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* matn */}
          <div className="text-center lg:text-left">
            <h1
              className="font-display animate-rise text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
            >
              Ilmiy ishlaringiz uchun{" "}
              <span className="text-indigo-300">doim odam</span> topiladi
            </h1>

            <p
              className="animate-rise mx-auto mt-6 max-w-lg text-lg text-zinc-400 lg:mx-0"
              style={{ animationDelay: "80ms" }}
            >
              Prezentatsiya, kurs ishi, referat yoki diplom ishi — buyurtma
              qoldiring, u barcha tayyorlovchilarga ko'rinadi. Yoki o'zingiz
              tayyorlab, daromad qiling.
            </p>

            <div
              className="animate-rise mx-auto mt-9 grid max-w-md grid-cols-1 gap-3 sm:mx-0 sm:inline-flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center lg:justify-start"
              style={{ animationDelay: "140ms" }}
            >
              <Link
                href={loggedIn ? "/dashboard" : "/register"}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
              >
                {loggedIn ? "Asosiy menyuga o'tish" : "Bepul boshlash"}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a
                href="#qanday"
                className="lq-glass inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-zinc-200 sm:w-auto"
              >
                Qanday ishlaydi?
              </a>
            </div>

          </div>

          {/* vizual: prezentatsiya + hujjat maketi — birinchi qarashda "bu nima uchun sayt" ayon bo'lsin */}
          <div className="animate-rise" style={{ animationDelay: "100ms" }}>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ---------- dual role ---------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <RolePanel
            title="Buyurtma beruvchi"
            lead="Vaqtingizni tejang."
            points={[
              "Bir marta buyurtma qoldirasiz — barcha tayyorlovchilar ko'radi",
              "Kelgan takliflardan narx va reyting bo'yicha tanlaysiz",
              "Tayyor ishni bevosita platformada qabul qilasiz",
            ]}
            cta={{ href: "/register", label: "Buyurtma qoldirish" }}
          />
          <RolePanel
            title="Tayyorlovchi"
            lead="Bilimingizni daromadga aylantiring."
            points={[
              "Ochiq buyurtmalar lentasini real vaqtda ko'rasiz",
              '"Band / bo\'sh" holatini bir bosishda yangilaysiz',
              "Taklif yuborasiz, tanlansangiz — ishga kirishasiz",
            ]}
            cta={{ href: "/register", label: "Tayyorlovchi bo'lish" }}
          />
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="qanday" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <SectionHeading
          kicker="Jarayon"
          title="Uch qadamda natija"
          subtitle="Ro'yxatdan o'tishdan tayyor ishgacha — ortiqcha suhbatlarsiz."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Ro'yxatdan o'ting",
              d: "Rolni tanlaysiz, Google bilan tasdiqlaysiz, ism-familiya va login kiritasiz.",
            },
            {
              n: "02",
              t: "Buyurtma yoki taklif",
              d: "Buyurtmachi ish shartini yozadi. Tayyorlovchilar narx va izoh bilan taklif yuboradi.",
            },
            {
              n: "03",
              t: "Kelishuv va topshirish",
              d: "Buyurtmachi bitta taklifni tanlaydi, fayllar xavfsiz almashiladi, ish yakunlanadi.",
            },
          ].map((s) => (
            <div key={s.n} className="lq-glass blur-in rounded-2xl p-6">
              <div className="text-sm font-mono text-indigo-400">{s.n}</div>
              <h3 className="font-display mt-3 text-lg font-bold text-white">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- xizmatlar ---------- */}
      <section id="turlar" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <SectionHeading
          kicker="Ish turlari"
          title="Nima buyurtma qilish mumkin"
          subtitle="Eng ko'p so'raladigan yo'nalishlar — har birining o'z sahifasi bor."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/xizmatlar/${s.slug}`}
              className="lq-glass blur-in group flex flex-col rounded-2xl p-6"
            >
              <h3 className="font-display font-bold text-white">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                {s.tagline}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300 transition group-hover:gap-2.5">
                Batafsil <span>→</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="blur-in mt-8 text-center">
          <Link
            href="/xizmatlar"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Barcha xizmatlarni ko'rish →
          </Link>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="imkoniyat" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <SectionHeading
          kicker="Imkoniyatlar"
          title="Nega tayyorr.uz"
          subtitle="Ishni tez, tartibli va xavfsiz qiladigan mayda-chuydalar."
        />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<IconShield />}
            title="Xavfsiz fayllar"
            text="Faqat ishtirokchilarga vaqtinchalik havola bilan ochiladi."
          />
          <Feature
            icon={<IconLock />}
            title="Eskrou to'lov"
            text="Ish yakunlanguncha hamyonda bloklanadi, keyin o'tkaziladi."
          />
          <Feature
            icon={<IconChat />}
            title="Takliflar tizimi"
            text="Narx va izohli takliflar; eng mosini tanlaysiz."
          />
          <Feature
            icon={<IconGoogle />}
            title="Google bilan kirish"
            text="Parolni unutish muammosi yo'q."
          />
        </div>
      </section>

      {/* ---------- telefon scroll-hikoya (yuklab olishdan oldin) ---------- */}
      <PhoneScrollShowcase
        slides={phoneSlideRows.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          imageUrl: s.imageUrl,
        }))}
      />

      {/* ---------- mobil ilova ---------- */}
      <section id="ilova" className="relative z-10 mx-auto max-w-5xl px-6 py-20 lg:pt-36">
        {/* telefonda: kartaning tepasiga minib turadi */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app-phone.webp"
          alt="tayyorr.uz mobil ilovasi"
          width={508}
          height={854}
          className="phone-float relative z-10 mx-auto -mb-28 block w-44 drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)] sm:w-52 lg:hidden"
        />
        <div className="relative">
        <div className="lq-glass-strong blur-in relative overflow-hidden rounded-3xl p-8 pt-32 sm:p-12 sm:pt-36 lg:pt-12">
          <div
            aria-hidden
            className="blob"
            style={{
              bottom: "-8rem",
              right: "-6rem",
              width: "26rem",
              height: "26rem",
              background: "radial-gradient(circle, #7c3aed, transparent 70%)",
              opacity: 0.3,
            }}
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
                Mobil ilova
              </div>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Endi cho&apos;ntagingizda ham
              </h2>
              <p className="mt-4 max-w-md text-zinc-400">
                Har safar brauzer ochmasdan — tayyorr.uz ilovasi orqali
                buyurtmalar, takliflar va xabarlarni to&apos;g&apos;ridan
                telefoningizdan boshqaring.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="/api/app/download"
                  className="group inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-black transition hover:bg-zinc-200"
                >
                  <IconAndroid />
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] text-zinc-600">
                      Android uchun
                    </span>
                    <span className="block text-sm font-semibold">
                      Ilovani yuklab olish
                    </span>
                  </span>
                </a>
                <div className="lq-glass inline-flex items-center gap-3 rounded-xl px-5 py-3 text-zinc-400">
                  <IconApple />
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] text-zinc-500">
                      iOS uchun
                    </span>
                    <span className="block text-sm font-semibold">
                      Tez orada
                    </span>
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                APK — Google Play&apos;dan tashqarida. O&apos;rnatishda
                telefon &quot;noma&apos;lum manbadan o&apos;rnatish&quot;ni
                so&apos;rasa, ruxsat bering.
              </p>
            </div>

            <div aria-hidden className="hidden lg:block" />
          </div>
        </div>
        {/* kompyuterda: kartaning o'ng tomonida, yuqori qismi kartadan chiqib turadi */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app-phone.webp"
          alt="tayyorr.uz mobil ilovasi"
          width={508}
          height={854}
          className="phone-float pointer-events-none absolute bottom-6 right-[6%] z-10 hidden h-[135%] w-auto drop-shadow-[0_40px_50px_rgba(0,0,0,0.6)] lg:block"
        />
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <div className="lq-glass-strong blur-in relative overflow-hidden rounded-3xl p-10 text-center sm:p-16">
          <div
            aria-hidden
            className="blob"
            style={{
              top: "-6rem",
              left: "50%",
              width: "24rem",
              height: "24rem",
              transform: "translateX(-50%)",
              background: "radial-gradient(circle, #6366f1, transparent 70%)",
              opacity: 0.3,
            }}
          />
          <h2 className="font-display relative text-3xl font-bold tracking-tight sm:text-4xl">
            Bugun birinchi buyurtmangizni qoldiring
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-zinc-400">
            Ro'yxatdan o'tish bir daqiqa. To'lov faqat kelishilgan ish uchun.
          </p>
          <Link
            href={loggedIn ? "/dashboard" : "/register"}
            className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {loggedIn ? "Asosiy menyuga o'tish" : "Hoziroq boshlash"} →
          </Link>
        </div>
      </section>

      <LandingVideos videos={videoRows} />
      <LandingFaq faqs={faqRows} />

      {/* ---------- footer ---------- */}
      <footer className="relative z-10 border-t border-white/10 bg-[#08080d]/70 backdrop-blur-2xl">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* brend + ijtimoiy tarmoqlar */}
            <div>
              <Logo className="h-4 sm:h-6" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
                Prezentatsiya, kurs ishi, referat va diplom ishini ishonchli
                tayyorlovchilarga buyurtma qiling yoki o&apos;zingiz tayyorlab
                daromad qiling.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram"
                  className="backdrop-blur-sm flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <TelegramIcon className="h-5 w-5" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="backdrop-blur-sm flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* xizmatlar */}
            <FooterCol title="Xizmatlar">
              {SERVICES.map((s) => (
                <FooterLink key={s.slug} href={`/xizmatlar/${s.slug}`}>
                  {s.title.replace(
                    " (bitiruv malakaviy) ishi tayyorlashda yordam",
                    " ishi",
                  )}
                </FooterLink>
              ))}
              <FooterLink href="/xizmatlar">Barcha xizmatlar</FooterLink>
            </FooterCol>

            {/* platforma */}
            <FooterCol title="Platforma">
              <FooterLink href="/#qanday">Qanday ishlaydi</FooterLink>
              <FooterLink href="/#turlar">Ish turlari</FooterLink>
              <FooterLink href="/#imkoniyat">Imkoniyatlar</FooterLink>
              <FooterLink href="/register">Ro&apos;yxatdan o&apos;tish</FooterLink>
              <FooterLink href="/login">Kirish</FooterLink>
            </FooterCol>

            {/* huquqiy */}
            <FooterCol title="Huquqiy">
              <FooterLink href="/terms">Ommaviy oferta</FooterLink>
              <FooterLink href="/terms">Foydalanish shartlari</FooterLink>
              <FooterLink href="/privacy">Maxfiylik siyosati</FooterLink>
              <FooterLink href={TELEGRAM_URL} external>
                Qo&apos;llab-quvvatlash
              </FooterLink>
            </FooterCol>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-zinc-600 sm:flex-row">
            <span>
              © {new Date().getFullYear()} tayyorr
              <span className="text-indigo-400">.uz</span> — Barcha huquqlar
              himoyalangan.
            </span>
            <span>
              <a
                href="https://sardorkhon.me"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-zinc-300"
              >
                sardorkhon.me
              </a>{" "}
              tomonidan ishlab chiqilgan
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-zinc-200"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="transition hover:text-zinc-200">
        {children}
      </Link>
    </li>
  );
}

/* ---------------- helpers ---------------- */

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="blur-in mx-auto max-w-xl text-center">
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
        {kicker}
      </div>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-zinc-400">{subtitle}</p>
    </div>
  );
}

function RolePanel({
  title,
  lead,
  points,
  cta,
}: {
  title: string;
  lead: string;
  points: string[];
  cta: { href: string; label: string };
}) {
  return (
    <div className="lq-glass blur-in rounded-2xl p-8">
      <h3 className="font-display text-xl font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{lead}</p>
      <ul className="mt-6 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-sm text-zinc-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className="backdrop-blur-sm mt-8 inline-flex rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
      >
        {cta.label}
      </Link>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="lq-glass blur-in rounded-2xl p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-indigo-300">
        {icon}
      </div>
      <h3 className="font-display mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

/* inline icons (no dependency) */
const sw = { strokeWidth: 1.6, stroke: "currentColor", fill: "none" };
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...sw}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...sw}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...sw}>
      <path d="M5 6h14v10H9l-4 3V6z" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...sw}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconAndroid() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M6.5 8.5v6a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6h-11zM5 9.5v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 1.5 0zm14 0v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 1.5 0zM9 17v2a1 1 0 0 0 2 0v-2H9zm4 0v2a1 1 0 0 0 2 0v-2h-2zM7.5 4.7l-1-1.4a.5.5 0 1 1 .8-.6l1 1.5a6 6 0 0 1 7.4 0l1-1.5a.5.5 0 1 1 .8.6l-1 1.4A5 5 0 0 1 19 8H5a5 5 0 0 1 2.5-3.3zM9.2 6a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4zm5.6 0a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4z" />
    </svg>
  );
}
function IconApple() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M16.4 12.4c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-3-1.6-1.3-.1-2.4.7-3.1.7-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.2 2.7 2.1 1-.1 1.5-.7 2.8-.7s1.6.7 2.7.7c1.1 0 1.9-1 2.6-2 .6-.9.9-1.7.9-1.8-.1 0-2.2-.9-2.2-3.2zM14.4 5.9c.5-.6 1-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-1 1.6-.8 2.4.9.1 1.8-.4 2.3-1.1z" />
    </svg>
  );
}
