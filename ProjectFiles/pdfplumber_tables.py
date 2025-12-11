from utils.pdfplumber_table_extractor import extract_tables_from_pdf

if __name__ == "__main__":
    pdf_path = r"ProjectFiles\data\HRA_RULES.pdf"
    extract_tables_from_pdf(pdf_path)
