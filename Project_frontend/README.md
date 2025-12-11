# DocuChat AI - Advanced PDF Processing & Chat System

## 🚀 Features

- **Multi-Document Support**: Upload and process multiple PDFs simultaneously
- **Hybrid Processing Pipeline**: 
  - OCR with Marker (marker_single) via Flask service + Express.js fallback
  - Table extraction with PDFPlumber
  - Text enhancement and combination
  - AI indexing with vector embeddings
- **Real-time Processing Updates**: WebSocket-based progress tracking
- **Intelligent Chat**: Ask questions about specific documents using notebook logic
- **Session Management**: Switch between different document chats
- **Beautiful UI**: Modern, responsive design with animations

## 📋 Prerequisites

### System Requirements
- Node.js 18+ 
- Python 3.8+
- marker_single command-line tool

### Install marker_single
```bash
pip install marker-pdf
```

## 🛠️ Installation

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Environment Variables
Create `.env` file in root directory:
```bash
# OpenRouter API Configuration
OPENAI_API_KEY=your-openrouter-api-key-here
OPENAI_API_BASE=https://openrouter.ai/api/v1

# Server Configuration
PORT=5000
NODE_ENV=development

# Flask Service Configuration
FLASK_PORT=5001
FLASK_SERVICE_URL=http://localhost:5001

# Base directories for processing
UPLOADS_DIR=./uploads
OUTPUT_FRONTEND_DIR=./output_frontend
```

### 4. Get OpenRouter API Key
- Go to [OpenRouter.ai](https://openrouter.ai/)
- Sign up/Login
- Create API key
- Add to `.env` file

## 🚀 Running the Application

### Option 1: Start All Services Together
```bash
npm run start:all
```

### Option 2: Start Services Individually

#### Terminal 1: Start Flask Service (Marker Processing)
```bash
npm run flask
```

#### Terminal 2: Start Express Backend
```bash
npm run server
```

#### Terminal 3: Start Frontend
```bash
npm run dev
```

### Access the Application
- Frontend: `http://localhost:5173`
- Express API: `http://localhost:5000`
- Flask Service: `http://localhost:5001`

## 📁 Project Structure

```
project-root/
├── server/
│   ├── index.js                         # Main Express server with WebSocket
│   ├── advanced_chatbot.js              # Multi-document chatbot logic
│   ├── marker_runner_flask.py           # Flask service for marker processing
│   ├── pdfplumber_table_extractor.py    # Table extraction script
│   ├── replace_tables_in_ocr_text.py    # Table replacement script
│   └── marker_runner.py                 # Direct marker wrapper (fallback)
├── src/
│   ├── pages/
│   │   ├── Upload.tsx                   # PDF upload & processing
│   │   ├── Chat.tsx                     # Multi-document chat interface
│   │   └── ...
│   └── components/
├── uploads/                             # Uploaded PDF files
├── output_frontend/                     # Processing outputs (your structure)
│   ├── [document_name]/                 # OCR output folder
│   │   └── document_name.md             # Marker OCR output
│   ├── pdfplumber_tables/               # Table extraction folder
│   │   └── [document_name]/             # Session-specific tables
│   │       ├── page_1_table_1.json
│   │       └── page_2_table_1.json
│   └── [document_name]_ocr_text_with_tables.txt  # Enhanced text
├── .env                                 # Environment variables
└── requirements.txt                     # Python dependencies
```

## 🔄 Processing Pipeline (Your Exact Workflow)

1. **PDF Upload**: User uploads PDF file → `uploads/`
2. **OCR Processing**: 
   - **Primary**: Flask service runs marker_single → `output_frontend/[document_name]/[document_name].md`
   - **Fallback**: Direct marker execution if Flask fails
3. **Table Extraction**: PDFPlumber extracts tables → `output_frontend/pdfplumber_tables/[document_name]/`
4. **Text Enhancement**: `replace_tables_in_ocr_text.py` combines text with tables → `output_frontend/[document_name]_ocr_text_with_tables.txt`
5. **AI Indexing**: Uses your notebook logic with text chunking and table processing
6. **Ready for Chat**: Document available for Q&A using your exact model configuration

## 💬 Usage

### Upload Documents
1. Go to `/upload` page
2. Drag & drop or select PDF file
3. Watch real-time processing progress
4. Click "Start Chatting" when complete

### Chat with Documents
1. Go to `/chat` page
2. Select document from sidebar
3. Ask questions about the document
4. Get intelligent, context-aware answers using your notebook logic

### Manage Sessions
- View all uploaded documents in sidebar
- Switch between different document chats
- Delete unwanted sessions

## 🔧 API Endpoints

### Express.js Endpoints
- `POST /api/upload` - Upload and process PDF
- `POST /api/chat/:sessionId` - Chat with specific document
- `GET /api/sessions` - Get all document sessions
- `GET /api/sessions/:sessionId/status` - Get processing status
- `DELETE /api/sessions/:sessionId` - Delete session
- `GET /api/health` - Health check

### Flask Service Endpoints
- `POST /upload_pdf` - Process PDF with marker_single
- `GET /health` - Flask service health check
- `GET /process_status/<session_name>` - Check marker processing status

## 🌐 WebSocket Events

- `processing-update` - Real-time processing progress
- `processing-complete` - Processing finished notification

## 🔑 API Key Configuration

Add your OpenRouter API key to the `.env` file:
```bash
OPENAI_API_KEY=sk-or-v1-your-api-key-here
```

The system uses your exact notebook configuration:
- Model: `shisa-ai/shisa-v2-llama3.3-70b:free`
- Temperature: 0
- Max tokens: 512
- Text chunking: 800 chars with 100 overlap
- Table processing: JSON to markdown conversion

## 🐛 Troubleshooting

### marker_single not found
```bash
pip install marker-pdf
# or
pip install marker-python
```

### Flask service not starting
```bash
# Check if port 5001 is available
lsof -i :5001
# Kill any process using the port
kill -9 <PID>
```

### Python dependencies issues
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Processing stuck
- Check if both Flask and Express services are running
- Verify Python scripts have execution permissions
- Check server logs for detailed error messages

### API Key Issues
- Verify OpenRouter API key is correct
- Check if you have credits in OpenRouter account
- Ensure `.env` file is in root directory

## 📊 Performance Notes

- **Processing Time**: Depends on PDF size and complexity
- **File Size Limit**: 50MB per PDF
- **Concurrent Processing**: Supports multiple documents
- **Memory Usage**: Scales with number of active sessions
- **Hybrid Architecture**: Flask handles heavy marker processing, Express handles API and WebSocket

## 🔒 Security

- Files are processed locally
- API keys stored in environment variables
- Session-based document isolation
- Automatic cleanup of temporary files
- Separate services for isolation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details