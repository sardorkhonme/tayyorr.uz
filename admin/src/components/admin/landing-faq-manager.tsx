"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
}

type Draft = Omit<Faq, "id">;

const EMPTY: Draft = { question: "", answer: "", order: 0, active: true };

function Fields({ v, set }: { v: Draft; set: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-3">
      <input
        className="input"
        placeholder="Savol"
        value={v.question}
        onChange={(e) => set({ question: e.target.value })}
      />
      <textarea
        className="input"
        rows={3}
        placeholder="Javob"
        value={v.answer}
        onChange={(e) => set({ answer: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Tartib:
          <input
            type="number"
            className="input w-20"
            value={v.order}
            onChange={(e) => set({ order: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={v.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Faol
        </label>
      </div>
    </div>
  );
}

function Row({ f }: { f: Faq }) {
  const router = useRouter();
  const { id: _fid, ...fFields } = f;
  void _fid;
  const [v, setV] = useState<Draft>(fFields);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(fFields);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/landing-faq/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    setBusy(false);
    router.refresh();
  }
  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/landing-faq/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !v.active }),
    });
    setV((s) => ({ ...s, active: !s.active }));
    setBusy(false);
    router.refresh();
  }
  async function del() {
    if (!confirm("O'chirilsinmi?")) return;
    setBusy(true);
    await fetch(`/api/admin/landing-faq/${f.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`rounded-full px-2 py-0.5 ${
            v.active
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-zinc-500/15 text-zinc-400"
          }`}
        >
          {v.active ? "● Faol" : "○ Nofaol"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-red-300 hover:bg-red-500/25"
        >
          O'chirish
        </button>
      </div>
      <Fields v={v} set={(p) => setV((s) => ({ ...s, ...p }))} />
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary mt-3 text-sm"
        >
          {busy ? "..." : "Saqlash"}
        </button>
      )}
    </div>
  );
}

export function LandingFaqManager({ initial }: { initial: Faq[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setBusy(true);
    await fetch("/api/admin/landing-faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setDraft(EMPTY);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <div className="mb-3 text-sm font-medium text-white">
          Yangi savol qo'shish
        </div>
        <Fields v={draft} set={(p) => setDraft((s) => ({ ...s, ...p }))} />
        <button
          type="button"
          onClick={add}
          disabled={busy || !draft.question.trim() || !draft.answer.trim()}
          className="btn-primary mt-3 text-sm"
        >
          {busy ? "..." : "Qo'shish"}
        </button>
      </div>

      <div className="text-xs text-zinc-600">
        {initial.length} ta savol · landing sahifada tartib raqami bo'yicha
        chiqadi
      </div>

      {initial.map((f) => (
        <Row key={f.id} f={f} />
      ))}
    </div>
  );
}
