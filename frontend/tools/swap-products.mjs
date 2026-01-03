#!/usr/bin/env node
/**
 * Safely swap products.next.json to products.json with backup
 */

import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND_ROOT = path.resolve(new URL(import.meta.url).pathname, "..", "..");
const DATA_DIR = path.join(FRONTEND_ROOT, "assets", "data");
const NEXT_PATH = path.join(DATA_DIR, "products.next.json");
const CURRENT_PATH = path.join(DATA_DIR, "products.json");

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function validateJsonFile(p) {
  try {
    const raw = await fs.readFile(p, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error("JSON is not an array");
    }
    if (data.length === 0) {
      throw new Error("JSON array is empty");
    }
    for (const product of data) {
      if (typeof product !== "object" || product === null) {
        throw new Error("Product is not an object");
      }
      if (typeof product.id !== "string" || product.id.trim() === "") {
        throw new Error("Product missing valid id");
      }
      if (typeof product.title !== "string" || product.title.trim() === "") {
        throw new Error("Product missing valid title");
      }
      if (typeof product.price !== "number" || isNaN(product.price)) {
        throw new Error("Product missing valid price");
      }
      if (!Array.isArray(product.images)) {
        throw new Error("Product images is not an array");
      }
      for (const img of product.images) {
        if (typeof img !== "string" || !img.startsWith("/assets/img/products/")) {
          throw new Error("Product image path invalid");
        }
      }
    }
    return true;
  } catch (e) {
    throw new Error(`Validation failed: ${e.message}`);
  }
}

async function main() {
  if (!(await fileExists(NEXT_PATH))) {
    console.error("products.next.json does not exist. Aborting swap.");
    process.exit(1);
  }

  try {
    await validateJsonFile(NEXT_PATH);
  } catch (e) {
    console.error(e.message);
    console.error("Aborting swap due to validation failure.");
    process.exit(1);
  }

  // Backup current products.json if exists
  if (await fileExists(CURRENT_PATH)) {
    const backupName = `products.json.backup.${timestamp()}`;
    const backupPath = path.join(DATA_DIR, backupName);
    await fs.copyFile(CURRENT_PATH, backupPath);
    console.log(`Backup created: ${backupName}`);
  } else {
    console.log("No existing products.json to backup.");
  }

  // Replace products.json with products.next.json
  await fs.copyFile(NEXT_PATH, CURRENT_PATH);
  console.log("products.json has been replaced with products.next.json");
  process.exit(0);
}

main().catch((e) => {
  console.error("Unexpected error:", e.message);
  process.exit(1);
});
