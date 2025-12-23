import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]  # /frontend
PARTIALS = ROOT / "_partials"

REF_CANDIDATES = [
    ROOT / "blog_sayfası" / "code.html",
    ROOT / "bebek_ürünleri_ana_sayfası_9" / "code.html",
]

def read_text(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")

def write_text(p: pathlib.Path, s: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")

def extract_tag(html: str, tag: str) -> str | None:
    m = re.search(rf"(<{tag}\b[^>]*>.*?</{tag}>)", html, flags=re.IGNORECASE | re.DOTALL)
    return m.group(1) if m else None

def extract_head_inner(html: str) -> str:
    m = re.search(r"<head\b[^>]*>(.*?)</head>", html, flags=re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else ""

def extract_main(html: str) -> str | None:
    m = re.search(r"(<main\b[^>]*>.*?</main>)", html, flags=re.IGNORECASE | re.DOTALL)
    return m.group(1) if m else None

def find_ref() -> pathlib.Path:
    for p in REF_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError("No reference code.html found to extract header/footer.")

def normalize(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")

def main():
    ref_path = find_ref()
    ref_html = normalize(read_text(ref_path))

    header = extract_tag(ref_html, "header")
    footer = extract_tag(ref_html, "footer")
    head_inner = extract_head_inner(ref_html)

    if not header:
        raise RuntimeError(f"Could not extract <header> from {ref_path}")
    if not footer:
        raise RuntimeError(f"Could not extract <footer> from {ref_path}")

    write_text(PARTIALS / "header.html", header.strip() + "\n")
    write_text(PARTIALS / "footer.html", footer.strip() + "\n")

    base_head = read_text(PARTIALS / "head.html") if (PARTIALS / "head.html").exists() else ""
    combined_head = (base_head + "\n" + head_inner).strip() + "\n"
    write_text(PARTIALS / "head.generated.html", combined_head)

    pages = []
    for child in ROOT.iterdir():
        if not child.is_dir():
            continue
        if child.name.startswith("_"):
            continue
        code = child / "code.html"
        if code.exists():
            pages.append(child)

    built = 0
    for page in pages:
        src = page / "code.html"
        html = normalize(read_text(src))

        main_block = extract_main(html)
        if not main_block:
            m = re.search(r"<body\b[^>]*>(.*?)</body>", html, flags=re.IGNORECASE | re.DOTALL)
            main_block = (m.group(1).strip() if m else "")

        out = f"""<!doctype html>
<html lang="tr">
<head>
{combined_head}
</head>
<body>
{header}

{main_block}

{footer}
</body>
</html>
"""
        write_text(page / "dist" / "index.html", out)
        built += 1

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

    print(f"Reference used: {ref_path}")
    print(f"Built pages: {built}")
    print("Done.")

if __name__ == "__main__":
    main()
