"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AnnouncementBanner } from "@/components/announcement-banner";

export interface Banner {
  id: string;
  title: string;
  titleRu: string;
  titleEn: string;
  body: string;
  bodyRu: string;
  bodyEn: string;
  buttonText: string;
  buttonTextRu: string;
  buttonTextEn: string;
  buttonUrl: string;
  role: "" | "ORDERER" | "PREPARER" | "SMM";
  active: boolean;
}

type Draft = Omit<Banner, "id">;

const EMPTY: Draft = {
  title: "",
  titleRu: "",
  titleEn: "",
  body: "",
  bodyRu: "",
  bodyEn: "",
  buttonText: "",
  buttonTextRu: "",
  buttonTextEn: "",
  buttonUrl: "",
  role: "",
  active: true,
};

const ROLE_LABEL: Record<string, string> = {
  "": "Hammaga",
  ORDERER: "Buyurtmaçilarga",
  PREPARER: "Tayyorlovçilarga",
  SMM: "Tayyorr SMM'da",
};


function Fields({
  v,
  set,
}: {
  v: Draft;
  set: (patch: Partial<Draft>) => void;
}) {
  return (
    <div className="grid gap-3">
      <input
        className="input"
        placeholder="Asosiy matn"
        value={v.title}
        onChange={(e) => set({ title: e.target.value })}
      />
      <textarea
        className="input"
        rows={2}
        placeholder="Tavsif"
        value={v.body}
        onChange={(e) => set({ body: e.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Tugma matni"
          value={v.buttonText}
          onChange={(e) => set({ buttonText: e.target.value })}
        />
        <input
          className="input"
          placeholder="Tugma URL"
          value={v.buttonUrl}
          onChange={(e) => set({ buttonUrl: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Kimga:
          <select
            className="input"
            value={v.role}
            onChange={(e) => set({ role: e.target.value as Banner["role"] })}
          >
            <option value="">Hammaga</option>
            <option value="ORDERER">Buyurtmaçilarga</option>
            <option value="PREPARER">Tayyorlovçilarga</option>
            <option value="SMM">Tayyorr SMM'da</option>
          </select>
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

function payload(v: Draft) {
  return { ...v, role: v.role || null };
}

interface Click {
  userId: string;
  name: string | null;
  login: string | null;
  role: string | null;
  clickedAt: number;
}

function ClickList({ announcementId }: { announcementId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clicks, setClicks] = useState<Click[] | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (clicks) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcement/${announcementId}/clicks`);
      const data = await res.json();
      setClicks(data.clicks ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        className="btn-ghost text-xs"
      >
        {open ? "Yaşiriş" : "Kimlar bosgan"}
        {clicks ? ` (${clicks.length})` : ""}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-white/10 p-2">
          {loading && <div className="p-2 text-xs text-zinc-500">Yuklanmoqda...</div>}
          {!loading && clicks && clicks.length === 0 && (
            <div className="p-2 text-xs text-zinc-500">Hali heç kim bosmagan</div>
          )}
          {!loading &&
            clicks?.map((c) => (
              <Link
                key={c.userId}
                href={`/users/${c.userId}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>
                  {c.name ?? "—"}{" "}
                  <span className="text-zinc-500">@{c.login ?? "—"}</span>
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(c.clickedAt).toLocaleString("uz-UZ")}
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

function Row({ b }: { b: Banner }) {
  const router = useRouter();
  const { id: _bid, ...bFields } = b;
  void _bid;
  const [v, setV] = useState<Draft>(bFields);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(bFields);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/announcement/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(v)),
    });
    setBusy(false);
    router.refresh();
  }
  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/announcement/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !v.active }),
    });
    setV((s) => ({ ...s, active: !s.active }));
    setBusy(false);
    router.refresh();
  }
  async function del() {
    if (!confirm("Öçirilsinmi?")) return;
    setBusy(true);
    await fetch(`/api/admin/announcement/${b.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-300">
          {ROLE_LABEL[v.role]}
        </span>
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
          Öçiriş
        </button>
      </div>
      <Fields v={v} set={(p) => setV((s) => ({ ...s, ...p }))} />
      {v.buttonText.trim() && v.buttonUrl.trim() && <ClickList announcementId={b.id} />}
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary mt-3 text-sm"
        >
          {busy ? "..." : "Saqlaş"}
        </button>
      )}
    </div>
  );
}

export function AnnouncementManager({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!draft.title.trim()) return;
    setBusy(true);
    await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(draft)),
    });
    setDraft(EMPTY);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <div className="mb-3 text-sm font-medium text-white">
          Yangi eʼlon qöşiş
        </div>
        <Fields v={draft} set={(p) => setDraft((s) => ({ ...s, ...p }))} />
        <button
          type="button"
          onClick={add}
          disabled={busy || !draft.title.trim()}
          className="btn-primary mt-3 text-sm"
        >
          {busy ? "..." : "Qöşiş"}
        </button>
        {draft.title.trim() && (
          <div className="mt-4">
            <div className="mb-1 text-xs uppercase text-zinc-600">
              Körinişi (özbekça)
            </div>
            <AnnouncementBanner
              a={{
                title: draft.title,
                body: draft.body,
                buttonText: draft.buttonText || null,
                buttonUrl: draft.buttonUrl || null,
              }}
            />
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-600">
        {initial.length} ta eʼlon · 2+ faol bölsa foydalanuvçida navbatlaşib
        körsatiladi (faqat kompyuterda)
      </div>

      {initial.map((b) => (
        <Row key={b.id} b={b} />
      ))}
    </div>
  );
}
