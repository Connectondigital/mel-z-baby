# Mel'z Baby&Kids - Static HTML Template System

## Overview

This project uses a simple build script to assemble static HTML pages from reusable partials (header, footer) and page-specific content.

## Phase 3: Template Merging Analysis

### Why Templates Were NOT Merged

After careful analysis, the following page groups were determined to be **design variants** rather than content templates:

#### Privacy/Terms Pages (3 variants in `gizlilik/`)
| Page | Font | Sidebar Style | Section Layout | Notes |
|------|------|---------------|----------------|-------|
| koşullar_sayfası_1 | Manrope | Bordered, shadow-soft, nav links with chevrons | Card-based sections | Orange scrollbar |
| koşullar_sayfası_2 | Manrope | Simple, p-6, rounded-2xl | Same sections, simpler styling | Minimal comments |
| koşullar_sayfası_3 | **Montserrat** | Card with border-gray-100, numbered "01." sections | Gradient effects, prose styling | Different color tokens |

**Verdict:** Different fonts + different styling = visual differences if merged. **SKIP MERGE.**

#### Category Pages (2 variants in `kategoriler/`)
Both pages are nearly identical except:
- Variant 2 has an additional "bulk delete warning banner" (state variation)
- Same Tailwind config, fonts, and colors

**Verdict:** These represent UI states, not content templates. The warning banner is part of the page content. **SKIP MERGE.**

### Safe Merging Criteria
For future template merging, ALL of the following must be true:
1. ✅ Same font family
2. ✅ Same Tailwind color config
3. ✅ Same component structure/styling
4. ✅ Only text/image content differs
5. ✅ Layout structure identical

None of the analyzed page groups met all criteria.

#### Blog Pages Analysis
| Page | Type | Primary Color | Header Style |
|------|------|---------------|--------------|
| blog_sayfası | List | `#e27036` | Text logo, different nav items |
| blog_yazısı_detay_sayfası_2 | Detail | `#e27036` | SVG icon, similar styling |

**Verdict:** While similar, the header SVG vs icon differs. Existing shared header from build script handles this. **NO ADDITIONAL MERGE NEEDED.**

#### Order Pages Analysis
| Page | Purpose | Primary Color | Interface |
|------|---------|---------------|-----------|
| sipariş_detayları_sayfası_2 | Admin panel | `#e49444` (yellow/gold) | Admin dashboard |
| sipariş_onayı_sayfası_5 | Customer success | `#368ce2` (blue) | Customer-facing |

**Verdict:** Different purposes (admin vs customer), different color schemes. **SKIP MERGE.**

### Current Template Architecture

```
Source Files (preserved)
├── [page]/code.html          # Original Stitch exports - NEVER modified
│
Shared Partials (Phase 1)
├── _partials/head.html       # Unified Tailwind config
├── _partials/header.html     # Unified site header
├── _partials/footer.html     # Unified site footer
│
Build Output (Phase 2)
└── [page]/dist/index.html    # Assembled with shared partials
```

### Summary
- **Phase 1 ✅**: Shared header/footer partials created
- **Phase 2 ✅**: Build script assembles 15 pages
- **Phase 3 ⚠️**: Template merging SKIPPED (design variants, not content templates)

## Directory Structure

```
/app/frontend/
├── _partials/              # Shared HTML components
│   ├── head.html           # Common <head> content (meta, fonts, Tailwind config)
│   ├── header.html         # Shared site header/navigation
│   └── footer.html         # Shared site footer
├── _build/
│   └── build.py            # Build script to assemble pages
├── [page_folder]/          # Each page folder (e.g., bebek_ürünleri_ana_sayfası_9/)
│   ├── code.html           # Original source HTML (from Stitch export)
│   ├── screen.png          # Design screenshot
│   └── dist/
│       └── index.html      # Assembled output file
└── README.md
```

## Pages

| Folder | Description |
|--------|-------------|
| `bebek_ürünleri_ana_sayfası_9` | Homepage |
| `ürün_detay_sayfası_3` | Product Detail |
| `sepet_ve_ödeme_sayfası_4` | Cart & Checkout |
| `sipariş_detayları_sayfası_2` | Order Details |
| `sipariş_onayı_sayfası_5` | Order Confirmation |
| `hesabım_sayfası_6` | My Account |
| `blog_sayfası` | Blog List |
| `blog_yazısı_detay_sayfası_2` | Blog Post Detail |
| `hakkımızda_sayfası_3` | About Us |
| `i̇letişim_sayfası_3` | Contact |
| `kategoriler/etiketler_yön._1` | Category Page (variant 1) |
| `kategoriler/etiketler_yön._2` | Category Page (variant 2) |
| `gizlilik/koşullar_sayfası_1` | Privacy/Terms (variant 1) |
| `gizlilik/koşullar_sayfası_2` | Privacy/Terms (variant 2) |
| `gizlilik/koşullar_sayfası_3` | Privacy/Terms (variant 3) |

## How to Build

Run the build script from the frontend directory:

```bash
cd /app/frontend
python3 _build/build.py
```

This will:
1. Read each `code.html` file in page folders
2. Extract the page-specific `<main>` content
3. Combine with shared header/footer partials
4. Output assembled files to `dist/index.html` in each folder

## How to Serve Locally

```bash
cd /app/frontend
python3 -m http.server 8080
```

Then open in browser:
- Homepage: `http://localhost:8080/bebek_ürünleri_ana_sayfası_9/dist/`
- Product Detail: `http://localhost:8080/ürün_detay_sayfası_3/dist/`
- etc.

## Modifying the Template

### To update the header or footer:

1. Edit the files in `_partials/`:
   - `_partials/header.html` - Navigation, logo, search bar
   - `_partials/footer.html` - Footer links, social icons, copyright

2. Re-run the build script:
   ```bash
   python3 _build/build.py
   ```

### To update page content:

1. Edit the `code.html` in the specific page folder
2. Re-run the build script

## Design System

The shared partials use these design tokens (defined in `_partials/head.html`):

### Colors
- Primary: `#d4a373` (warm beige/gold)
- Primary Dark: `#b08558`
- Background Light: `#fdfbf7`
- Surface Light: `#ffffff`

### Typography
- Font: Plus Jakarta Sans

### CSS Variables
```css
--melz-beige-light: #fdfbf7;
--melz-beige: #f5f0e6;
--melz-beige-dark: #e8dfd2;
--melz-text: #4a4a4a;
--melz-primary: #d4a373;
```

## Notes

- Original `code.html` files are preserved as source of truth
- Page-specific styles are carried over to the dist output
- Page titles are extracted from original HTML
- Body classes are preserved from original HTML
