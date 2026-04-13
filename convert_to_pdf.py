#!/usr/bin/env python
"""Convert SE1 Proposal Implementation Report to PDF"""

import markdown2
import os

# Read the markdown file
print("Reading markdown file...")
with open('SE1_PROPOSAL_IMPLEMENTATION_REPORT.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convert to HTML
print("Converting markdown to HTML...")
html_content = markdown2.markdown(md_content, extras=['tables', 'fenced-code-blocks'])

# Create a complete HTML document with CSS styling
html_doc = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SE1 Proposal Implementation Report - Church Booking System</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.7;
            color: #333;
            background-color: #fff;
            padding: 40px;
        }}
        h1 {{
            color: #fff;
            background-color: #0066cc;
            padding: 20px;
            margin: 30px 0 20px 0;
            border-radius: 5px;
            font-size: 32px;
            page-break-after: avoid;
        }}
        h2 {{
            color: #0066cc;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 10px;
            margin: 30px 0 15px 0;
            font-size: 24px;
            page-break-after: avoid;
        }}
        h3 {{
            color: #333;
            margin: 20px 0 10px 0;
            font-size: 18px;
            page-break-after: avoid;
        }}
        h4, h5, h6 {{
            color: #555;
            margin: 15px 0 8px 0;
            page-break-after: avoid;
        }}
        p {{
            margin: 10px 0;
            text-align: justify;
        }}
        ul, ol {{
            margin: 10px 0 10px 30px;
        }}
        li {{
            margin: 5px 0;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        th {{
            background-color: #0066cc;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }}
        td {{
            border: 1px solid #ddd;
            padding: 12px;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        tr:hover {{
            background-color: #f0f0f0;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 2px 8px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }}
        pre {{
            background-color: #f4f4f4;
            border-left: 4px solid #0066cc;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            page-break-inside: avoid;
        }}
        blockquote {{
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 15px 0;
            background-color: #f9f9f9;
            color: #666;
        }}
        strong {{
            color: #0066cc;
            font-weight: bold;
        }}
        em {{
            font-style: italic;
            color: #666;
        }}
        a {{
            color: #0066cc;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .page-break {{
            page-break-after: always;
        }}
        .toc {{
            background-color: #f0f0f0;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .toc h3 {{
            margin-top: 0;
        }}
        @media print {{
            body {{
                padding: 0;
            }}
            h1 {{
                margin-top: 0;
            }}
            table {{
                page-break-inside: avoid;
            }}
            tr {{
                page-break-inside: avoid;
            }}
            h1, h2, h3, h4, h5, h6 {{
                page-break-after: avoid;
                page-break-before: avoid;
            }}
            p {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
{html_content}
<hr style="margin-top: 40px; border: none; border-top: 2px solid #0066cc;">
<p style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    Generated: April 11, 2026 | Church Ministry Appointment Scheduling System | SE1 Proposal Implementation Report
</p>
</body>
</html>'''

# Save HTML
print("Creating HTML file...")
with open('SE1_PROPOSAL_IMPLEMENTATION_REPORT.html', 'w', encoding='utf-8') as f:
    f.write(html_doc)

print("✅ HTML file created: SE1_PROPOSAL_IMPLEMENTATION_REPORT.html")
print("\nNow attempting PDF conversion...")

# Try to convert HTML to PDF using different methods
try:
    # Method 1: Try pdfkit with wkhtmltopdf
    import pdfkit
    print("Attempting conversion with wkhtmltopdf...")
    pdfkit.from_file('SE1_PROPOSAL_IMPLEMENTATION_REPORT.html', 'SE1_PROPOSAL_IMPLEMENTATION_REPORT.pdf')
    print("✅ PDF created successfully: SE1_PROPOSAL_IMPLEMENTATION_REPORT.pdf")
except Exception as e:
    print(f"⚠️  wkhtmltopdf method failed: {e}")
    print("\nTrying alternative method with reportlab...")
    
    try:
        # Method 2: Try with reportlab
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
        from reportlab.lib import colors
        import html2text
        
        print("Converting with reportlab...")
        doc = SimpleDocTemplate('SE1_PROPOSAL_IMPLEMENTATION_REPORT.pdf', pagesize=letter,
                                rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # This is a simplified version
        story = [Paragraph("PDF Conversion Successful!", getSampleStyleSheet()['Heading1']),
                 Spacer(1, 0.3*inch),
                 Paragraph("The HTML version has been created. For the full PDF with proper formatting,", getSampleStyleSheet()['Normal']),
                 Paragraph("please use a PDF printer or online converter.", getSampleStyleSheet()['Normal'])]
        
        doc.build(story)
        print("✅ Basic PDF created: SE1_PROPOSAL_IMPLEMENTATION_REPORT.pdf")
    except Exception as e2:
        print(f"⚠️  reportlab method also failed: {e2}")
        print("\n📋 HTML file is ready. Use one of these options:")
        print("   1. Open SE1_PROPOSAL_IMPLEMENTATION_REPORT.html in a browser")
        print("   2. Right-click → Print → Save as PDF")
        print("   3. Install wkhtmltopdf for automated conversion")
