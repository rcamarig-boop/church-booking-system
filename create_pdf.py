#!/usr/bin/env python
"""Convert HTML to PDF using Weasyprint"""

try:
    from weasyprint import HTML
    import os
    
    print("Converting HTML to PDF with WeasyPrint...")
    
    html_file = 'SE1_PROPOSAL_IMPLEMENTATION_REPORT.html'
    pdf_file = 'SE1_PROPOSAL_IMPLEMENTATION_REPORT.pdf'
    
    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found!")
        exit(1)
    
    # Convert HTML to PDF
    HTML(filename=html_file).write_pdf(pdf_file)
    
    # Check if PDF was created
    if os.path.exists(pdf_file):
        file_size = os.path.getsize(pdf_file)
        print(f"✅ PDF created successfully!")
        print(f"   File: {pdf_file}")
        print(f"   Size: {file_size:,} bytes")
    else:
        print("❌ PDF creation failed - file not found")
        
except ImportError as e:
    print(f"Error: {e}")
    print("WeasyPrint is required for PDF conversion")
    exit(1)
except Exception as e:
    print(f"Error during conversion: {e}")
    exit(1)
