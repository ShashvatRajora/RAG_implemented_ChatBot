import fitz  # PyMuPDF
import os
import shutil
from PyPDF2 import PdfReader, PdfWriter
import ocrmypdf

def extract_scanned_pages(pdf_path):
    doc = fitz.open(pdf_path)
    scanned = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if not text or len(text) < 10:
            scanned.append(i)
    return scanned

def split_pdf_by_pages(pdf_path, pages, output_path):
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for p in pages:
        writer.add_page(reader.pages[p])
    with open(output_path, "wb") as f:
        writer.write(f)

def replace_pages(original_pdf, replacement_pdf, page_indices, output_path):
    orig_reader = PdfReader(original_pdf)
    ocr_reader = PdfReader(replacement_pdf)
    writer = PdfWriter()
    ocr_idx = 0
    for i in range(len(orig_reader.pages)):
        if i in page_indices:
            writer.add_page(ocr_reader.pages[ocr_idx])
            ocr_idx += 1
        else:
            writer.add_page(orig_reader.pages[i])
    with open(output_path, "wb") as f:
        writer.write(f)

def run_partial_ocr(pdf_path, output_path="output/ocr_fixed_final.pdf"):
    os.makedirs("temp", exist_ok=True)
    scanned_pages = extract_scanned_pages(pdf_path)
    print(f"[INFO] Scanned pages detected: {scanned_pages}")

    if not scanned_pages:
        print("[INFO] No scanned pages found. Copying original PDF.")
        shutil.copyfile(pdf_path, output_path)
        return

    temp_scanned_pdf = "temp/scanned_pages.pdf"
    temp_scanned_ocr_pdf = "temp/scanned_pages_ocr.pdf"

    split_pdf_by_pages(pdf_path, scanned_pages, temp_scanned_pdf)
    ocrmypdf.ocr(temp_scanned_pdf, temp_scanned_ocr_pdf, use_threads=True)

    replace_pages(pdf_path, temp_scanned_ocr_pdf, scanned_pages, output_path)
    print(f"[✅] Final fixed PDF created: {output_path}")
    
if __name__ == "__main__":
    run_partial_ocr("ProjectFiles\data\HRA_RULES.pdf")
