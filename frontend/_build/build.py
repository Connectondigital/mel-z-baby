#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # /frontend
PARTIALS = ROOT / "_partials"

# Referans sayfa (header/footer custom yoksa buradan çeker)
REF_PAGE = ROOT / "hakkimizda" / "code.html"


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")


def write_text(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def normalize(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")


def extract_block(html: str, tag: str) -> str:
    """Returns FULL <tag ...>...</tag> block (first match)."""
    m = re.search(
        rf"(<{tag}\b[^>]*>.*?</{tag}>)",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return m.group(1).strip() if m else ""


def strip_blocks(html: str, tags: list[str]) -> str:
    """Remove header/footer if they accidentally exist in page content."""
    out = html
    for t in tags:
        out = re.sub(
            rf"<{t}\b[^>]*>.*?</{t}>",
            "",
            out,
            flags=re.IGNORECASE | re.DOTALL,
        )
    return out.strip()


def extract_main_or_body_inner(html: str) -> str:
    """Prefer <main>...</main>. Else return body inner. Else return whole html."""
    main_block = extract_block(html, "main")
    if main_block:
        return main_block

    m = re.search(
        r"<body\b[^>]*>(.*?)</body>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return (m.group(1).strip() if m else html.strip())


def load_head() -> str:
    """
    Priority:
      1) _partials/head.generated.html
      2) _partials/head.html
      3) (fallback) empty
    """
    gen = PARTIALS / "head.generated.html"
    plain = PARTIALS / "head.html"

    if gen.exists():
        return normalize(read_text(gen)).strip() + "\n"
    if plain.exists():
        return normalize(read_text(plain)).strip() + "\n"
    return ""


def load_header_footer(ref_html: str) -> tuple[str, str]:
    """
    Use custom partials if exist, otherwise extract from reference page.
    """
    header_custom = PARTIALS / "header.custom.html"
    footer_custom = PARTIALS / "footer.custom.html"

    header = read_text(header_custom).strip() if header_custom.exists() else extract_block(ref_html, "header")
    footer = read_text(footer_custom).strip() if footer_custom.exists() else extract_block(ref_html, "footer")

    if not header:
        raise RuntimeError("Header bulunamadı. header.custom.html ekle veya referans sayfada <header> olmalı.")
    if not footer:
        raise RuntimeError("Footer bulunamadı. footer.custom.html ekle veya referans sayfada <footer> olmalı.")

    return header + "\n", footer + "\n"


def iter_code_pages():
    """
    Find every */code.html under ROOT, including nested dirs (kategori/liste/code.html)
    Excludes _ folders and dist folders.
    """
    for code in ROOT.rglob("code.html"):
        # skip _build/_partials/_backup etc
        if any(part.startswith("_") for part in code.parts):
            continue
        # skip anything inside dist
        if "dist" in code.parts:
            continue
        yield code


def get_api_script_path(page_dir: Path) -> str:
    """Calculate relative path to /assets/api.js from page dist folder."""
    # Count depth from ROOT to page_dir
    rel = page_dir.relative_to(ROOT)
    depth = len(rel.parts)
    # dist is one level deeper
    return "../" * (depth + 1) + "assets/api.js"


def get_api_v2_script_path(page_dir: Path) -> str:
    """Calculate relative path to /assets/api.v2.js from page dist folder."""
    rel = page_dir.relative_to(ROOT)
    depth = len(rel.parts)
    return "../" * (depth + 1) + "assets/api.v2.js"


def build_pages():
    if not REF_PAGE.exists():
        raise RuntimeError(f"Referans sayfa yok: {REF_PAGE}")

    ref_html = normalize(read_text(REF_PAGE))

    head = load_head()
    header, footer = load_header_footer(ref_html)

    pages = []
    built = 0

    for code in iter_code_pages():
        page_dir = code.parent
        rel_dir = page_dir.relative_to(ROOT).as_posix()
        pages.append(rel_dir)

        html = normalize(read_text(code))

        main_content = extract_main_or_body_inner(html)
        # Eğer code.html içinde header/footer kalmışsa temizle (çift header çözümü)
        main_content = strip_blocks(main_content, ["header", "footer"])

        # Calculate relative path to api.js and api.v2.js

        out = f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
{head}</head>
<body>
{header}

{main_content}

{footer}
</body>
</html>
"""
        write_text(page_dir / "dist" / "index.html", out)
        built += 1

    # Root index.html (link list)
    pages_sorted = sorted(set(pages))
    links = "\n".join([f'<li><a href="./{p}/dist/index.html">{p}</a></li>' for p in pages_sorted])

    index = f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Melz Baby – Pages</title>
</head>
<body>
<h1>Melz Baby – Pages</h1>
<ul>
{links}
</ul>
</body>
</html>
"""
    write_text(ROOT / "index.html", index)

    print(f"Reference used: {REF_PAGE}")
    print(f"Built pages: {built}")
    print("✔ Build tamamlandı (head.generated/head.html + CUSTOM header/footer)")


if __name__ == "__main__":
    build_pages()