#!/usr/bin/env node
/**
 * Trendyol Importer (Phase-1 safe)
 * - Reads product page URLs from a file (urls.txt) or from CLI args
 * - Fetches product HTML (no login, best-effort)
 * - Extracts: title, description, price (best-effort), images (best-effort)
 * - Writes to: frontend/assets/data/products.next.json (atomic write)
 * - Optionally downloads images to: frontend/assets/img/products/<id>/<n>.jpg
 *
 * Usage:
 *   cd frontend
 *   node tools/trendyol-import.mjs urls.txt --downloadImages=0 --delayMs=400
 *   node tools/trendyol-import.mjs "https://www.trendyol.com/...-p-123" --downloadImages=1
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(FRONTEND_ROOT, "assets", "data", "products.next.json");
const OUT_JSON_TMP = path.join(FRONTEND_ROOT, "assets", "data", "products.next.json.tmp");
const IMG_ROOT = path.join(FRONTEND_ROOT, "assets", "img", "products");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function slugifyTR(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractProductIdFromUrl(u) {
  const m = String(u).match(/-p-(\d+)/i);
  if (m?.[1]) return m[1];
  try {
    const url = new URL(u);
    const seg = url.pathname.split("/").filter(Boolean).pop() || "";
    return seg || String(Date.now());
  } catch {
    return String(Date.now());
  }
}

function safeJsonParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function parsePrice(val) {
  // "1.299,90 TL" -> 1299.90
  const cleaned = String(val || "")
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function extractMeta(html, nameOrProp) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1]?.trim() || "";
}

function extractJsonLd(html) {
  const blocks = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let m;
  while ((m = re.exec(html))) {
    const raw = (m[1] || "").trim();
    const obj = safeJsonParse(raw);
    if (obj) blocks.push(obj);
  }
  return blocks;
}

function pickProductFromJsonLd(blocks) {
  const flat = [];
  for (const b of blocks) {
    if (Array.isArray(b)) flat.push(...b);
    else if (b?.["@graph"] && Array.isArray(b["@graph"])) flat.push(...b["@graph"]);
    else flat.push(b);
  }
  return flat.find((x) => String(x?.["@type"] || "").toLowerCase() === "product") || null;
}

function extractImageUrls(html) {
  const urls = new Set();

  // 1) JSON-LD image
  const jsonlds = extractJsonLd(html);
  for (const block of jsonlds) {
    if (!block) continue;
    if (Array.isArray(block.image)) {
      for (const img of block.image) if (typeof img === "string") urls.add(img);
    } else if (typeof block.image === "string") {
      urls.add(block.image);
    }
  }

  // 2) direct CDN matches from HTML
  const regex = /https:\/\/cdn\.dsmcdn\.com\/[^\s"'<>]+/gi;
  for (const m of html.match(regex) || []) urls.add(m);

  return Array.from(urls).slice(0, 4);
}

async function downloadImage(url, outPath) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": "https://www.trendyol.com/",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

async function importOne(url, options) {
  const id = extractProductIdFromUrl(url);

  const html = await fetchHtml(url);

  const titleOg = extractMeta(html, "og:title");
  const descOg = extractMeta(html, "og:description");
  const imgOg = extractMeta(html, "og:image");

  const p = pickProductFromJsonLd(extractJsonLd(html));

  const title = (p?.name || titleOg || "").trim() || `Ürün ${id}`;
  const description = (p?.description || descOg || "").trim();

  // price best-effort
  let priceValue = 0;
  try {
    if (p?.offers?.price != null) priceValue = parsePrice(p.offers.price);
    else if (p?.price != null) priceValue = parsePrice(p.price);
    else {
      const priceMatches = [...html.matchAll(/"price"\s*:\s*"?(\d+)[.,]?\d*"?/gi)];
      if (priceMatches.length > 0) priceValue = parseInt(priceMatches[0][1], 10);
    }
  } catch {
    priceValue = 0;
  }

  // images
  let imagesRemote = extractImageUrls(html);
  if (imagesRemote.length === 0 && imgOg) imagesRemote = [imgOg];

  const slug = slugifyTR(title) || `urun-${id}`;

  const localFolder = path.join(IMG_ROOT, id);
  await ensureDir(localFolder);

  const localImages = [];
  if (options.downloadImages) {
    for (let i = 0; i < imagesRemote.length; i++) {
      const remote = imagesRemote[i];
      const out = path.join(localFolder, `${i + 1}.jpg`);
      try {
        await downloadImage(remote, out);
        localImages.push(`/assets/img/products/${id}/${i + 1}.jpg`);
        if (options.delayMs > 0) await sleep(options.delayMs);
      } catch {
        // ignore
      }
    }
  }

  const finalImages =
    localImages.length >= 2
      ? localImages
      : imagesRemote.length >= 2
      ? imagesRemote.slice(0, 2)
      : localImages.length === 1
      ? localImages
      : imagesRemote.length === 1
      ? [imagesRemote[0]]
      : [];

  const shortDescription =
    (description ? description.split("\n")[0] : "").slice(0, 140) ||
    "Yeni sezon özel tasarım. Konforlu ve şık.";

  // Map to your current working schema
  return {
    id: String(id),
    title,
    price: Number(priceValue || 0),
    shortDescription,
    description: description || shortDescription,
    images: finalImages,
    slug,
    url,

    // Keep these keys (fallback empty) so frontend doesn't break
    category: "",
    gender: "",
    ageRange: "",
    colors: [],
    sizes: [],
    tags: [],
  };
}

function parseArgs(argv) {
  // supports:
  // --downloadImages=0  OR  --downloadImages 0
  // --delayMs=400       OR  --delayMs 400
  const flags = { downloadImages: 1, delayMs: 250 };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }

    const eq = a.indexOf("=");
    if (eq !== -1) {
      const key = a.slice(2, eq);
      const val = a.slice(eq + 1);
      if (key === "downloadImages") flags.downloadImages = Number(val);
      if (key === "delayMs") flags.delayMs = Number(val);
      continue;
    }

    const key = a.slice(2);
    const val = argv[i + 1];
    if (key === "downloadImages") {
      flags.downloadImages = Number(val);
      i++;
    } else if (key === "delayMs") {
      flags.delayMs = Number(val);
      i++;
    }
  }

  flags.downloadImages = Number(flags.downloadImages) ? 1 : 0;
  flags.delayMs = Number.isFinite(Number(flags.delayMs)) ? Number(flags.delayMs) : 250;

  return { flags, positional };
}

async function loadUrls(positional) {
  if (positional.length === 1 && (positional[0].endsWith(".txt") || positional[0].endsWith(".list"))) {
    const filePath = path.resolve(process.cwd(), positional[0]);
    const txt = await fs.readFile(filePath, "utf-8");
    return txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return positional.map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    console.error("Usage: node tools/trendyol-import.mjs urls.txt --downloadImages=0 --delayMs=400");
    process.exit(1);
  }

  const { flags, positional } = parseArgs(argv);
  const rawUrls = await loadUrls(positional);

  let urls = rawUrls
    .filter((u) => u.startsWith("http") && u.includes("trendyol.com") && u.includes("-p-"))
    .map((u) => u.split("?")[0]); // remove query

  urls = uniq(urls);

  console.log(`Loaded ${urls.length} urls`);
  console.log(`downloadImages=${flags.downloadImages} delayMs=${flags.delayMs}`);

  await ensureDir(path.dirname(OUT_JSON));
  await ensureDir(IMG_ROOT);

  const products = [];

  for (const u of urls) {
    try {
      console.log("-> importing:", u);
      const prod = await importOne(u, { downloadImages: flags.downloadImages, delayMs: flags.delayMs });
      products.push(prod);
      console.log(`   OK: ${prod.id} | ${prod.title} | ${prod.price}`);
    } catch (e) {
      console.log(`   FAIL: ${u} (${e.message})`);
    }

    // polite delay between pages too
    if (flags.delayMs > 0) await sleep(flags.delayMs);
  }

  // atomic write
  await fs.writeFile(OUT_JSON_TMP, JSON.stringify(products, null, 2), "utf-8");
  await fs.rename(OUT_JSON_TMP, OUT_JSON);

  console.log(`\n✅ products.next.json written: ${OUT_JSON}`);
  console.log(`Toplam ürün: ${products.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});