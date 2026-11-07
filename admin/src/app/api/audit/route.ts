import { isAdmin } from "@/lib/admin";
import { clientEvents } from "@/lib/audit";

/** Admin paneldagi kuzatuvchi (components/activity-tracker.tsx) yuborgan izlar → AuditLog. */
export async function POST(req: Request) {
  return clientEvents(req, "admin", (await isAdmin()) ? "ADMIN" : "GUEST", null);
}
