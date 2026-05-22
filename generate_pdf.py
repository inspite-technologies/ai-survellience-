from fpdf import FPDF
import os, re

SERVER_IP = "192.168.29.118"
OUTPUT = "/Users/renoroy/Downloads/FaceScan_API_Documentation.pdf"
MD_FILE = "/Users/renoroy/.gemini/antigravity/brain/e1d05540-389c-473e-be89-34068df92e8d/facescan_api_documentation.md"

md = open(MD_FILE).read().replace("<SERVER_IP>", SERVER_IP)

# Replace Unicode chars that cause issues
md = md.replace("\u2014", "--").replace("\u2013", "-").replace("\u2018","'").replace("\u2019","'")
md = md.replace("\u201c",'"').replace("\u201d",'"').replace("\u2026","...")
md = md.replace("📘","").replace("📋","").replace("📡","").replace("📦","").replace("📁","")
md = md.replace("🌐","").replace("🛣️","").replace("❌","[X]").replace("✅","[OK]")
md = md.replace("🔒"," [AUTH]").replace("📷","").replace("🔗","")
md = re.sub(r'[^\x00-\x7F]+',' ', md)  # strip all remaining non-ASCII

class ApiPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica","I",8)
            self.set_text_color(150,150,150)
            self.cell(0,5,"FaceScan Backend API Reference | v1.0",align="C")
            self.ln(3)
    def footer(self):
        if self.page_no() > 1:
            self.set_y(-12)
            self.set_font("Helvetica","I",8)
            self.set_text_color(150,150,150)
            self.cell(0,10,f"Page {self.page_no()}/{{nb}}",align="C")

pdf = ApiPDF("P","mm","A4")
pdf.alias_nb_pages()
pdf.set_auto_page_break(True, margin=15)

# ---- COVER ----
pdf.add_page()
pdf.set_fill_color(26,26,46)
pdf.rect(0,0,210,297,"F")

pdf.set_y(55)
pdf.set_font("Helvetica","B",42)
pdf.set_text_color(233,69,96)
pdf.cell(0,18,"FaceScan",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.set_font("Helvetica","",22)
pdf.set_text_color(160,180,200)
pdf.cell(0,12,"Backend API Reference",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.ln(5)
pdf.set_font("Helvetica","",13)
pdf.set_text_color(127,154,176)
pdf.cell(0,8,"For Flutter Developer Integration",align="C",new_x="LMARGIN",new_y="NEXT")

pdf.ln(15)
pdf.set_fill_color(40,40,70)
pdf.set_draw_color(233,69,96)
x0=35
pdf.rect(x0,pdf.get_y(),140,35,"DF")
pdf.set_x(x0+5)
pdf.set_font("Helvetica","B",11)
pdf.set_text_color(160,180,200)
pdf.cell(130,9,"Base URL (via NGINX):",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.set_x(x0+5)
pdf.set_font("Courier","B",16)
pdf.set_text_color(233,69,96)
pdf.cell(130,10,f"http://{SERVER_IP}/api",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.set_x(x0+5)
pdf.set_font("Helvetica","",9)
pdf.set_text_color(127,154,176)
pdf.cell(130,9,"Auth Header:  token: <jwt>  (NOT Bearer)",align="C",new_x="LMARGIN",new_y="NEXT")

pdf.ln(20)
pdf.set_font("Helvetica","",10)
pdf.set_text_color(90,122,138)
pdf.cell(0,6,"80+ Endpoints  |  25 Route Groups  |  April 2026  |  v1.0",align="C",new_x="LMARGIN",new_y="NEXT")

# ---- SHARING GUIDE ----
pdf.add_page()
pdf.set_text_color(44,62,80)
pdf.set_font("Helvetica","B",18)
pdf.set_text_color(233,69,96)
pdf.cell(0,12,"How to Share with Flutter Developer",new_x="LMARGIN",new_y="NEXT")
pdf.set_draw_color(233,69,96)
pdf.line(10,pdf.get_y(),200,pdf.get_y())
pdf.ln(5)

share = f"""**1. Start the Backend**

cd /path/to/Facescan
docker-compose up --build -d
docker-compose ps

**2. Server URL (Same WiFi)**
Base URL: http://{SERVER_IP}/api
Both devices must be on same WiFi network.

**3. For Remote Developer -- Use ngrok**
brew install ngrok
ngrok http 80
Share the generated https://xxx.ngrok.io/api URL.

**4. Flutter pubspec.yaml Dependencies**
http: ^1.2.0
dio: ^5.4.0
shared_preferences: ^2.2.0
flutter_secure_storage: ^9.0.0

**5. Flutter API Service Example**

const String BASE_URL = 'http://{SERVER_IP}/api';

// Login
final res = await http.post(
  Uri.parse('$BASE_URL/auth/login'),
  headers: {{'Content-Type': 'application/json'}},
  body: jsonEncode({{'email': e, 'password': p}}),
);

// Authenticated GET
final res = await http.get(
  Uri.parse('$BASE_URL/app-leave/'),
  headers: {{
    'Content-Type': 'application/json',
    'token': jwtToken,
  }},
);

**6. Network Options**
- Same WiFi: Use IP {SERVER_IP} directly (local testing)
- ngrok: ngrok http 80, share URL (remote testing)
- Cloud VPS: Deploy on AWS/DigitalOcean (production)
- Port forwarding: Forward port 80 on router (home network)

**IMPORTANT: Auth Header is 'token' (lowercase), NOT 'Authorization: Bearer ...'**
"""

pdf.set_font("Helvetica","",10)
pdf.set_text_color(44,62,80)
pdf.multi_cell(0, 5, share, markdown=True)

# ---- MAIN API DOCS ----
pdf.add_page()
pdf.set_font("Helvetica","",10)
pdf.set_text_color(44,62,80)
pdf.multi_cell(0, 5, md, markdown=True)

pdf.output(OUTPUT)
print(f"PDF saved to: {OUTPUT}")
print(f"File size: {os.path.getsize(OUTPUT)/1024:.0f} KB")
