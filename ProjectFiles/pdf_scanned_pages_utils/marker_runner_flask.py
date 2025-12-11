# # from flask import Flask, request, jsonify
# # from werkzeug.utils import secure_filename
# import os
# from marker_runner import run_marker_on_uploaded_pdf

# app = Flask(__name__)
# UPLOAD_FOLDER = "uploads"
# OUTPUT_FOLDER = "D:/Project(beast)/marker_structured_output"
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# @app.route("/upload_pdf", methods=["POST"])
# def upload_pdf():
#     if 'file' not in request.files:
#         return jsonify({"error": "No file part"}), 400
    
#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({"error": "No selected file"}), 400

#     filename = secure_filename(file.filename)
#     input_path = os.path.join(UPLOAD_FOLDER, filename)
#     file.save(input_path)

#     result_msg = run_marker_on_uploaded_pdf(input_path, OUTPUT_FOLDER)
#     return jsonify({"message": result_msg})

# if __name__ == "__main__":
#     app.run(debug=True)
