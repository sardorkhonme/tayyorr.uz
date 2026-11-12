import Link from "next/link";

import { Mascot } from "@/components/mascot";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <Mascot pose="not-found" size={200} priority />
      <h1 className="text-xl font-semibold text-white">
        Sahifa topilmadi
      </h1>
      <p className="max-w-xs text-sm text-zinc-500">
        Bu buyurtma yoki sahifa mavjud emas, öçirilgan yoki sizga
        körinmaydi.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/dashboard" className="btn-primary">
          Asosiy menyuga qaytiş
        </Link>
        <Link href="/messages" className="btn-ghost">
          Xabarlar
        </Link>
      </div>
    </div>
  );
}
