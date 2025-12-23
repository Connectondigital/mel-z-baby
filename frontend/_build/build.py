#!/usr/bin/env python3
"""
Mel'z Baby&Kids - Static HTML Build Script

This script assembles final HTML files by:
1. Extracting page-specific content from each code.html
2. Wrapping it with shared header and footer partials
3. Outputting assembled files to dist/ folder in each page directory
"""

import os
import re
from pathlib import Path

# Configuration
FRONTEND_DIR = Path('/app/frontend')
PARTIALS_DIR = FRONTEND_DIR / '_partials'

# Load partials
def load_partial(name: str) -> str:
    """Load a partial HTML file."""
    partial_path = PARTIALS_DIR / f'{name}.html'
    if partial_path.exists():
        return partial_path.read_text(encoding='utf-8')
    return ''

def extract_title(html: str) -> str:
    """Extract the <title> content from HTML."""
    match = re.search(r'<title>(.*?)</title>', html, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return "Mel'z Baby&Kids"

def extract_body_class(html: str) -> str:
    """Extract body class from HTML."""
    match = re.search(r'<body[^>]*class="([^"]*?)"', html, re.IGNORECASE)
    if match:
        return match.group(1)
    return 'bg-background-light dark:bg-background-dark font-display text-[#4a4a4a] dark:text-white transition-colors duration-200'

def extract_main_content(html: str) -> str:
    """Extract content between <main> tags (page-specific content)."""
    # Try to extract <main> content
    match = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0)  # Include the <main> tags
    
    # Fallback: extract content between </header> and <footer>
    match = re.search(r'</header>(.*?)<footer', html, re.DOTALL | re.IGNORECASE)
    if match:
        content = match.group(1).strip()
        return f'<main class="flex-1">\n{content}\n</main>'
    
    return '<main class="flex-1"><p>Content extraction failed</p></main>'

def extract_page_specific_styles(html: str) -> str:
    """Extract any page-specific <style> tags that aren't in head partial."""
    styles = []
    # Find all style tags in the document
    for match in re.finditer(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE):
        style_content = match.group(1).strip()
        # Skip if it's the tailwind config style (already in head partial)
        if 'melz-beige' not in style_content and 'type="text/tailwindcss"' not in match.group(0):
            # Only include unique page-specific styles
            if style_content and 'material-symbols' in style_content.lower() or 'scrollbar' in style_content.lower():
                styles.append(f'<style>\n{style_content}\n</style>')
    return '\n'.join(styles)

def build_page(source_html: str, page_title: str) -> str:
    """Build a complete HTML page with shared partials."""
    head_partial = load_partial('head')
    header_partial = load_partial('header')
    footer_partial = load_partial('footer')
    
    main_content = extract_main_content(source_html)
    body_class = extract_body_class(source_html)
    page_styles = extract_page_specific_styles(source_html)
    
    # Build the complete HTML
    assembled_html = f'''<!DOCTYPE html>
<html class="light" lang="tr">
<head>
{head_partial}
<title>{page_title}</title>
{page_styles}
</head>
<body class="{body_class}">
<div class="relative flex min-h-screen w-full flex-col overflow-x-hidden">
{header_partial}
{main_content}
{footer_partial}
</div>
</body>
</html>
'''
    return assembled_html

def process_directory(dir_path: Path) -> bool:
    """Process a single page directory."""
    code_html = dir_path / 'code.html'
    if not code_html.exists():
        return False
    
    print(f"Processing: {dir_path.name}")
    
    # Read source HTML
    source_html = code_html.read_text(encoding='utf-8')
    
    # Extract title
    page_title = extract_title(source_html)
    
    # Build assembled page
    assembled_html = build_page(source_html, page_title)
    
    # Create dist directory
    dist_dir = dir_path / 'dist'
    dist_dir.mkdir(exist_ok=True)
    
    # Write assembled HTML
    output_file = dist_dir / 'index.html'
    output_file.write_text(assembled_html, encoding='utf-8')
    
    print(f"  -> Created: {output_file}")
    return True

def main():
    """Main build function."""
    print("="*60)
    print("Mel'z Baby&Kids - Static HTML Build")
    print("="*60)
    print()
    
    # Check partials exist
    required_partials = ['head.html', 'header.html', 'footer.html']
    for partial in required_partials:
        partial_path = PARTIALS_DIR / partial
        if not partial_path.exists():
            print(f"ERROR: Missing partial: {partial_path}")
            return 1
    
    print(f"Partials directory: {PARTIALS_DIR}")
    print(f"Partials found: {', '.join(required_partials)}")
    print()
    
    # Find all page directories
    pages_processed = 0
    for item in sorted(FRONTEND_DIR.iterdir()):
        # Skip hidden directories and special directories
        if item.name.startswith('_') or item.name.startswith('.'):
            continue
        if item.name in ('node_modules', 'dist'):
            continue
        if not item.is_dir():
            continue
        
        # Check for nested directories (like gizlilik/koşullar_sayfası_1)
        if (item / 'code.html').exists():
            if process_directory(item):
                pages_processed += 1
        else:
            # Check subdirectories
            for subitem in item.iterdir():
                if subitem.is_dir() and (subitem / 'code.html').exists():
                    if process_directory(subitem):
                        pages_processed += 1
    
    print()
    print("="*60)
    print(f"Build complete! Processed {pages_processed} pages.")
    print("="*60)
    return 0

if __name__ == '__main__':
    exit(main())
