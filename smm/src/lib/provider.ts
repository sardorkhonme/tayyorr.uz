/**
 * SMM panel provayderi — keng tarqalgan "API v2" formati
 * (POST key=...&action=services|add|status).
 */

type ProviderService = {
  service: number | string;
  name: string;
  type?: string;
  category: string;
  rate: number | string;
  min: number | string;
  max: number | string;
  refill?: boolean;
  description?: string;
};

export class ProviderError extends Error {}

/** Xabarlarda ko'rsatiladigan nom: SMM_PROVIDER_NAME yoki API domeni (masalan "smmcloud.uk"). */
export function providerName() {
  if (process.env.SMM_PROVIDER_NAME) return process.env.SMM_PROVIDER_NAME;
  try {
    return new URL(process.env.SMM_PROVIDER_URL || "").hostname.replace(/^www\./, "");
  } catch {
    return "SMM provayder";
  }
}

/** Provayder saytidagi balansni to'ldirish sahifasi (Perfect Panel: /addfunds). */
export function providerAddFundsUrl() {
  try {
    return `${new URL(process.env.SMM_PROVIDER_URL || "").origin}/addfunds`;
  } catch {
    return null;
  }
}

export function providerConfigured() {
  return !!(process.env.SMM_PROVIDER_URL && process.env.SMM_PROVIDER_KEY);
}

async function call<T>(params: Record<string, string | number>): Promise<T> {
  const url = process.env.SMM_PROVIDER_URL;
  const key = process.env.SMM_PROVIDER_KEY;
  if (!url || !key) throw new ProviderError("Provayder sozlanmagan");

  const body = new URLSearchParams({ key });
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  const res = await fetch(url, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new ProviderError(`Provayder javobi: HTTP ${res.status}`);
  if (typeof data === "object" && "error" in data && data.error) {
    throw new ProviderError(String(data.error));
  }
  return data;
}

export function fetchServices() {
  return call<ProviderService[]>({ action: "services" });
}

export async function addOrder(service: number, link: string, quantity: number) {
  const r = await call<{ order: number | string }>({ action: "add", service, link, quantity });
  const id = Number(r.order);
  if (!Number.isFinite(id)) throw new ProviderError("Provayder buyurtma raqamini qaytarmadi");
  return id;
}

export type ProviderStatus = {
  charge?: string;
  start_count?: string | number;
  status?: string;
  remains?: string | number;
  error?: string;
};

/** Bir nechta buyurtma holati — { [providerOrderId]: ProviderStatus } */
export function fetchStatuses(ids: number[]) {
  return call<Record<string, ProviderStatus>>({ action: "status", orders: ids.join(",") });
}

export async function fetchBalance() {
  const r = await call<{ balance: string | number; currency?: string }>({ action: "balance" });
  const balance = Number(r.balance);
  if (!Number.isFinite(balance)) throw new ProviderError("Provayder balansni qaytarmadi");
  return { balance, currency: (r.currency || "USD").toUpperCase() };
}
