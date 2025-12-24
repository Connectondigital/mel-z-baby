import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]  # /frontend
PARTIALS = ROOT / "_partials"

# Referans sayfa: head/header/footer buradan alınır (custom yoksa)
REF_PAGE = ROOT / "hakkımızda_sayfası_3" / "code.html"


def read_text(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")


def write_text(p: pathlib.Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def normalize(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")


def extract_block(html: str, tag: str) -> str:
    """
    Returns the FULL <tag ...>...</tag> block (first match).
    If not found, returns "".
    """
    m = re.search(
        rf"(<{tag}\b[^>]*>.*?</{tag}>)",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return m.group(1).strip() if m else ""


def extract_head_inner(html: str) -> str:
    """
    Returns the inner content of <head>...</head> (without head tag).
    """
    m = re.search(
        r"<head\b[^>]*>(.*?)</head>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return (m.group(1).strip() if m else "")


def extract_main_or_body(html: str) -> str:
    """
    Prefer <main>...</main>.
    If no <main>, return body inner HTML.
    If no body, return html as fallback.
    """
    main_block = extract_block(html, "main")
    if main_block:
        return main_block

    m = re.search(
        r"<body\b[^>]*>(.*?)</body>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return (m.group(1).strip() if m else html.strip())


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


def build_pages():
    if not REF_PAGE.exists():
        raise RuntimeError(f"Referans sayfa yok: {REF_PAGE}")

    ref_html = normalize(read_text(REF_PAGE))

    # HEAD: base head + ref head inner
    base_head = read_text(PARTIALS / "head.html") if (PARTIALS / "head.html").exists() else ""
    ref_head_inner = extract_head_inner(ref_html)
    combined_head = (base_head + "\n" + ref_head_inner).strip() + "\n"

    # header/footer
    header, footer = load_header_footer(ref_html)

    pages = []
    built = 0

    for page in ROOT.iterdir():
        if not page.is_dir():
            continue
        if page.name.startswith("_"):
            continue

        code = page / "code.html"
        if not code.exists():
            continue

        pages.append(page)

        html = normalize(read_text(code))
        main_content = extract_main_or_body(html)

        out = f"""<!doctype html>
<html lang="tr">
<head>
{combined_head}
</head>
<body>
{header}

{main_content}

{footer}
</body>
</html>
"""
        write_text(page / "dist" / "index.html", out)
        built += 1

    # Root index.html (link list)
    links = "\n".join(
        [f'<li><a href="./{p.name}/dist/index.html">{p.name}</a></li>' for p in sorted(pages, key=lambda x: x.name)]
    )

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
    print("✔ Build tamamlandı (CUSTOM header/footer korunuyor)")


if __name__ == "__main__":
    build_pages()
