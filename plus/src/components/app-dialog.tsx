"use client";

/**
 * Brauzerning alert/confirm/prompt oynalari örniga saytning öz dialoglari.
 * Imperativ API: `await appConfirm({...})`, `await appAlert({...})`, `await appPrompt({...})`.
 * Öz-özidan document.body ga alohida React root yaratib çiziladi — layoutga provider kerak emas.
 */

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

/** Bu sayt uçun standart mavzu: true — qorongʻi (html.light bilan yorugʻ), false — yorugʻ (html.dark bilan qorongʻi). */
const DEFAULT_DARK = false;

export type AppConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
export type AppAlertOptions = { title?: string; message?: string; okText?: string };
export type AppPromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  multiline?: boolean;
};

type Req =
  | { id: number; kind: "confirm"; opts: AppConfirmOptions; resolve: (v: boolean) => void }
  | { id: number; kind: "alert"; opts: AppAlertOptions; resolve: () => void }
  | { id: number; kind: "prompt"; opts: AppPromptOptions; resolve: (v: string | null) => void };

let seq = 0;
let queue: Req[] = [];
let notify: (() => void) | null = null;
let root: Root | null = null;

function ensureRoot() {
  if (root || typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("data-app-dialog", "");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<DialogHost />);
}

function push(req: Req) {
  queue = [...queue, req];
  ensureRoot();
  notify?.();
}

/** «…mi?» — tasdiqlaş oynasi. true — tasdiqlandi. */
export function appConfirm(opts: AppConfirmOptions | string): Promise<boolean> {
  const o = typeof opts === "string" ? { message: opts } : opts;
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => push({ id: ++seq, kind: "confirm", opts: o, resolve }));
}

/** Xabar oynasi (faqat «Yaxşi»). */
export function appAlert(opts: AppAlertOptions | string): Promise<void> {
  const o = typeof opts === "string" ? { message: opts } : opts;
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve) => push({ id: ++seq, kind: "alert", opts: o, resolve }));
}

/** Matn kiritiş oynasi. null — bekor qilindi. */
export function appPrompt(opts: AppPromptOptions | string): Promise<string | null> {
  const o = typeof opts === "string" ? { message: opts } : opts;
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => push({ id: ++seq, kind: "prompt", opts: o, resolve }));
}

const CSS_DARK = `
  --dlg-dim: rgba(0,0,0,.5);
  --dlg-card: #1a1a23;
  --dlg-line: rgba(255,255,255,.09);
  --dlg-fg: #f4f4f5;
  --dlg-mute: #a1a1aa;
  --dlg-btn: rgba(255,255,255,.08);
  --dlg-btn-h: rgba(255,255,255,.14);
  --dlg-btn-fg: #e4e4e7;
  --dlg-in: rgba(255,255,255,.05);
  --dlg-shadow: 0 24px 60px -12px rgba(0,0,0,.6);
`;
const CSS_LIGHT = `
  --dlg-dim: rgba(15,15,30,.28);
  --dlg-card: #ffffff;
  --dlg-line: #ececf3;
  --dlg-fg: #16161d;
  --dlg-mute: #6b6b78;
  --dlg-btn: #f1f1f6;
  --dlg-btn-h: #e7e7ef;
  --dlg-btn-fg: #2b2b36;
  --dlg-in: #f7f7fb;
  --dlg-shadow: 0 24px 60px -16px rgba(16,16,40,.28);
`;

const STYLE = `
.appdlg{${DEFAULT_DARK ? CSS_DARK : CSS_LIGHT}}
${DEFAULT_DARK ? "html.light .appdlg" : "html.dark .appdlg"}{${DEFAULT_DARK ? CSS_LIGHT : CSS_DARK}}
.appdlg{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;
  font-family:inherit;-webkit-tap-highlight-color:transparent}
.appdlg-dim{position:absolute;inset:0;background:var(--dlg-dim);animation:appdlg-fade .16s ease both}
.appdlg-card{position:relative;width:100%;max-width:360px;max-height:calc(100dvh - 32px);overflow:auto;
  background:var(--dlg-card);border:1px solid var(--dlg-line);border-radius:20px;padding:20px;
  box-shadow:var(--dlg-shadow);color:var(--dlg-fg);animation:appdlg-pop .18s cubic-bezier(.2,.9,.3,1.2) both}
.appdlg.out .appdlg-dim{animation:appdlg-fade-out .14s ease both}
.appdlg.out .appdlg-card{animation:appdlg-pop-out .14s ease both}
.appdlg-title{margin:0;font-size:16px;line-height:1.35;font-weight:600;color:var(--dlg-fg)}
.appdlg-msg{margin:6px 0 0;font-size:14px;line-height:1.5;color:var(--dlg-mute);white-space:pre-line;overflow-wrap:anywhere}
.appdlg-title + .appdlg-msg{margin-top:8px}
.appdlg-only{margin:0;font-size:15px;line-height:1.5;font-weight:500;color:var(--dlg-fg);white-space:pre-line;overflow-wrap:anywhere}
.appdlg-in{display:block;width:100%;margin-top:14px;padding:10px 12px;border-radius:12px;border:1px solid var(--dlg-line);
  background:var(--dlg-in);color:var(--dlg-fg);font:inherit;font-size:15px;line-height:1.45;outline:none;resize:vertical;box-sizing:border-box}
.appdlg-in:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.22)}
.appdlg-btns{display:flex;gap:8px;margin-top:20px}
.appdlg-btn{flex:1;min-height:42px;padding:10px 12px;border:0;border-radius:12px;font:inherit;font-size:14px;font-weight:500;
  cursor:pointer;transition:background-color .15s,transform .1s;background:var(--dlg-btn);color:var(--dlg-btn-fg)}
.appdlg-btn:hover{background:var(--dlg-btn-h)}
.appdlg-btn:active{transform:scale(.97)}
.appdlg-btn:focus-visible{outline:2px solid #818cf8;outline-offset:2px}
.appdlg-btn.pri{background:#6366f1;color:#fff;font-weight:600}
.appdlg-btn.pri:hover{background:#4f46e5}
.appdlg-btn.dng{background:#ef4444;color:#fff;font-weight:600}
.appdlg-btn.dng:hover{background:#dc2626}
@keyframes appdlg-fade{from{opacity:0}to{opacity:1}}
@keyframes appdlg-fade-out{from{opacity:1}to{opacity:0}}
@keyframes appdlg-pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes appdlg-pop-out{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.96)}}
@media (prefers-reduced-motion:reduce){.appdlg-dim,.appdlg-card{animation-duration:.01ms!important}}
`;

function DialogHost() {
  const [, force] = useState(0);
  useEffect(() => {
    notify = () => force((n) => n + 1);
    return () => {
      notify = null;
    };
  }, []);
  const cur = queue[0];
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      {cur && <Dialog key={cur.id} req={cur} />}
    </>
  );
}

function Dialog({ req }: { req: Req }) {
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState(req.kind === "prompt" ? (req.opts.defaultValue ?? "") : "");
  const doneRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const prevFocus = useRef<Element | null>(null);

  const finish = (ok: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (req.kind === "confirm") req.resolve(ok);
    else if (req.kind === "alert") req.resolve();
    else req.resolve(ok ? value : null);
    setClosing(true);
    window.setTimeout(() => {
      queue = queue.filter((r) => r.id !== req.id);
      const pf = prevFocus.current;
      if (pf instanceof HTMLElement && queue.length === 0) {
        try {
          pf.focus({ preventScroll: true });
        } catch {
          /* fokus qaytmasa — muhim emas */
        }
      }
      notify?.();
    }, 140);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    prevFocus.current = document.activeElement;
    if (req.kind === "prompt") {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    } else okRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        finishRef.current(false);
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // textarea'da Shift+Enter — yangi qator; bekor tugmasida turgan bölsa — bekor
        if (document.activeElement === cancelRef.current) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        finishRef.current(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [req.kind]);

  const o = req.opts;
  const title = o.title;
  const message = o.message;
  const danger = req.kind === "confirm" && !!req.opts.danger;
  const okText =
    req.kind === "alert"
      ? req.opts.okText || "Yaxşi"
      : req.opts.confirmText || (danger ? "Öçiriş" : "Tasdiqlaş");
  const cancelText = req.kind === "alert" ? "" : req.opts.cancelText || "Bekor qiliş";

  return (
    <div className={`appdlg${closing ? " out" : ""}`}>
      <div className="appdlg-dim" onClick={() => finish(false)} />
      <div
        role={req.kind === "alert" ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-label={title || message}
        className="appdlg-card"
      >
        {title ? <h2 className="appdlg-title">{title}</h2> : null}
        {message ? <p className={title ? "appdlg-msg" : "appdlg-only"}>{message}</p> : null}
        {req.kind === "prompt" &&
          (req.opts.multiline ? (
            <textarea
              ref={inputRef}
              className="appdlg-in"
              rows={4}
              value={value}
              placeholder={req.opts.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <input
              ref={inputRef}
              className="appdlg-in"
              value={value}
              placeholder={req.opts.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          ))}
        <div className="appdlg-btns">
          {req.kind !== "alert" && (
            <button ref={cancelRef} type="button" className="appdlg-btn" onClick={() => finish(false)}>
              {cancelText}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            className={`appdlg-btn ${danger ? "dng" : "pri"}`}
            onClick={() => finish(true)}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
