"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLoaderOverlay } from "@/components/brand-loader";
import { errorText, fetchJson } from "@/components/fetch-json";
import { ORDER_CREATED_KEY } from "@/components/order-created-banner";
import { useFlashState } from "@/components/flash-status";

const TYPES = [
  ["PRESENTATION", "Prezentatsiya"],
  ["COURSE_WORK", "Kurs işi"],
  ["REFERAT", "Referat"],
  ["ESSAY", "Esse"],
  ["DIPLOMA", "Diplom işi"],
  ["OTHER", "Boşqa"],
] as const;

/** Hozirgi vaqt <input type="datetime-local"> formatida (o'tgan vaqtni tanlamaslik uchun). */
function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function NewOrderForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    type: "PRESENTATION",
    description: "",
    deadline: "",
    budget: "",
  });
  const [err, setErr] = useFlashState<string | null>(null);
  // server va brauzer vaqt zonasi farq qiladi — min faqat brauzerda hisoblanadi
  const [minDeadline, setMinDeadline] = useState<string | undefined>();
  useEffect(() => setMinDeadline(nowLocal()), []);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchJson<{ order: { id: string } }>("/api/orders", {
        method: "POST",
        json: {
          title: form.title,
          type: form.type,
          description: form.description,
          deadline: form.deadline
            ? new Date(form.deadline).toISOString()
            : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
        },
      });
      if (!data.order?.id) throw new Error("Server javobi notöğri. Buyurtmalarim bölimini tekşiring.");
      try {
        // tabrik oynasi sahifa qayta qurilganda ham körinsin
        sessionStorage.setItem(ORDER_CREATED_KEY, data.order.id);
      } catch {
        /* e'tiborsiz */
      }
      // replace — "orqaga" bosilganda /orders/new ga qaytmasin.
      // busy qoladi: sahifa almaşguncha tugma qayta bosilmasin (ikki marta joylanmasin)
      router.replace(`/orders/${data.order.id}?created=1`);
      router.refresh();
      // sahifa baribir almaşmasa — abadiy kutib qolmasin
      setTimeout(() => setBusy(false), 12_000);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight text-white">
        Yangi buyurtma
      </h1>
      {busy && <BrandLoaderOverlay label="Buyurtma joylanmoqda…" />}
      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div>
          <label className="label">Sarlavha</label>
          <input
            className="input"
            required
            minLength={5}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Turi</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tavsif</label>
          <textarea
            className="input"
            rows={5}
            required
            minLength={10}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Mavzu, talablar, hajm, formatlaş..."
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Muddat (sana va vaqt)</label>
            <input
              className="input"
              type="datetime-local"
              value={form.deadline}
              min={minDeadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Byudjet (söm)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
            />
          </div>
        </div>

        {err && (
          <p role="alert" className="flash-status rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </p>
        )}

        <button className="btn-primary" disabled={busy}>
          {busy ? "Joylanmoqda…" : "Buyurtmani eʼlon qiliş"}
        </button>
      </form>
    </div>
  );
}
