#!/usr/bin/env python3
"""Convert markdown files to HTML for PDF printing."""

import markdown2
from pathlib import Path
import re

def replace_mermaid_blocks(content):
    """Replace mermaid code blocks with div elements for rendering."""
    # Pattern to find mermaid code blocks
    pattern = r'```mermaid\n(.*?)\n```'
    
    def replacement(match):
        diagram_code = match.group(1)
        # Escape any quotes and newlines for safe insertion
        return f'<div class="mermaid">\n{diagram_code}\n</div>'
    
    return re.sub(pattern, replacement, content, flags=re.DOTALL)

def sanitize_filename(filename):
    """Sanitize filename for HTML file."""
    return re.sub(r'[^\w\s-]', '', filename).strip().replace(' ', '_')

def markdown_to_html(md_file):
    """Convert markdown file to HTML with professional styling."""
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Replace mermaid code blocks with proper div tags for rendering
    md_content = replace_mermaid_blocks(md_content)
    
    # Convert markdown to HTML (with support for code blocks and tables)
    html_content = markdown2.markdown(
        md_content, 
        extras=['tables', 'fenced-code-blocks', 'code-friendly', 'break-on-newline']
    )
    
    # Professional CSS styling
    css_style = """
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: A4;
            margin: 2cm 1.5cm;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #999;
            }
        }
        
        @media print {
            body { background: white; }
            a { color: #0066cc; }
            h1, h2, h3 { page-break-after: avoid; }
            pre, table { page-break-inside: avoid; }
        }
        
        body {
            font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 2cm 1.5cm;
            line-height: 1.7;
        }
        
        h1 {
            font-size: 32px;
            color: #1f2a44;
            margin: 40px 0 20px 0;
            border-bottom: 3px solid #d6ad60;
            padding-bottom: 15px;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 24px;
            color: #2a3d54;
            margin: 36px 0 16px 0;
            padding-top: 12px;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 18px;
            color: #3a4d64;
            margin: 24px 0 12px 0;
            page-break-after: avoid;
        }
        
        h4, h5, h6 {
            font-size: 14px;
            color: #4a5d74;
            margin: 16px 0 8px 0;
            page-break-after: avoid;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
        }
        
        ul, ol {
            margin: 16px 0 16px 32px;
        }
        
        li {
            margin: 6px 0;
        }
        
        code {
            background: #f0f0f0;
            color: #d63384;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 0.92em;
        }
        
        pre {
            background: #2b2b2b;
            color: #f8f8f2;
            padding: 16px;
            border-left: 4px solid #d6ad60;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.4;
        }
        
        pre code {
            background: none;
            color: inherit;
            padding: 0;
            border-radius: 0;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        th {
            background: #d6ad60;
            color: white;
            padding: 12px 14px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #c4995a;
        }
        
        td {
            padding: 11px 14px;
            border: 1px solid #ddd;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        tr:hover {
            background: #f5f0e8;
        }
        
        blockquote {
            border-left: 4px solid #d6ad60;
            margin: 16px 0;
            padding-left: 16px;
            color: #666;
            font-style: italic;
            background: #f9f9f9;
            padding: 12px 16px;
        }
        
        a {
            color: #0066cc;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .mermaid {
            background: white;
            border: 1px solid #d6ad60;
            border-radius: 6px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
            page-break-inside: avoid;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
        
        .note {
            background: #f0f8ff;
            border-left: 4px solid #0066cc;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
        }
        
        .toc {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        
        .toc ul {
            margin-left: 20px;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 32px 0;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .title {
            text-align: center;
            padding: 40px 0;
        }
        
        .title h1 {
            border: none;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 16px;
            margin-bottom: 8px;
        }
    </style>
    """
    
    # Build complete HTML document
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Church Booking System Documentation</title>
    {css_style}
</head>
<body>
    <div class="container">
        {html_content}
    </div>
    
    <!-- Mermaid diagram rendering library -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({{ startOnLoad: true, theme: 'default', securityLevel: 'loose' }});
        mermaid.contentLoaded();
    </script>
</body>
</html>
"""
    
    return full_html

def export_to_html(md_file):
    """Export markdown file to HTML."""
    md_path = Path(md_file)
    html_file = md_path.with_suffix('.html')
    
    print(f"Converting: {md_path.name}")
    html_content = markdown_to_html(md_file)
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return html_file

def main():
    """Main export function."""
    print("=" * 70)
    print("Church Booking System - Markdown to HTML/PDF Export")
    print("=" * 70)
    print()
    
    base_path = Path("c:\\church_project")
    
    files_to_export = [
        "SYSTEM_DOCUMENTATION.md",
        "PROJECT_DIAGRAMS.md",
    ]
    
    html_files = []
    
    for md_file in files_to_export:
        md_path = base_path / md_file
        
        if not md_path.exists():
            print(f"✗ File not found: {md_path}")
            continue
        
        html_file = export_to_html(str(md_path))
        html_files.append(html_file)
        print(f"✓ Created: {html_file.name}")
        print()
    
    print("=" * 70)
    print("HTML Export Complete!")
    print()
    print("To Convert to PDF:")
    print("  1. Open the HTML file in your web browser (Ctrl+O)")
    print("  2. Press Ctrl+P to open Print dialog")
    print("  3. Select 'Save as PDF' as the printer")
    print("  4. Click 'Save' to generate the PDF file")
    print()
    print("Generated HTML files:")
    for html_file in html_files:
        print(f"  - {html_file.name}")
    print("=" * 70)

if __name__ == "__main__":
    main()
