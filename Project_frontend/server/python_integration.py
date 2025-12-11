import subprocess
import os
import sys
import json
from pathlib import Path

class PDFProcessor:
    def __init__(self, base_dir="./processing"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        
    def run_marker_single(self, input_path, output_dir):
        """Run marker_single command for OCR processing"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        output_file = output_path / f"{Path(input_path).stem}.md"
        
        # Check if output already exists
        if output_file.exists():
            print(f"[INFO] Output file already exists: {output_file}")
            return str(output_file)
        
        cmd = [
            "marker_single",
            str(input_path),
            "--output_dir", str(output_dir),
            "--format_lines",
            "--force_ocr", 
            "--paginate_output",
            "--disable_image_extraction"
        ]
        
        try:
            print(f"[INFO] Running Marker command: {' '.join(cmd)}")
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"[✅] Marker processing complete: {output_file}")
            return str(output_file)
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Marker command failed: {e}")
            print(f"[ERROR] STDOUT: {e.stdout}")
            print(f"[ERROR] STDERR: {e.stderr}")
            return None
    
    def extract_tables_with_pdfplumber(self, pdf_path, output_dir):
        """Extract tables using pdfplumber"""
        try:
            # This would call your pdfplumber_tables_extractor.py
            cmd = [
                sys.executable, 
                "pdfplumber_tables_extractor.py",
                str(pdf_path),
                str(output_dir)
            ]
            
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"[✅] Table extraction complete")
            return True
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Table extraction failed: {e}")
            return False
    
    def replace_tables_in_text(self, md_file, tables_dir, output_file):
        """Replace table placeholders with actual table data"""
        try:
            cmd = [
                sys.executable,
                "replace_tables_in_ocr_text.py",
                str(md_file),
                str(tables_dir),
                str(output_file)
            ]
            
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"[✅] Table replacement complete: {output_file}")
            return str(output_file)
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Table replacement failed: {e}")
            return None
    
    def process_pdf_complete(self, pdf_path, progress_callback=None):
        """Complete PDF processing pipeline"""
        pdf_path = Path(pdf_path)
        project_dir = self.base_dir / pdf_path.stem
        project_dir.mkdir(exist_ok=True)
        
        steps = []
        
        try:
            # Step 1: OCR Processing with Marker
            if progress_callback:
                progress_callback("OCR Processing", "processing")
            
            md_output_dir = project_dir / "marker_output"
            md_file = self.run_marker_single(pdf_path, md_output_dir)
            
            if not md_file:
                raise Exception("Marker processing failed")
            
            steps.append({"step": "ocr", "status": "completed", "output": md_file})
            if progress_callback:
                progress_callback("OCR Processing", "completed")
            
            # Step 2: Table Extraction
            if progress_callback:
                progress_callback("Table Extraction", "processing")
            
            tables_dir = project_dir / "tables"
            if not self.extract_tables_with_pdfplumber(pdf_path, tables_dir):
                raise Exception("Table extraction failed")
            
            steps.append({"step": "tables", "status": "completed", "output": str(tables_dir)})
            if progress_callback:
                progress_callback("Table Extraction", "completed")
            
            # Step 3: Text Enhancement
            if progress_callback:
                progress_callback("Text Enhancement", "processing")
            
            final_output = project_dir / "ocr_text_with_tables.txt"
            enhanced_file = self.replace_tables_in_text(md_file, tables_dir, final_output)
            
            if not enhanced_file:
                raise Exception("Text enhancement failed")
            
            steps.append({"step": "enhancement", "status": "completed", "output": enhanced_file})
            if progress_callback:
                progress_callback("Text Enhancement", "completed")
            
            # Step 4: AI Indexing (placeholder)
            if progress_callback:
                progress_callback("AI Indexing", "processing")
            
            # Here you would initialize your chatbot with the processed files
            # chatbot.load_and_process_documents(enhanced_file, tables_dir)
            
            steps.append({"step": "indexing", "status": "completed", "output": "Vector database created"})
            if progress_callback:
                progress_callback("AI Indexing", "completed")
            
            return {
                "success": True,
                "steps": steps,
                "final_output": str(enhanced_file),
                "tables_dir": str(tables_dir)
            }
            
        except Exception as e:
            print(f"[ERROR] Processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "steps": steps
            }

# Example usage
if __name__ == "__main__":
    processor = PDFProcessor()
    
    def progress_callback(step_name, status):
        print(f"[{status.upper()}] {step_name}")
    
    result = processor.process_pdf_complete("sample.pdf", progress_callback)
    print(json.dumps(result, indent=2))