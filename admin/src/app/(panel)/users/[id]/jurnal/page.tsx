import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { ActivityLogPanel } from "@/components/admin/activity-log-panel";

export default async function AdminUserActivityLog({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true },
  });
  if (!user || user.isSupport) notFound();

  return <ActivityLogPanel userId={user.id} />;
}
