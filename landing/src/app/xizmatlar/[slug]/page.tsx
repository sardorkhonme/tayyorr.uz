import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SERVICES, getService } from "@/lib/services";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";

const STEPS: [string, string][] = [
  ["Buyurtma qoldiring", "Ish turi, mavzu, hajm va muddatni yozing — bepul."],
  ["Takliflarni ko'ring", "Tayyorlovchilar narx va namunalari bilan javob beradi."],
  ["Shartnoma tuzing", "Reyting va narxga qarab tanlang; summa hisobda bloklanadi."],
  ["Ishni qabul qiling", "Tayyor ishni ko'rib, ma'qullaganda to'lov o'tkaziladi."],
];

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    alternates: { canonical: `/xizmatlar/${s.slug}` },
    openGraph: {
      title: s.metaTitle,
      description: s.metaDescription,
      url: `${SITE_URL}/xizmatlar/${s.slug}`,
      type: "article",
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Bosh sahifa",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Xizmatlar",
            item: `${SITE_URL}/xizmatlar`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: s.title,
            item: `${SITE_URL}/xizmatlar/${s.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: s.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Bosh sahifa
        </Link>{" "}
        /{" "}
        <Link href="/xizmatlar" className="hover:text-zinc-300">
          Xizmatlar
        </Link>{" "}
        / <span className="text-zinc-300">{s.title}</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {s.title}
      </h1>
      <p className="mt-4 text-lg text-zinc-400">{s.tagline}</p>

      <div className="mt-8 space-y-4 leading-relaxed text-zinc-300">
        {s.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Narx qanday belgilanadi
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-zinc-300">
        {s.price.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Qanday ishlaydi
      </h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300">
              {i + 1}
            </span>
            <span>
              <b className="text-white">{t}.</b>{" "}
              <span className="text-zinc-400">{d}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Nega tayyorr.uz
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {s.points.map((pt) => (
          <div key={pt.h} className="card">
            <h3 className="font-semibold text-white">{pt.h}</h3>
            <p className="mt-1 text-sm text-zinc-400">{pt.p}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-white">
        Ko'p so'raladigan savollar
      </h2>
      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {s.faq.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="cursor-pointer list-none font-medium text-white marker:content-none">
              <span className="text-indigo-400 group-open:hidden">＋ </span>
              <span className="hidden text-indigo-400 group-open:inline">－ </span>
              {f.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-6 text-center">
        <p className="text-lg font-medium text-white">
          {s.title.split(" ")[0]} ishini buyurtma qiling
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Ro'yxatdan o'tish va buyurtma qoldirish bepul. Bir necha soatda taklif
          ola boshlaysiz.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-white">
            Buyurtma berish
          </Link>
          <Link href="/xizmatlar" className="btn-ghost">
            Boshqa xizmatlar
          </Link>
        </div>
      </div>
    </article>
  );
}
