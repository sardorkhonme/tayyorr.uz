import { FaqRow } from "@/components/faq-row";

type FaqItem = { id: string; question: string; answer: string };

export function LandingFaq({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section id="savollar" className="relative z-10 mx-auto max-w-3xl px-6 py-20">
      <div className="blur-in mx-auto max-w-xl text-center">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
          Savol-javob
        </div>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Köp söraladigan savollar
        </h2>
      </div>

      <div className="lq-glass blur-in mt-12 divide-y divide-white/10 rounded-2xl px-6">
        {faqs.map((f) => (
          <FaqRow key={f.id} question={f.question} answer={f.answer} />
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
    </section>
  );
}
