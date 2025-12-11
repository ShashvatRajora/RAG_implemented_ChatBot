import os
import subprocess

def run_marker_on_uploaded_pdf(input_path, output_dir):
    if not os.path.exists(input_path):
        return f"[❌] Input file does not exist: {input_path}"

    os.makedirs(output_dir, exist_ok=True)

    # Output will be named like input_filename.md
    output_file = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + ".md")

    if os.path.exists(output_file):
        return f"[⚠️] Skipped. Output already exists: {output_file}"

    cmd = [
        "marker_single",
        input_path,
        "--output_dir", output_dir,
        "--format_lines",
        "--force_ocr",
        "--paginate_output",
        "--disable_image_extraction"
    ]

    try:
        subprocess.run(cmd, check=True)
        return f"[✅] Marker complete. Output saved to: {output_file}"
    except subprocess.CalledProcessError as e:
        return f"[❌] Marker failed: {str(e)}"

# You can now import and call run_marker_on_uploaded_pdf() from your backend


# python marker_runner.py "..\data\HRA_Eng_1.pdf" "D:\Project(beast)\marker_structured_output"
