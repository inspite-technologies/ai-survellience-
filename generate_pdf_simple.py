from fpdf import FPDF
import os, re

SERVER_IP = "192.168.29.118"
OUTPUT = "/Users/renoroy/Downloads/FaceScan_API_QuickGuide.pdf"
MD_FILE = "/Users/renoroy/Downloads/Facescan copy 5/simple_api_docs.md"

md = open(MD_FILE).read().replace("<SERVER_IP>", SERVER_IP)

# Basic cleanup for ASCII compatibility
md = re.sub(r'[^\x00-\x7F]+', ' ', md)

class ApiPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(233, 69, 96)
        self.cell(0, 10, "FaceScan API Quick Guide", 0, 1, "R")
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", 0, 0, "C")

pdf = ApiPDF("P", "mm", "A4")
pdf.alias_nb_pages()
pdf.set_auto_page_break(True, margin=15)
pdf.add_page()

# Content
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(44, 62, 80)
pdf.multi_cell(0, 5, md, markdown=True)

pdf.output(OUTPUT)
print(f"PDF saved to: {OUTPUT}")
print(f"File size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")
