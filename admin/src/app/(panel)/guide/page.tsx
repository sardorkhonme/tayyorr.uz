import { GuideVideoSlot } from "@/components/admin/guide-video-manager";
import { StarPriceForm } from "@/components/admin/star-price-form";
import { getGuideVideos } from "@/lib/guide-settings";
import { getStarPrice } from "@/lib/stars";

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  const [videos, starPrice] = await Promise.all([getGuideVideos(), getStarPrice()]);
  const app = process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Qöllanma</h1>
        <p className="mt-1 text-sm text-zinc-500">
          app.tayyorr.uz dagi «Qöllanma» bölimi uçun videolar. Har bir foydalanuvçi avval öz roli qöllanmasini köradi; qadamlar matni saytda tayyor turadi.{" "}
          <a href={`${app}/guide`} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200">
            Saytda köriş ›
          </a>
        </p>
      </div>
      <StarPriceForm value={starPrice} />
      <div className="grid gap-4 lg:grid-cols-2">
        <GuideVideoSlot role="ORDERER" title="Buyurtma beruvçi uçun video" url={videos.ORDERER?.url ?? null} />
        <GuideVideoSlot role="PREPARER" title="Tayyorlovçi uçun video" url={videos.PREPARER?.url ?? null} />
      </div>
    </div>
  );
}
