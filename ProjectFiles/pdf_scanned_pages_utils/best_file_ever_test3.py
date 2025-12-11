import os
import shutil
import json
import cv2
import numpy as np
import pandas as pd
import subprocess
import pdfplumber
import pytesseract
from PIL import Image
from img2table.ocr import TesseractOCR
from img2table.document import Image as TableImage

def detect_scanned_pages(pdf_path):
    scanned_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            height = page.height
            top_crop = height * 0.10
            bottom_crop = height * 0.90
            words = page.extract_words()
            central_words = [w for w in words if top_crop < float(w['top']) < bottom_crop]
            if not central_words:
                print(f"[INFO] Page {i + 1} is scanned (no central text).")
                scanned_pages.append(i)
            else:
                print(f"[INFO] Page {i + 1} has real text in body.")
    return scanned_pages


def run_ocr_on_pages(pdf_path, output_path, scanned_pages):
    if not scanned_pages:
        print("[INFO] No scanned pages found. Skipping OCR.")
        return pdf_path

    page_str = ",".join(str(p + 1) for p in scanned_pages)
    cmd = [
        "ocrmypdf",
        "--force-ocr",
        "--pages", page_str,
        "--deskew",
        "--output-type", "pdf",
        pdf_path,
        output_path
    ]
    print(f"[INFO] Running OCR on pages: {page_str}")
    subprocess.run(cmd, check=True)
    print("[INFO] OCR completed.")
    return output_path

def extract_tables(pdf_path, save_dir="output/pdfplumber_tables"):
    os.makedirs(save_dir, exist_ok=True)
    print(f"\n[INFO] Extracting tables from: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            
            if not tables:
                print(f"[Page {i+1}] No tables found.")
                continue
            print(f"[Page {i+1}] Tables found: {len(tables)}")
            for t_idx, table in enumerate(tables):
                if not table or len(table) < 2 or len(table[0]) < 2:
                    continue
                cleaned_table = [[cell if cell else "" for cell in row] for row in table]
                json_path = os.path.join(save_dir, f"page_{i+1}table{t_idx+1}.json")
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(cleaned_table, f, ensure_ascii=False, indent=2)
                csv_path = os.path.join(save_dir, f"page_{i+1}table{t_idx+1}.csv")
                with open(csv_path, "w", encoding="utf-8") as f:
                    for row in cleaned_table:
                        f.write(",".join(row) + "\n")
                print(f"  → Saved table: {json_path}")
    print("\n[DONE] All tables extracted and saved.")

# simply save the scanned pages as images for further processing
def save_scanned_pages_as_images(pdf_path, scanned_pages, out_dir="output/scanned_images"):
    os.makedirs(out_dir, exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf:
        for i in scanned_pages:
            page = pdf.pages[i]
            img = page.to_image(resolution=300)
            img_path = os.path.join(out_dir, f"page_{i+1}.png")
            img.save(img_path)
            print(f"[INFO] Saved scanned page image: {img_path}")


# OpenCV - based table detection from images
def detect_tables_in_image(image_path, out_dir="output/scanned_tables", min_area=10000):  
    os.makedirs(out_dir, exist_ok=True)
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
    horizontal = cv2.erode(binary, kernel, iterations=1)
    horizontal = cv2.dilate(horizontal, kernel, iterations=1)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
    vertical = cv2.erode(binary, kernel, iterations=1)
    vertical = cv2.dilate(vertical, kernel, iterations=1)
    mask = cv2.add(horizontal, vertical)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)), iterations=2)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    table_count = 0
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w * h > min_area:
            table_img = image[y:y+h, x:x+w]
            table_path = os.path.join(out_dir, f"{os.path.splitext(os.path.basename(image_path))[0]}table{table_count+1}.png")
            cv2.imwrite(table_path, table_img)
            print(f"[INFO] Saved table image: {table_path}")
            table_count += 1

def extract_tables_from_scanned_pages(pdf_path, scanned_pages):
    save_scanned_pages_as_images(pdf_path, scanned_pages)
    img_dir = "output/scanned_images"
    for img_file in os.listdir(img_dir):
        if img_file.endswith(".png"):
            detect_tables_in_image(os.path.join(img_dir, img_file))

def ocr_tables_in_dir(table_img_dir, ocr_out_dir="output/ocr_tables"):
    os.makedirs(ocr_out_dir, exist_ok=True)
    for fname in os.listdir(table_img_dir):
        if fname.lower().endswith(".png"):
            img_path = os.path.join(table_img_dir, fname)
            img = Image.open(img_path)
            text = pytesseract.image_to_string(img, config="--psm 6")
            out_txt = os.path.join(ocr_out_dir, fname.replace(".png", ".txt"))
            with open(out_txt, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"[INFO] OCR done: {out_txt}")

# Convert table image crops to 1-page PDFs
def convert_table_images_to_pdfs(table_img_dir="output/scanned_tables", pdf_dir="output/table_pdfs"):
    os.makedirs(pdf_dir, exist_ok=True)
    for fname in os.listdir(table_img_dir):
        if fname.lower().endswith(".png"):
            try:
                img_path = os.path.join(table_img_dir, fname)
                img = Image.open(img_path).convert("RGB")
                pdf_path = os.path.join(pdf_dir, fname.replace(".png", ".pdf"))
                img.save(pdf_path)
                print(f"[PDF] Created from image: {pdf_path}")
            except Exception as e:
                print(f"[ERROR] Could not convert {fname} to PDF: {e}")

def extract_tables_from_pdfs(pdf_dir="output/table_pdfs", out_dir="output/pdfplumber_from_table_pdfs"):
    os.makedirs(out_dir, exist_ok=True)
    for fname in os.listdir(pdf_dir):
        if fname.lower().endswith(".pdf"):
            pdf_path = os.path.join(pdf_dir, fname)
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    page = pdf.pages[0]
                    tables = page.extract_tables()
                    for i, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue
                        json_path = os.path.join(out_dir, f"{fname.replace('.pdf', f'table{i+1}.json')}")
                        with open(json_path, "w", encoding="utf-8") as jf:
                            json.dump(table, jf, ensure_ascii=False, indent=2)
                        csv_path = os.path.join(out_dir, f"{fname.replace('.pdf', f'table{i+1}.csv')}")
                        with open(csv_path, "w", encoding="utf-8") as cf:
                            for row in table:
                                cf.write(",".join([cell if cell else "" for cell in row]) + "\n")
                        print(f"[DONE] Structured table extracted: {json_path}")
            except Exception as e:
                print(f"[WARN] Skipped {fname}: {e}")


def extract_table_from_image_to_excel(image_path, excel_path, json_path, csv_path):
    ocr = TesseractOCR(lang="eng")
    img_doc = TableImage(src=image_path)
    
    tables = img_doc.extract_tables(ocr=ocr, implicit_rows=True, borderless_tables=True)

    if not tables:
        print(f"[WARN] No table found in {image_path}")
        return

    df = tables[0].df  # Only first table returned
    df.to_excel(excel_path, index=False)
    df.to_csv(csv_path, index=False)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(df.values.tolist(), f, ensure_ascii=False, indent=2)

    print(f"[EXCEL ✓] Extracted from: {image_path}")

def batch_process_table_images(image_dir="output/scanned_tables", out_dir="output/excel_extracted"):
    os.makedirs(out_dir, exist_ok=True)
    for fname in os.listdir(image_dir):
        if fname.lower().endswith(".png"):
            img_path = os.path.join(image_dir, fname)
            base = os.path.splitext(fname)[0]
            extract_table_from_image_to_excel(
                image_path=img_path,
                excel_path=os.path.join(out_dir, f"{base}.xlsx"),
                csv_path=os.path.join(out_dir, f"{base}.csv"),
                json_path=os.path.join(out_dir, f"{base}.json")
            )
            

def main():
    input_pdf = "ProjectFiles/data/HRA_RULES.pdf"
    output_pdf = "output_ocr.pdf"

    print(f"[START] Processing: {input_pdf}")

    scanned_pages = detect_scanned_pages(input_pdf)
    processed_pdf = run_ocr_on_pages(input_pdf, output_pdf, scanned_pages)
    extract_tables(processed_pdf)
    extract_tables_from_scanned_pages(input_pdf, scanned_pages)
    ocr_tables_in_dir("output/scanned_tables")

    convert_table_images_to_pdfs("output/scanned_tables")
    extract_tables_from_pdfs("output/table_pdfs")

    batch_process_table_images("output/scanned_tables")

    for temp_folder in [
        "output/table_pdfs",
        "output/ocr_tables",
        "output/pdfplumber_from_table_pdfs"
    ]:
        if os.path.exists(temp_folder):
            shutil.rmtree(temp_folder)
            print(f"[CLEANUP] Removed temp folder: {temp_folder}")

if __name__ == "__main__":
    main()