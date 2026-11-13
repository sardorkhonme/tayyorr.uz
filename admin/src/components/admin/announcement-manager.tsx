"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AnnouncementBanner } from "@/components/announcement-banner";
import { appConfirm } from "@/components/app-dialog";

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


const AUDIENCE: { value: Banner["role"]; label: string; hint: string }[] = [
  { value: "", label: "Hammaga", hint: "tayyorr.uz va Tayyorr SMM — hamma foydalanuvçilarga" },
  { value: "ORDERER", label: "Buyurtmaçilarga", hint: "tayyorr.uz — faqat buyurtma beruvçilar" },
  { value: "PREPARER", label: "Tayyorlovçilarga", hint: "tayyorr.uz — faqat tayyorlovçilar" },
  { value: "SMM", label: "Tayyorr SMM'da", hint: "Tayyorr SMM bölimi (ilova va sayt)" },
];

/** E'lon auditoriyasi — ommaviy xabardagi platforma tanlovi uslubida (bittasi tanlanadi). */
function AudiencePicker({ value, onChange }: { value: Banner["role"]; onChange: (v: Banner["role"]) => void }) {
  const cur = AUDIENCE.find((o) => o.value === value) ?? AUDIENCE[0];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {AUDIENCE.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value || "all"}
              title={o.hint}
              className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition ${
                on
                  ? "border-indigo-400/60 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
              }`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-indigo-500"
                checked={on}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      <span className="text-[11px] text-zinc-500">{cur.hint}</span>
    </div>
  );
}

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
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-zinc-400">Kimga körinadi:</span>
        <AudiencePicker value={v.role} onChange={(role) => set({ role })} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
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
    if (!(await appConfirm({ message: "Eʼlon öçirilsinmi?", confirmText: "Öçiriş", danger: true }))) return;
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
