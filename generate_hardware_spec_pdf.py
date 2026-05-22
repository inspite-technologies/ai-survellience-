from fpdf import FPDF
import os

class HardwarePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(44, 62, 80)
        self.cell(0, 10, "Facescan: Hardware Specification Report", 0, 1, "C")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")

    def chapter_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_fill_color(230, 230, 230)
        self.cell(0, 10, title, 0, 1, "L", 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 6, body)
        self.ln()

OUTPUT_PATH = "/Users/renoroy/Downloads/Facescan_Hardware_Specs.pdf"

pdf = HardwarePDF()
pdf.add_page()

# --- Section 1: Introduction ---
pdf.chapter_title("1. What is Needed to Run the Models?")
pdf.chapter_body(
    "To run the AI models (YOLOv8, SCRFD, and ArcFace) with real-time performance, three components are critical:\n"
    "- NVIDIA GPU (CUDA): Essential for parallel processing of face images. Without this, the system will lag significantly.\n"
    "- High RAM (32GB): Needed to store the large face database (FAISS) and the AI models in memory simultaneously.\n"
    "- CPU Threads: Needed to decode video streams from multiple cameras without bottlenecking the GPU."
)

# --- Section 2: Budget Entry ---
pdf.chapter_title("2. Budget Specification (The Minimum)")
pdf.chapter_body(
    "- GPU: NVIDIA RTX 3060 (12GB VRAM)\n"
    "- CPU: Intel Core i5-12400 (6 Cores)\n"
    "- RAM: 16GB DDR4 RAM\n"
    "- Storage: 512GB NVMe SSD\n"
    "- Best for: 1-3 camera streams, testing environments, and budget deployments in India."
)

# --- Section 3: Recommended Sweet Spot ---
pdf.chapter_title("3. Balanced Specification (The Sweet Spot)")
pdf.chapter_body(
    "- GPU: NVIDIA RTX 4060 Ti (16GB VRAM) — Highly Recommended\n"
    "- CPU: Intel Core i5-13600K or i5-14600K\n"
    "- RAM: 32GB DDR5 RAM (5600MHz)\n"
    "- Storage: 1TB Samsung 980 Pro NVMe Gen4\n"
    "- Best for: 10-15 camera streams, real-time office attendance, and fast face recognition (under 100ms)."
)

# --- Section 4: Enterprise Grade ---
pdf.chapter_title("4. Enterprise Specification (The Powerhouse)")
pdf.chapter_body(
    "- GPU: NVIDIA RTX 4070 or 4090 (24GB VRAM)\n"
    "- CPU: Intel Core i7-14700K or i9-14900K\n"
    "- RAM: 64GB DDR5 RAM\n"
    "- Storage: 2TB NVMe Gen4 + 4TB HDD for Video Logs\n"
    "- Power: 2kVA Online UPS (Required for stability in India)\n"
    "- Best for: Large factories, hospitals, or multi-site deployments with 30+ cameras."
)

# --- Section 5: Laptop Alternative ---
pdf.chapter_title("5. Laptop Specification (Mobile Deployment)")
pdf.chapter_body(
    "- Model: Lenovo Legion Pro 5i or Acer Predator Helios Neo 16\n"
    "- GPU: NVIDIA RTX 4060 (Full Power TGP 140W)\n"
    "- CPU: Intel Core i7-13700HX\n"
    "- RAM: 32GB (Manufacturer standard is 16GB, requires upgrade)\n"
    "- Critical Advice: Do not buy 'Thin and Light' laptops for this project; they will overheat."
)

pdf.output(OUTPUT_PATH)
print(f"SUCCESS: Hardware Specification PDF generated at {OUTPUT_PATH}")
