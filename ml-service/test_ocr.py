import fitz
import pytesseract
from PIL import Image
import io
from extractor import extract_invoice_data

# Location of our uploaded invoice PDF
pdf_path = "../backend/uploads/1791282173342-test_invoice.pdf"

# Open the PDF
pdf = fitz.open(pdf_path)

print("PDF opened successfully!")
print("Number of pages:", len(pdf))

# Get the first page
page = pdf[0]

# Convert PDF page into an image
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

# Convert image bytes into a PIL image
image = Image.open(io.BytesIO(pix.tobytes("png")))

print("PDF page converted to image!")

# Run OCR
text = pytesseract.image_to_string(image)

print("\n========== OCR RESULT ==========\n")
print(text)

invoice_data = extract_invoice_data(text)

print("\n========== EXTRACTED DATA ==========\n")
print(invoice_data)

print("\n========== END ==========")
# Close PDF
pdf.close()