import { cookies } from "next/headers";

import { clientEvents } from "@/lib/audit";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/** Brauzerdagi kuzatuvchi (components/activity-tracker.tsx) yuborgan izlar → AuditLog. Foydalanuvchi — SSO cookie'dan. */
export async function POST(req: Request) {
  const uid = await verifySso((await cookies()).get(SSO_COOKIE)?.value);
  return clientEvents(req, "smm", uid ? "USER" : "GUEST", uid);
}
