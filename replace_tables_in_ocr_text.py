import os
import json
import re

def load_tables_from_json(table_dir):
    """Load all tables from a directory into a dict: {table_id: table_data}"""
    tables = {}
    for fname in sorted(os.listdir(table_dir)):
        if fname.endswith('.json'):
            table_id = os.path.splitext(fname)[0]
            with open(os.path.join(table_dir, fname), 'r', encoding='utf-8') as f:
                tables[table_id] = json.load(f)
    return tables

def replace_tables_in_text(ocr_text_path, table_dir, output_path):
    """
    Replace [TABLE:...] placeholders with raw JSON of the actual table data.
    This helps preserve structure and allows better LLM/RAG parsing later.
    """
    with open(ocr_text_path, 'r', encoding='utf-8') as f:
        text = f.read()

    tables = load_tables_from_json(table_dir)

    def replacer(match):
        table_id = match.group(1)
        table = tables.get(table_id)
        if table:
            return f'\n[[TABLE_START:{table_id}]]\n{json.dumps(table, ensure_ascii=False, indent=2)}\n[[TABLE_END]]\n'
        else:
            return f"[TABLE NOT FOUND: {table_id}]"

    # Replace placeholders like [TABLE:page_11table4]
    new_text = re.sub(r'\[TABLE:([\w\-]+)\]', replacer, text)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(new_text)

    print(f" Output written to {output_path}")

# Example usage
if __name__ == "__main__":
    ocr_text_path = "Output/HRA_RULES/HRA_RULES.md"
    table_dir = "Output/pdfplumber_tables"
    output_path = "Output/ocr_text_with_tables.txt"
    replace_tables_in_text(ocr_text_path, table_dir, output_path)
