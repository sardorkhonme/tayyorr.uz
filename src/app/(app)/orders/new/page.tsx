import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getRestriction } from "@/lib/restriction";
import { scopedRestriction } from "@/lib/restriction-scope";
import { RestrictionNotice } from "@/components/restriction-notice";
import { BackLink } from "@/components/back-link";
import { NewOrderForm } from "./new-order-form";

export default async function NewOrderPage() {
  const session = await auth();
  // faqat buyurtma beruvchilar buyurtma yarata oladi
  if (session!.user.role !== "ORDERER") redirect("/dashboard");
  const restriction = await getRestriction(session!.user.id);
  if (restriction) return <RestrictionNotice restriction={restriction} />;
  const scoped = await scopedRestriction(session!.user.id, "uz_orders");
  if (scoped) return <RestrictionNotice scoped={scoped} />;
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <BackLink fallback="/orders" />
      </div>
      <NewOrderForm />
    </div>
  );
}
