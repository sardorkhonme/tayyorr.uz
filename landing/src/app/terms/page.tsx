import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { START_URL } from "@/lib/links";
import { TermsContent } from "@/components/terms-content";

export const metadata: Metadata = {
  title: "Ommaviy oferta va foydalaniş şartlari",
  description:
    "tayyorr.uz ommaviy ofertasi: maʼlumotlarni ixtiyoriy taqdim etiş, taqiqlangan işlar, çatda özaro hurmat, tölovlar va çeklovlar.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell>
      <div className="card p-7">
        <h1 className="font-display text-3xl font-bold text-white">
          Ommaviy oferta va foydalaniş şartlari
        </h1>
        <div className="mt-4">
          <TermsContent />
        </div>
        <div className="mt-6 flex gap-3">
          <a href={START_URL} className="btn-white">
            Röyxatdan ötiş
          </a>
          <Link href="/" className="btn-ghost">
            Boş sahifa
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
