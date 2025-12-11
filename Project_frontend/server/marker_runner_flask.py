from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import sys
from marker_runner import run_marker_on_uploaded_pdf

app = Flask(__name__)

# Configure upload settings
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
UPLOAD_FOLDER = "uploads"
OUTPUT_FRONTEND_FOLDER = "output_frontend"

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FRONTEND_FOLDER, exist_ok=True)

@app.route("/upload_pdf", methods=["POST"])
def upload_pdf():
    """
    Flask endpoint for PDF upload and marker processing
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        # Secure the filename and save
        filename = secure_filename(file.filename)
        input_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(input_path)
        
        # Get session name (without .pdf extension)
        session_name = os.path.splitext(filename)[0]
        output_dir = os.path.join(OUTPUT_FRONTEND_FOLDER, session_name)
        
        # Run marker processing
        result_msg = run_marker_on_uploaded_pdf(input_path, output_dir)
        
        return jsonify({
            "success": True,
            "message": result_msg,
            "session_name": session_name,
            "input_path": input_path,
            "output_dir": output_dir
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "OK",
        "service": "Flask Marker Service",
        "upload_folder": UPLOAD_FOLDER,
        "output_folder": OUTPUT_FRONTEND_FOLDER
    })

@app.route("/process_status/<session_name>", methods=["GET"])
def process_status(session_name):
    """Check if marker processing is complete for a session"""
    try:
        output_dir = os.path.join(OUTPUT_FRONTEND_FOLDER, session_name)
        md_file = os.path.join(output_dir, f"{session_name}.md")
        
        if os.path.exists(md_file):
            return jsonify({
                "status": "completed",
                "md_file": md_file,
                "session_name": session_name
            })
        else:
            return jsonify({
                "status": "processing",
                "session_name": session_name
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('FLASK_PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)