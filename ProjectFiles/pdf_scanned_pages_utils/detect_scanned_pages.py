import pdfplumber

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
