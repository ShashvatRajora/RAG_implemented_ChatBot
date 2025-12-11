import pdfplumber
import os
import json
import sys

def extract_tables_from_pdf(pdf_path, output_dir):
    """Extract tables from PDF using pdfplumber and save as JSON files"""
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_tables = 0
            
            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                
                for t_idx, table in enumerate(tables):
                    # Filter out empty or very small tables
                    if not table or len(table) < 2 or len(table[0]) < 2:
                        continue
                    
                    # Clean the table data
                    cleaned_table = []
                    for row in table:
                        cleaned_row = []
                        for cell in row:
                            # Handle None values and clean text
                            if cell is None:
                                cleaned_row.append("")
                            else:
                                # Clean whitespace and newlines
                                cleaned_cell = str(cell).strip().replace('\n', ' ')
                                cleaned_row.append(cleaned_cell)
                        cleaned_table.append(cleaned_row)
                    
                    # Save as JSON
                    table_filename = f"page_{i+1}_table_{t_idx+1}.json"
                    table_path = os.path.join(output_dir, table_filename)
                    
                    with open(table_path, "w", encoding="utf-8") as jf:
                        json.dump(cleaned_table, jf, ensure_ascii=False, indent=2)
                    
                    total_tables += 1
                    print(f"[INFO] Extracted table {t_idx+1} from page {i+1}")
            
            print(f"[✅] Total tables extracted: {total_tables}")
            return total_tables
            
    except Exception as e:
        print(f"[❌] Error extracting tables: {str(e)}")
        raise e

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdfplumber_table_extractor.py <pdf_path> <output_dir>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    extract_tables_from_pdf(pdf_path, output_dir)