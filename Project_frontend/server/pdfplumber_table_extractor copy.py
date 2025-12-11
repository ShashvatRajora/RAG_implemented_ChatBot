import pdfplumber
import os
import json

def extract_tables_from_pdf(pdf_path, output_dir="output/Altered_tables"):
    os.makedirs(output_dir, exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            page_tables = []
            for t_idx, table in enumerate(tables):
                # Filter out empty or very small tables
                if not table or len(table) < 2 or len(table[0]) < 2:
                    continue
                # Save as JSON for structure, and as CSV for easy viewing
                table_json_path = os.path.join(output_dir, f"page_{i+1}_table_{t_idx+1}.json")
                table_csv_path = os.path.join(output_dir, f"page_{i+1}_table_{t_idx+1}.csv")
                with open(table_json_path, "w", encoding="utf-8") as jf:
                    json.dump(table, jf, ensure_ascii=False, indent=2)
                with open(table_csv_path, "w", encoding="utf-8") as cf:
                    for row in table:
                        cf.write(",".join([str(cell) if cell is not None else "" for cell in row]) + "\n")
                page_tables.append(table)
            print(f"[INFO] Page {i+1}: {len(page_tables)} tables extracted.")
    print("[INFO] Table extraction with pdfplumber complete.")
