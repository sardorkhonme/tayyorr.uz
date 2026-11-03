import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Röyxatdan ötiş",
  description:
    "tayyorr.uz'ga bepul röyxatdan öting: prezentatsiya, kurs işi va referat buyurtma qiling yoki tayyorlovçi sifatida daromad qiling.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
