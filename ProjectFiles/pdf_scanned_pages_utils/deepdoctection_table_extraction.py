# import os
# import json
# from deepdoctection.pipe import get_dd_model
# from PIL import Image

# def detect_tables_with_deepdoctection(image_path, output_dir="output/deep_detected_tables"):
#     os.makedirs(output_dir, exist_ok=True)

#     # Load DeepDetection model
#     model = get_dd_model("table_detection")

#     # Load image
#     image = Image.open(image_path).convert("RGB")

#     # Perform table detection
#     doc = model.predict(image)
#     tables = doc.tables

#     # Process detected tables
#     for idx, table in enumerate(tables):
#         table_image = table.image
#         cropped_path = os.path.join(output_dir, f"table_{idx+1}.png")
#         table_image.save(cropped_path)
#         print(f"[INFO] Saved cropped table: {cropped_path}")

#         # Extract table structure
#         table_data = []
#         for row in table.rows:
#             row_data = [cell.text for cell in row.cells]
#             table_data.append(row_data)

#         # Save table as JSON
#         json_path = os.path.join(output_dir, f"table_{idx+1}.json")
#         with open(json_path, "w", encoding="utf-8") as f:
#             json.dump(table_data, f, ensure_ascii=False, indent=2)
#         print(f"[INFO] Saved table JSON: {json_path}")

# def batch_process_table_images_with_deepdoctection(image_dir="output/scanned_tables", output_dir="output/deep_detected_tables"):
#     os.makedirs(output_dir, exist_ok=True)
#     for fname in os.listdir(image_dir):
#         if fname.lower().endswith(".png"):
#             img_path = os.path.join(image_dir, fname)
#             detect_tables_with_deepdoctection(img_path, output_dir)

# if __name__ == "__main__":
#     batch_process_table_images_with_deepdoctection()


import os
import json
from PIL import Image
import deepdoctection as dd


def get_dd_analyzer():
    """
    Initializes the DeepDoctection analyzer with explicit config for non-PDF image inputs.
    """
    return dd.get_dd_analyzer(
        config_overwrite={
            "USE_PDF_MINER": False,
            "USE_OCR": True,
            "USE_TABLE_SEGMENTATION": True,
            "USE_CELL_SEGMENTATION": True
        }
    )


def detect_tables_with_deepdoctection(image_path, output_dir="output/deep_detected_tables"):
    """
    Processes a single image and extracts tables using DeepDoctection.
    """
    os.makedirs(output_dir, exist_ok=True)
    analyzer = get_dd_analyzer()

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    page_iter = analyzer.analyze(b_bytes=image_bytes, file_name=os.path.basename(image_path))

    # Now we enumerate correctly
    for page_num, page in enumerate(page_iter, 1):
        if not page.tables:
            print(f"[INFO] No tables found on page {page_num} in {image_path}")
            continue

        for idx, tbl in enumerate(page.tables):
            # Save cropped image of table
            try:
                table_img = tbl.image
                cropped_path = os.path.join(
                    output_dir,
                    f"{os.path.splitext(os.path.basename(image_path))[0]}_page{page_num}_table{idx+1}.png"
                )
                table_img.save(cropped_path)
                print(f"[INFO] Saved cropped table: {cropped_path}")
            except Exception as e:
                print(f"[WARN] Could not save table image: {e}")

            # Extract structured table
            table_data = []
            try:
                for row in tbl.rows:
                    row_data = [cell.text if cell.text else "" for cell in row.cells]
                    table_data.append(row_data)
            except Exception as e:
                print(f"[WARN] Table structure parsing failed: {e}")
                table_data = []

            json_path = os.path.join(
                output_dir,
                f"{os.path.splitext(os.path.basename(image_path))[0]}_page{page_num}_table{idx+1}.json"
            )
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(table_data, f, ensure_ascii=False, indent=2)
            print(f"[INFO] Saved table JSON: {json_path}")


def batch_process_table_images_with_deepdoctection(image_dir="output/scanned_tables", output_dir="output/deep_detected_tables"):
    """
    Batch-process all PNG images in a folder using DeepDoctection.
    """
    os.makedirs(output_dir, exist_ok=True)

    for fname in os.listdir(image_dir):
        if fname.lower().endswith(".png"):
            image_path = os.path.join(image_dir, fname)
            try:
                detect_tables_with_deepdoctection(image_path, output_dir)
            except Exception as e:
                print(f"[ERROR] Failed to process {fname}: {e}")


if __name__ == "__main__":
    batch_process_table_images_with_deepdoctection()

