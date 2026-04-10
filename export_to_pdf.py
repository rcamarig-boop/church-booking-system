#!/usr/bin/env python3
"""Convert markdown files to PDF with proper formatting."""

import markdown2
import os
from pathlib import Path

# Try to use weasyprint for better PDF generation
try:
    from weasyprint import HTML, CSS
    HAS_WEASYPRINT = True
except ImportError:
    HAS_WEASYPRINT = False

def markdown_to_html(md_file):
    """Convert markdown file to HTML."""
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown2.markdown(md_content, extras=['tables', 'fenced-code-blocks', 'code-friendly'])
    
    # Wrap with HTML structure and CSS
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Church Booking System Documentation</title>
        <style>
            body {{
                font-family: 'Segoe UI', 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 960px;
                margin: 0 auto;
                padding: 20px;
                background: #f5f5f5;
            }}
            h1, h2, h3, h4, h5, h6 {{
                color: #1f2a44;
                margin-top: 24px;
                margin-bottom: 12px;
            }}
            h1 {{
                font-size: 28px;
                border-bottom: 3px solid #d6ad60;
                padding-bottom: 8px;
            }}
            h2 {{
                font-size: 22px;
                margin-top: 32px;
            }}
            code {{
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }}
            pre {{
                background: #2b2b2b;
                color: #f8f8f2;
                padding: 16px;
                border-radius: 8px;
                overflow-x: auto;
                line-height: 1.4;
            }}
            pre code {{
                background: none;
                color: inherit;
                padding: 0;
            }}
            table {{
                border-collapse: collapse;
                width: 100%;
                margin: 16px 0;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }}
            th {{
                background: #d6ad60;
                color: white;
            }}
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            .mermaid {{
                background: white;
                padding: 16px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin: 16px 0;
            }}
            blockquote {{
                border-left: 4px solid #d6ad60;
                margin-left: 0;
                padding-left: 16px;
                color: #666;
            }}
            a {{
                color: #0066cc;
                text-decoration: none;
            }}
            a:hover {{
                text-decoration: underline;
            }}
            page {{
                margin: 2cm;
            }}
            @page {{
                size: A4;
                margin: 2cm;
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    return full_html

def export_to_pdf(md_file, pdf_file):
    """Export markdown file to PDF."""
    html_content = markdown_to_html(md_file)
    
    if HAS_WEASYPRINT:
        try:
            print(f"Converting {md_file} to {pdf_file} using WeasyPrint...")
            HTML(string=html_content).write_pdf(pdf_file)
            print(f"✓ Successfully created: {pdf_file}")
            return True
        except Exception as e:
            print(f"✗ WeasyPrint conversion failed: {e}")
            return False
    else:
        print(f"✗ WeasyPrint not installed. Install with: pip install weasyprint")
        print(f"  Note: Mermaid diagrams will need to be added manually to PDFs created with alternative methods.")
        return False

def main():
    """Main export function."""
    print("=" * 60)
    print("Church Booking System - Markdown to PDF Export")
    print("=" * 60)
    print()
    
    base_path = Path("c:\\church_project")
    
    files_to_export = [
        ("SYSTEM_DOCUMENTATION.md", "SYSTEM_DOCUMENTATION.pdf"),
        ("PROJECT_DIAGRAMS.md", "PROJECT_DIAGRAMS.pdf"),
    ]
    
    print(f"Installing WeasyPrint for better PDF support...")
    os.system("pip install weasyprint -q")
    print()
    
    for md_file, pdf_file in files_to_export:
        md_path = base_path / md_file
        pdf_path = base_path / pdf_file
        
        if not md_path.exists():
            print(f"✗ File not found: {md_path}")
            continue
        
        export_to_pdf(str(md_path), str(pdf_path))
        print()
    
    print("=" * 60)
    print("Export complete! PDF files are ready in the project directory:")
    print("  - SYSTEM_DOCUMENTATION.pdf")
    print("  - PROJECT_DIAGRAMS.pdf")
    print("=" * 60)

if __name__ == "__main__":
    main()
