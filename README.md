# MyRAG: OCR + Table Extraction + Dual-Vector RAG Chatbot  
A fully offline, production-grade Retrieval-Augmented Generation (RAG) system designed to handle **scanned PDFs, nested tables, OCR noise, and complex document structures** using a hybrid pipeline of deep-learning–based table extraction, dynamic markdown chunking, and dual FAISS vector stores.

---

## 🚀 Features  
### 🔍 **1. Auto-Detection of Scanned vs Digital Pages**  
- 10% margin-based heuristic on each page  
- Routes digital pages → `pdfplumber`  
- Routes scanned pages → OpenCV + Tesseract/PaddleOCR  
- Fully automated, no user intervention needed  

---

## 🧠 **2. CNN-Based Table Detection**  
Replaces unreliable contour-based OpenCV methods with:  
- **PubLayNet**  
- **CascadeTabNet**  
- Supports **nested (table-in-table) extraction** using recursive parsing  

---

## 🗂 **3. Structural Table Parsing**  
Fixes all major table extraction issues:  
- Split/merged columns  
- Multi-line headers  
- Row/column misalignment  
- Logo or watermark falsely detected as table  

Techniques used:  
- KMeans clustering on text coordinates  
- IoU-based column merge  
- Vertical/horizontal projection profiling  

---

## 🔡 **4. Advanced OCR Pipeline (Fixes X/Y/Z Errors)**  
Two-phase Tesseract pipeline:  
1. `image_to_string` for clean text  
2. `image_to_data` for layout-aware extraction  

Fallback:  
- **PaddleOCR**  
- **DeepDoctection**  

Includes preprocessing:  
- Adaptive threshold  
- Noise removal  
- Dilation for broken characters  

---

## 📄 **5. Inline Images & Noise Filtering**  
Handles cases where scanned images/logos appear inside digital PDFs.  
Implemented:  
- Table confidence classifier  
- Aspect ratio + pixel density rejection  
- CNN filtering to avoid false-positive tables  

---

## ♻ **6. Modular Pipeline Architecture**  
Your 200+ line script is now cleanly separated into modules:

```
scanned_detection.py
table_detection.py
ocr_utils.py
deepdoctection_fallback.py
pdf_pipeline.py
chunking.py
vector_store.py
rag_engine.py
```

---

## ✂ **7. Dynamic Markdown Chunking**  
Built specifically for long legal/technical documents.  
- Preserves table boundaries  
- Prevents paragraph fragmentation  
- Metadata stored per chunk  
- Works seamlessly with LlamaCPP  

---

## 🧱 **8. Dual Vector Store RAG Architecture**  
Two FAISS indexes:

### **1️⃣ Text Vector Store**
- Stores OCR + injected markdown  
- Semantic Q&A  

### **2️⃣ Table Vector Store**
- Stores structured table JSON  
- Enables numeric and row/column-specific Q&A  

Retrieval Logic:  
- Text-only queries → Text DB  
- Table queries → Table DB  
- Hybrid → Multi-store retrieval  

---

## 🧩 **9. Offline LLM Integration (Zephyr-7B GGUF)**  
Runs fully locally with **LlamaCPP**:  
- No API key  
- Lightweight, fast, optimized  
- Strict grounding: *answers ONLY from context*  
- Zero hallucination mode  

---

## 🗺 **10. Full End-to-End Workflow**

1. Upload PDF  
2. Detect digital/scanned pages  
3. Extract tables, nested tables, and text  
4. Inject into markdown via Marker-PDF  
5. Dynamically chunk content  
6. Build dual FAISS vector stores  
7. Query using Zephyr-7B LLM  
8. Get accurate, grounded answers  

---

## 📦 Project Structure

```
MyRAG/
│── data/
│── models/
│── src/
│   │── scanned_detection.py
│   │── table_detection.py
│   │── ocr_utils.py
│   │── deepdoctection_fallback.py
│   │── pdf_pipeline.py
│   │── chunking.py
│   │── vector_store.py
│   │── rag_engine.py
│── README.md
│── requirements.txt
│── app.ipynb
```

---

## 🛠 Tech Stack  
- **Python**  
- **OpenCV**  
- **pdfplumber**  
- **Tesseract / PaddleOCR / DeepDoctection**  
- **CascadeTabNet / PubLayNet (CNN Table Detection)**  
- **FAISS**  
- **LlamaCPP + Zephyr-7B GGUF**  
- **Marker-PDF for markdown injection**  

---

## 🧪 Example Query  
> **“Extract table of HRA rules for Delhi region and summarize differences page-wise.”**  

📌 The system retrieves:  
- Relevant text chunks  
- Related structured tables  
- Produces a grounded, page-referenced answer  

---

## 📘 License  
MIT License  

---

## 👨‍💻 Author  
**Shashvat Rajora**  

