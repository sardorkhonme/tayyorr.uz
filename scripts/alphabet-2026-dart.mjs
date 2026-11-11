#!/usr/bin/env node
/**
 * Yangi o'zbek lotin alifbosi (2026) — mobil ilova (Flutter/Dart) matnlari uchun.
 * Qoidalar scripts/alphabet-2026.mjs dagi bilan bir xil (convertText); bu yerda faqat Dart satrlari ajratiladi.
 * Faqat foydalanuvchiga ko'rinadigan satrlar o'giriladi: izohlar, importlar, map kalitlari (json['x'], 'x': …),
 * taqqoslashlar (== 'x'), case, raw (r'…') satrlar, API yo'llari va texnik satrlarga tegilmaydi.
 *
 *   node scripts/alphabet-2026-dart.mjs check mobile/lib   — o'zgarishlarni ko'rsatadi
 *   node scripts/alphabet-2026-dart.mjs write mobile/lib   — yozadi
 */
import fs from "node:fs";
import path from "node:path";

import { convertText } from "./alphabet-2026.mjs";

const SKIP_CALLEE =
  /(?:\b(?:RegExp|Uri\.parse|Uri\.tryParse|launchUrl|ValueKey|Key|PageStorageKey|AssetImage|Image\.asset|DateFormat|MethodChannel|EventChannel)|\.(?:startsWith|endsWith|contains|split|replaceAll|replaceFirst|get|post|patch|delete|put|getString|setString|getBool|setBool|getInt|setInt|read|write|containsKey|remove|indexOf|padLeft|padRight|request|download|asset|open))\s*\(\s*$/;

const isTechnical = (s) => {
  if (/\p{L}['’ʻʼ]\p{L}/u.test(s)) return false;
  s = s.replace(/[?!.:…,;)]+$/, "");
  return (
    s.length === 0 ||
    (!/\s/.test(s) && (/[/_.:#=?&@\\[\]{}<>|]/.test(s) || /^[a-z0-9-]+$/.test(s) || /^[A-Z0-9_-]+$/.test(s))) ||
    /^(https?:|mailto:|tel:|data:|assets\/)/.test(s)
  );
};

/**
 * Dart manbani aylanib chiqib, har satr literalini topadi. Interpolatsiya (${…}) ichidagi kod ham
 * rekursiv ko'riladi (u yerdagi satrlar ham foydalanuvchiga ko'rinishi mumkin).
 * Natija: { start, end, raw, parts } — parts: literal matn bo'laklari [s, e] (interpolatsiyasiz).
 */
function scan(src) {
  const out = [];
  let i = 0;
  const n = src.length;

  function skipComment() {
    if (src.startsWith("//", i)) {
      const e = src.indexOf("\n", i);
      i = e < 0 ? n : e;
      return true;
    }
    if (src.startsWith("/*", i)) {
      let depth = 1;
      i += 2;
      while (i < n && depth) {
        if (src.startsWith("/*", i)) (depth++, (i += 2));
        else if (src.startsWith("*/", i)) (depth--, (i += 2));
        else i++;
      }
      return true;
    }
    return false;
  }

  // kod qismi: `}` gacha (interpolatsiya ichida) yoki oxirigacha
  function code(untilBrace) {
    let depth = 0;
    while (i < n) {
      if (skipComment()) continue;
      const c = src[i];
      if (untilBrace) {
        if (c === "{") depth++;
        else if (c === "}") {
          if (depth === 0) return;
          depth--;
        }
      }
      const m = /^(r?)('''|"""|'|")/.exec(src.slice(i, i + 4));
      if (m && (m[1] === "" || !/[\w$]/.test(src[i - 1] ?? ""))) {
        string(m[1] === "r", m[2]);
        continue;
      }
      i++;
    }
  }

  function string(raw, q) {
    const start = i;
    i += (raw ? 1 : 0) + q.length;
    const parts = [];
    let segStart = i;
    while (i < n) {
      if (src.startsWith(q, i)) {
        parts.push([segStart, i]);
        i += q.length;
        out.push({ start, end: i, raw, parts });
        return;
      }
      const c = src[i];
      if (!raw && c === "\\") {
        i += 2;
        continue;
      }
      if (!raw && c === "$") {
        parts.push([segStart, i]);
        if (src[i + 1] === "{") {
          i += 2;
          code(true);
          i++; // }
        } else {
          i++;
          while (i < n && /[\w]/.test(src[i])) i++;
        }
        segStart = i;
        continue;
      }
      if (q.length === 1 && c === "\n") break; // buzilgan satr
      i++;
    }
    out.push({ start, end: i, raw, parts });
  }

  code(false);
  return out;
}

function prevCode(src, idx) {
  return src.slice(Math.max(0, idx - 80), idx).replace(/\s+$/, "");
}
function nextCode(src, idx) {
  return src.slice(idx, idx + 40).replace(/^\s+/, "");
}

function userVisible(src, lit) {
  if (lit.raw) return false;
  const before = prevCode(src, lit.start);
  const after = nextCode(src, lit.end);
  const lineStart = src.lastIndexOf("\n", lit.start) + 1;
  const line = src.slice(lineStart, lit.start).trim();
  if (/^(import|export|part|library)\b/.test(line)) return false;
  if (/\[$/.test(before) && /^\]/.test(after)) return false; // json['key']
  if (/^:/.test(after) && /[{,]$/.test(before)) return false; // {'key': …}
  if (/^(==|!=)/.test(after) || /(==|!=)$/.test(before)) return false;
  if (/\bcase$/.test(before)) return false;
  if (SKIP_CALLEE.test(before)) return false;
  return true;
}

function convertFile(file, write, report) {
  const src = fs.readFileSync(file, "utf8");
  const lits = scan(src);
  const edits = [];
  for (const lit of lits) {
    if (!userVisible(src, lit)) continue;
    const whole = lit.parts.map(([s, e]) => src.slice(s, e)).join(" ");
    if (isTechnical(whole.trim())) continue;
    for (const [s, e] of lit.parts) {
      const t = src.slice(s, e);
      const c = convertText(t);
      if (c !== t) edits.push([s, e, c, t]);
    }
  }
  if (!edits.length) return 0;
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [s, e, c] of edits) out = out.slice(0, s) + c + out.slice(e);
  if (write) fs.writeFileSync(file, out);
  for (const [, , c, t] of edits.reverse()) report.push(`${path.relative(process.cwd(), file)}: ${t}  →  ${c}`);
  return edits.length;
}

function listDart(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...listDart(p));
    else if (e.name.endsWith(".dart")) res.push(p);
  }
  return res;
}

const [mode, dir] = process.argv.slice(2);
if (!["check", "write"].includes(mode) || !dir) {
  console.error("node scripts/alphabet-2026-dart.mjs check|write <papka>");
  process.exit(1);
}
const report = [];
let total = 0;
for (const f of listDart(dir)) total += convertFile(f, mode === "write", report);
console.log(report.join("\n"));
console.error(`\n${mode === "write" ? "Yozildi" : "Topildi"}: ${total} ta bo'lak`);
