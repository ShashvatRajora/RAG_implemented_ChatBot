import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import AdvancedDocumentChatbot from './advanced_chatbot.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Initialize advanced chatbot
const chatbot = new AdvancedDocumentChatbot();

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes

// Upload and process PDF
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.filename);
    
    // Create new session
    const sessionId = chatbot.createSession(req.file.originalname);
    const pdfPath = req.file.path;

    // Send initial response
    res.json({ 
      sessionId,
      message: 'File uploaded successfully, processing started',
      filename: req.file.originalname
    });

    // Start async processing
    const progressCallback = (stepId, status) => {
      io.emit('processing-update', {
        sessionId,
        stepId,
        status,
        timestamp: new Date()
      });
    };

    // Process PDF in background
    chatbot.processPDF(sessionId, pdfPath, progressCallback)
      .then(result => {
        io.emit('processing-complete', {
          sessionId,
          success: result.success,
          message: result.message || result.error,
          timestamp: new Date()
        });
      })
      .catch(error => {
        console.error('Processing error:', error);
        io.emit('processing-complete', {
          sessionId,
          success: false,
          message: error.message,
          timestamp: new Date()
        });
      });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Chat with specific document session
app.post('/api/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`Processing query for session ${sessionId}:`, query);
    const answer = await chatbot.ask(sessionId, query);
    
    res.json({ answer, sessionId });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all document sessions
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = chatbot.getSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get processing status for a session
app.get('/api/sessions/:sessionId/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = chatbot.getProcessingStatus(sessionId);
    res.json({ sessionId, status });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Delete a session
app.delete('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = chatbot.deleteSession(sessionId);
    
    if (deleted) {
      res.json({ message: 'Session deleted successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const sessions = chatbot.getSessions();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isLoaded).length
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for real-time updates`);
});