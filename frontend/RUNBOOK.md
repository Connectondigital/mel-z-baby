# Mel’z Baby – Local Runbook (Baseline)

## Baseline status
- Date: 2026-01-02
- State: ✅ No 404, homepage correct, assets resolve, products.json loads

## Build
From: `frontend/`
```bash
python3 _build/build.py
python3 -m http.server 8080
```

## Safe importer pipeline

To safely update product data without breaking the site, follow this pipeline:

1. Run the Trendyol V2 crawler to fetch new products data (example with maxPages=2):
```bash
node tools/trendyol-import.mjs urls.txt --maxPages=2
```

2. Validate the generated data file:
```bash
node tools/validate-products.mjs
```
This ensures the data is correctly structured and images paths are valid.

3. Swap the validated data into production:
```bash
node tools/swap-products.mjs
```
This script creates a timestamped backup of the current `products.json` before replacing it with the new data.

**Important:**
- The crawler writes only to `products.next.json` and never touches `products.json` directly.
- If validation fails, the swap will abort and `products.json` remains unchanged.
- Backups allow rollback if needed.

This pipeline keeps the site stable while updating product data safely.
