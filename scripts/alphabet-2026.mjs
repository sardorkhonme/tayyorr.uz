#!/usr/bin/env node
/**
 * O'zbek lotin alifbosining 2026-yilgi tahririga o'tkazish (OʻRQ-1184):
 *   Oʻ → Ö, Gʻ → Ğ, Sh → Ş, Ch → Ç, tutuq belgisi → ʼ
 *
 * Faqat foydalanuvchiga ko'rinadigan matnlar o'zgaradi (TypeScript AST orqali):
 * satrlar, shablon satrlar va JSX matni. Tegilmaydi: import yo'llari, className va boshqa
 * texnik atributlar, obyekt kalitlari, tur (type) literallari, taqqoslashlar (=== "chat"),
 * havolalar / yo'llar / identifikatorga o'xshash satrlar, `ru` / `en` tarjimalari, izohlar.
 * sh/ch bor so'zlar ichidan inglizcha va texnik so'zlar — EXCLUDE ro'yxatida.
 *
 *   node scripts/alphabet-2026.mjs scan  <papka...>   — o'zgarmaydi, sh/ch so'zlar ro'yxati
 *   node scripts/alphabet-2026.mjs apply <papka...>   — fayllarni yozadi
 *   node scripts/alphabet-2026.mjs text  "matn"       — bitta matnni o'giradi (sinov)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// ---- o'girish qoidalari ----------------------------------------------------------------

const APOS = String.raw`(?:'|’|‘|ʻ|ʼ|\x60|&apos;|&#39;|&#x27;|\\')`;
const RE_O = new RegExp(`([oO])${APOS}(?=\\p{L})`, "gu");
// gʻ so'z oxirida ham bo'ladi: mablagʻ, togʻ, bogʻ
const RE_G = new RegExp(`([gG])${APOS}(?=\\p{L}|$)`, "gu");
// so'z ichidagi tutuq: harf + apostrof + harf (ma'lumot → maʼlumot)
const RE_TUTUQ = new RegExp(`(?<=\\p{L})${APOS}(?=\\p{L})`, "gu");

/** sh/ch bor, lekin o'zbekcha bo'lmagan so'zlar (kichik harfda). */
export const EXCLUDE = new Set(JSON.parse(fs.readFileSync(new URL("./alphabet-2026-exclude.json", import.meta.url), "utf8")));

/** Matn ichida himoyalanadigan bo'laklar: havolalar, yo'llar, e-pochta, @login, ${...}, HTML teglar. */
const PROTECT = /(https?:\/\/[^\s"'<>)]+|www\.[^\s"'<>)]+|[\w.+-]+@[\w-]+\.[\w.]+|@[A-Za-z0-9_]+|\$\{[^}]*\}|<\/?[a-zA-Z][^>]*>|(?<![\p{L}\d])\/[a-z0-9\-_/.[\]]+|\{[a-zA-Z_.]+\}|&(?!apos;)[a-z]+;|\b[a-z]+\.[a-z][\w.]*\b)/gu;

function convertWord(w) {
  // w — faqat harflar va apostroflardan iborat so'z
  let out = w.replace(RE_O, (_, o) => (o === "O" ? "Ö" : "ö")).replace(RE_G, (_, g) => (g === "G" ? "Ğ" : "ğ"));
  const bare = out.toLowerCase().replace(/['’‘ʻʼ`]/g, "");
  if (/[sc]h/i.test(out) && !EXCLUDE.has(bare)) {
    out = out
      .replace(/SH/g, "Ş")
      .replace(/Sh/g, "Ş")
      .replace(/sh/g, "ş")
      .replace(/CH/g, "Ç")
      .replace(/Ch/g, "Ç")
      .replace(/ch/g, "ç");
  }
  return out.replace(RE_TUTUQ, "ʼ");
}

const WORD = new RegExp(String.raw`[\p{L}](?:[\p{L}]|${APOS}(?=\p{L})|(?<=\p{L}[gG])${APOS}(?!\p{L}))*`, "gu");

/** Matnni o'giradi (himoyalangan bo'laklarga tegmaydi). */
export function convertText(text, onWord) {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(PROTECT)) {
    out += convertPlain(text.slice(last, m.index), onWord) + m[0];
    last = m.index + m[0].length;
  }
  return out + convertPlain(text.slice(last), onWord);
}

function convertPlain(s, onWord) {
  return s.replace(WORD, (w) => {
    const c = convertWord(w);
    if (onWord && /[sc]h/i.test(w)) onWord(w, c);
    return c;
  });
}

// ---- qaysi satrlar foydalanuvchiga ko'rinadi -------------------------------------------

const TECH_ATTRS = new Set([
  "className", "class", "href", "src", "srcSet", "id", "key", "name", "type", "role", "rel", "target",
  "htmlFor", "method", "action", "as", "variant", "size", "inputMode", "autoComplete", "icon", "platform",
  "kind", "d", "viewBox", "fill", "stroke", "strokeLinecap", "strokeLinejoin", "fillRule", "clipRule",
  "pattern", "accept", "encType", "lang", "dir", "mode", "align", "side", "tone", "color", "theme",
  "sizes", "media", "loading", "decoding", "referrerPolicy", "crossOrigin", "transform", "points",
  "x", "y", "cx", "cy", "r", "rx", "ry", "x1", "x2", "y1", "y2", "width", "height", "preserveAspectRatio",
  "gradientUnits", "offset", "stopColor", "mask", "filter", "clipPath", "url", "endpoint", "redirectTo",
  "image", "logo", "svgOrigin", "capture", "list", "form", "slot", "tag", "status",
]);

const isTechnical = (s) => {
  // o'zbekcha apostrofli so'z (o'chirish, so'ragan) — texnik satrda bo'lmaydi
  if (new RegExp(`\\p{L}${APOS}\\p{L}`, "u").test(s)) return false;
  // oxiridagi tinish belgilari ("Chiqish...", "O'chirilsinmi?") texnik belgi emas
  s = s.replace(/[?!.:…,;)]+$/, "");
  return isTechnicalCore(s);
};
const isTechnicalCore = (s) =>
  s.length === 0 ||
  // bo'shliqsiz va texnik belgilar (yo'l, kalit, klass, kod)
  (!/\s/.test(s) && (/[/_.:#=?&@\\[\]{}<>|]/.test(s) || /^[a-z0-9-]+$/.test(s) || /^[A-Z0-9_-]+$/.test(s))) ||
  /^(https?:|mailto:|tel:|data:)/.test(s);

function isTranslationNode(node) {
  for (let p = node.parent; p; p = p.parent) {
    const name =
      (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name
        ? p.name.getText()
        : null;
    if (name && /^(ru|en|\w+(Ru|En))$/.test(name.replace(/["']/g, ""))) return true;
  }
  return false;
}

function shouldConvertString(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return false;
  if (ts.isLiteralTypeNode(p)) return false;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p)) && p.name === node) return false;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return false;
  if (ts.isCaseClause(p)) return false;
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(p.operatorToken.kind)) return false;
  if (ts.isCallExpression(p)) {
    const callee = p.expression.getText();
    if (/^(require|import|fetch|redirect|permanentRedirect|notFound)$|\.(get|set|has|delete|getAll|push|replace|prefetch|startsWith|endsWith|includes|split|join|indexOf|matchMedia|querySelector|querySelectorAll|getElementById|addEventListener|removeEventListener|createElement|setAttribute|getAttribute|getItem|setItem|removeItem|append|toLocaleString|toLocaleDateString|toLocaleTimeString|padStart|padEnd|localeCompare)$/.test(callee))
      return false;
    if (/^(cn|clsx|twMerge|cva)$/.test(callee)) return false;
  }
  // JSX atributi
  const attr = ts.isJsxAttribute(p) ? p : ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent) ? p.parent : null;
  if (attr && (TECH_ATTRS.has(attr.name.getText()) || /^(data|aria-(controls|describedby|labelledby|hidden|live|current|haspopup|expanded|checked|selected|pressed))/.test(attr.name.getText()))) return false;
  // className={`... ${x}`} va cn(...) ichidagilar
  for (let a = p; a && !ts.isSourceFile(a); a = a.parent) {
    if (ts.isJsxAttribute(a) && TECH_ATTRS.has(a.name.getText())) return false;
    if (ts.isPropertyAssignment(a) && /^(className|href|src|icon|key|id|path|url|route|endpoint|image|tag|kind|platform|type|value|bg|from|to|color|cls|tone)$/.test(a.name.getText())) {
      // value/to/from — faqat texnik ko'rinsa (pastda tekshiriladi)
      if (/^(className|href|src|icon|key|id|path|url|route|endpoint|image|tag|kind|platform|type|bg|cls|tone|color)$/.test(a.name.getText())) return false;
    }
    if (ts.isFunctionLike(a) || ts.isJsxElement(a) || ts.isJsxSelfClosingElement(a)) break;
  }
  if (isTranslationNode(node)) return false;
  return true;
}

// ---- fayllarni aylanish ----------------------------------------------------------------

function listFiles(dirs) {
  const out = execFileSync("git", ["ls-files", "--", ...dirs], { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(tsx?|mts)$/.test(f) && !/\.d\.ts$/.test(f) && !f.includes("alphabet-2026"));
  return out;
}

function processFile(file, mode, stats) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];

  const onWord = (ctx) => (w, c) => {
    const k = w.toLowerCase().replace(/['’‘ʻʼ`]|&apos;|\\'/g, "");
    const e = stats.words.get(k) ?? { n: 0, sample: ctx, conv: c, files: new Set() };
    e.n++;
    e.files.add(file);
    stats.words.set(k, e);
  };

  const pushEdit = (start, end, raw, ctx) => {
    const conv = convertText(raw, onWord(ctx));
    if (conv !== raw) edits.push({ start, end, text: conv });
  };

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const val = node.text;
      if (!isTechnical(val) && shouldConvertString(node)) {
        const start = node.getStart(sf) + 1;
        const end = node.getEnd() - 1;
        pushEdit(start, end, src.slice(start, end), val.slice(0, 80));
      }
    } else if (ts.isTemplateExpression(node)) {
      if (shouldConvertString(node)) {
        const parts = [node.head, ...node.templateSpans.map((s) => s.literal)];
        const whole = parts.map((p) => p.text).join(" ");
        if (!isTechnical(whole.trim()) && /\s/.test(whole)) {
          for (const p of parts) {
            const start = p.getStart(sf) + 1;
            const end = p.getEnd() - (ts.isTemplateTail(p) ? 1 : 2);
            pushEdit(start, end, src.slice(start, end), whole.slice(0, 80));
          }
        }
      }
    } else if (ts.isJsxText(node)) {
      const start = node.getStart(sf);
      const end = node.getEnd();
      if (!isTranslationNode(node)) pushEdit(start, end, src.slice(start, end), node.getText().trim().slice(0, 80));
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return 0;
  stats.files++;
  if (mode === "apply") {
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    fs.writeFileSync(file, out);
  }
  return edits.length;
}

// ---- CLI -------------------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
const [mode, ...args] = isMain ? process.argv.slice(2) : [];
if (!isMain) {
  // modul sifatida import qilingan (scripts/alphabet-2026-db.mjs)
} else if (mode === "text") {
  console.log(convertText(args.join(" ")));
} else if (mode === "scan" || mode === "apply") {
  const stats = { files: 0, words: new Map() };
  let edits = 0;
  for (const f of listFiles(args)) edits += processFile(f, mode, stats);
  if (mode === "scan") {
    const rows = [...stats.words.entries()].sort((a, b) => b[1].n - a[1].n);
    const report = rows.map(([k, e]) => `${k}\t${e.n}\t${EXCLUDE.has(k) ? "SKIP" : e.conv}\t${e.sample}`).join("\n");
    fs.writeFileSync(path.join(process.env.SCAN_OUT || ".", "alphabet-scan.tsv"), report);
  }
  console.log(`${mode}: ${stats.files} fayl, ${edits} o'zgarish, ${stats.words.size} ta sh/ch so'z`);
} else {
  console.log("node scripts/alphabet-2026.mjs scan|apply <papka...> | text <matn>");
}
