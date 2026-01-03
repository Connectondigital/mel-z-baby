#!/usr/bin/env node
/**
 * Validate products.next.json file for correct structure and data
 */

import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND_ROOT = path.resolve(new URL(import.meta.url).pathname, "..", "..");
const PRODUCTS_PATH = path.join(FRONTEND_ROOT, "assets", "data", "products.next.json");

function isValidImagePath(p) {
  return typeof p === "string" && p.startsWith("/assets/img/products/");
}

async function main() {
  try {
    const raw = await fs.readFile(PRODUCTS_PATH, "utf-8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`Invalid JSON in products.next.json: ${e.message}`);
      process.exit(1);
    }

    if (!Array.isArray(data)) {
      console.error("products.next.json is not an array");
      process.exit(1);
    }

    for (const [i, product] of data.entries()) {
      if (typeof product !== "object" || product === null) {
        console.error(`Product at index ${i} is not an object`);
        process.exit(1);
      }
      const { id, title, price, images } = product;
      if (typeof id !== "string" || id.trim() === "") {
        console.error(`Product at index ${i} has invalid or missing id`);
        process.exit(1);
      }
      if (typeof title !== "string" || title.trim() === "") {
        console.error(`Product at index ${i} has invalid or missing title`);
        process.exit(1);
      }
      if (typeof price !== "number" || isNaN(price)) {
        console.error(`Product at index ${i} has invalid or missing price`);
        process.exit(1);
      }
      if (!Array.isArray(images)) {
        console.error(`Product at index ${i} has images field that is not an array`);
        process.exit(1);
      }
      for (const img of images) {
        if (!isValidImagePath(img)) {
          console.error(`Product at index ${i} has image path not starting with /assets/img/products/: ${img}`);
          process.exit(1);
        }
      }
    }

    console.log("Validation passed: products.next.json is valid.");
    process.exit(0);
  } catch (e) {
    console.error(`Error reading products.next.json: ${e.message}`);
    process.exit(1);
  }
}

main();
