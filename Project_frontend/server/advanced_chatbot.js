import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdvancedDocumentChatbot {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1';
    this.modelName = 'shisa-ai/shisa-v2-llama3.3-70b:free';
    
    // Validate API key
    if (!this.apiKey) {
      console.error('[❌] OPENAI_API_KEY not found in environment variables');
    } else {
      console.log('[✅] API Key loaded successfully');
    }
    
    // Flask service URL
    this.flaskServiceUrl = process.env.FLASK_SERVICE_URL || 'http://localhost:5001';
    
    // Store multiple document sessions
    this.documentSessions = new Map(); // sessionId -> { documents, isLoaded, metadata }
    this.processingQueue = new Map(); // sessionId -> processing status
    
    // Base directories
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.outputFrontendDir = path.join(__dirname, '../output_frontend');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.uploadsDir, this.outputFrontendDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Create a new document session
  createSession(filename) {
    const sessionId = uuidv4();
    const sessionName = path.basename(filename, '.pdf');
    
    // Create session-specific directories
    const hraRulesDir = path.join(this.outputFrontendDir, sessionName);
    const pdfplumberTablesDir = path.join(this.outputFrontendDir, 'pdfplumber_tables', sessionName);
    
    fs.mkdirSync(hraRulesDir, { recursive: true });
    fs.mkdirSync(pdfplumberTablesDir, { recursive: true });
    
    this.documentSessions.set(sessionId, {
      documents: [],
      isLoaded: false,
      metadata: {
        filename,
        sessionName,
        sessionId,
        hraRulesDir,
        pdfplumberTablesDir,
        createdAt: new Date(),
        status: 'created'
      }
    });
    
    console.log(`[✅] Created session ${sessionId} for ${filename}`);
    return sessionId;
  }

  // Check if marker_single is available
  async checkMarkerAvailability() {
    return new Promise((resolve) => {
      const process = spawn('which', ['marker_single']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  // Process uploaded PDF through the complete pipeline
  async processPDF(sessionId, pdfPath, progressCallback) {
    const session = this.documentSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const { hraRulesDir, pdfplumberTablesDir, sessionName } = session.metadata;
    const steps = [
      { id: 'ocr', name: 'OCR Processing (Marker via Flask)', status: 'pending' },
      { id: 'tables', name: 'Table Extraction (PDFPlumber)', status: 'pending' },
      { id: 'enhancement', name: 'Text Enhancement', status: 'pending' },
      { id: 'indexing', name: 'AI Indexing', status: 'pending' }
    ];

    this.processingQueue.set(sessionId, { steps, currentStep: 0 });

    try {
      console.log(`[INFO] Starting processing pipeline for session ${sessionId}`);
      
      // Step 1: OCR Processing via Flask service
      console.log('[INFO] Step 1: Starting OCR processing...');
      progressCallback('ocr', 'processing');
      const mdFile = await this.runMarkerViaFlask(pdfPath, sessionName);
      if (!mdFile) throw new Error('OCR processing failed');
      
      steps[0].status = 'completed';
      progressCallback('ocr', 'completed');
      console.log('[✅] Step 1: OCR processing completed');

      // Step 2: Table Extraction with pdfplumber
      console.log('[INFO] Step 2: Starting table extraction...');
      progressCallback('tables', 'processing');
      await this.extractTables(pdfPath, pdfplumberTablesDir);
      
      steps[1].status = 'completed';
      progressCallback('tables', 'completed');
      console.log('[✅] Step 2: Table extraction completed');

      // Step 3: Text Enhancement (replace tables in OCR text)
      console.log('[INFO] Step 3: Starting text enhancement...');
      progressCallback('enhancement', 'processing');
      const enhancedFile = await this.replaceTablesInText(mdFile, pdfplumberTablesDir, sessionName);
      
      steps[2].status = 'completed';
      progressCallback('enhancement', 'completed');
      console.log('[✅] Step 3: Text enhancement completed');

      // Step 4: AI Indexing (load into vector database using notebook logic)
      console.log('[INFO] Step 4: Starting AI indexing...');
      progressCallback('indexing', 'processing');
      await this.loadDocumentsForSession(sessionId, enhancedFile, pdfplumberTablesDir);
      
      steps[3].status = 'completed';
      progressCallback('indexing', 'completed');
      console.log('[✅] Step 4: AI indexing completed');

      session.metadata.status = 'ready';
      session.isLoaded = true;

      console.log(`[🎉] Processing pipeline completed successfully for session ${sessionId}`);
      return {
        success: true,
        sessionId,
        message: 'PDF processed successfully'
      };

    } catch (error) {
      console.error(`[❌] Processing failed for session ${sessionId}:`, error);
      session.metadata.status = 'error';
      
      return {
        success: false,
        error: error.message,
        sessionId
      };
    }
  }

  // Run marker via Flask service
  async runMarkerViaFlask(pdfPath, sessionName) {
    try {
      console.log(`[INFO] Sending PDF to Flask service for marker processing...`);
      
      // Create form data
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fs.createReadStream(pdfPath));

      // Send to Flask service
      const response = await axios.post(`${this.flaskServiceUrl}/upload_pdf`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 300000, // 5 minutes timeout
      });

      if (response.data.success) {
        const expectedMdFile = path.join(this.outputFrontendDir, sessionName, `${sessionName}.md`);
        
        // Wait for file to be created and verify it exists
        let attempts = 0;
        while (attempts < 30) {
          // Check for any .md files in the directory
          const outputDir = path.join(this.outputFrontendDir, sessionName);
          if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            
            if (mdFiles.length > 0) {
              const actualMdFile = path.join(outputDir, mdFiles[0]);
              
              // If it's not named correctly, rename it
              if (actualMdFile !== expectedMdFile) {
                try {
                  fs.renameSync(actualMdFile, expectedMdFile);
                  console.log(`[✅] Renamed ${mdFiles[0]} to ${sessionName}.md`);
                } catch (renameError) {
                  console.log(`[INFO] Using original file: ${actualMdFile}`);
                  return actualMdFile;
                }
              }
              
              console.log('[✅] Marker processing completed via Flask');
              return expectedMdFile;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
        }
        
        throw new Error('Marker output file not found after processing');
      } else {
        throw new Error(response.data.error || 'Flask service returned error');
      }
      
    } catch (error) {
      console.error('[❌] Flask marker processing failed:', error.message);
      
      // Check if marker_single is available before attempting fallback
      const markerAvailable = await this.checkMarkerAvailability();
      if (!markerAvailable) {
        throw new Error('marker_single command not found. This application requires the marker-pdf package to be installed. Please install it using: pip install marker-pdf. Note: This may not work in WebContainer environments due to system limitations.');
      }
      
      // Fallback to direct marker execution
      console.log('[INFO] Falling back to direct marker execution...');
      return await this.runMarkerSingleDirect(pdfPath, sessionName);
    }
  }

  // Fallback: Run marker_single directly
  async runMarkerSingleDirect(pdfPath, sessionName) {
    return new Promise((resolve, reject) => {
      const outputDir = path.join(this.outputFrontendDir, sessionName);
      const expectedOutputFile = path.join(outputDir, `${sessionName}.md`);
      
      // Check if already exists
      if (fs.existsSync(expectedOutputFile)) {
        console.log('[INFO] Marker output already exists, skipping...');
        resolve(expectedOutputFile);
        return;
      }

      const cmd = 'marker_single';
      const args = [
        pdfPath,
        '--output_dir', outputDir,
        '--format_lines',
        '--force_ocr',
        '--paginate_output',
        '--disable_image_extraction'
      ];

      console.log(`[INFO] Running: ${cmd} ${args.join(' ')}`);
      
      const process = spawn(cmd, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[MARKER STDOUT]:', data.toString());
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[MARKER STDERR]:', data.toString());
      });

      process.on('close', (code) => {
        console.log(`[INFO] Marker process exited with code: ${code}`);
        
        // Check for any .md files in the output directory
        if (fs.existsSync(outputDir)) {
          const files = fs.readdirSync(outputDir);
          const mdFiles = files.filter(f => f.endsWith('.md'));
          
          if (mdFiles.length > 0) {
            // Found markdown file(s), use the first one
            const actualMdFile = path.join(outputDir, mdFiles[0]);
            
            // If it's not named correctly, rename it
            if (actualMdFile !== expectedOutputFile) {
              try {
                fs.renameSync(actualMdFile, expectedOutputFile);
                console.log(`[✅] Renamed ${mdFiles[0]} to ${sessionName}.md`);
              } catch (renameError) {
                console.log(`[INFO] Could not rename, using original file: ${actualMdFile}`);
                resolve(actualMdFile);
                return;
              }
            }
            
            console.log('[✅] Direct marker processing completed');
            resolve(expectedOutputFile);
          } else {
            console.error('[❌] No markdown files found in output directory');
            console.error('[❌] Available files:', files);
            reject(new Error(`No markdown output found. Available files: ${files.join(', ')}`));
          }
        } else {
          console.error('[❌] Output directory does not exist');
          reject(new Error(`Output directory not created: ${outputDir}`));
        }
      });

      process.on('error', (error) => {
        console.error('[❌] Failed to start marker process:', error);
        if (error.code === 'ENOENT') {
          reject(new Error('marker_single command not found. Please install marker-pdf package using: pip install marker-pdf. Note: This may not work in WebContainer environments due to system limitations.'));
        } else {
          reject(error);
        }
      });
    });
  }

  // Extract tables using pdfplumber
  async extractTables(pdfPath, outputDir) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'pdfplumber_table_extractor.py');
      
      console.log(`[INFO] Running table extraction: python ${pythonScript} ${pdfPath} ${outputDir}`);
      
      const process = spawn('python', [pythonScript, pdfPath, outputDir]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[PDFPLUMBER STDOUT]:', data.toString());
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[PDFPLUMBER STDERR]:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('[✅] Table extraction completed');
          resolve(stdout);
        } else {
          console.error('[❌] Table extraction failed:', stderr);
          reject(new Error(`Table extraction failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error('[❌] Failed to start table extraction process:', error);
        reject(error);
      });
    });
  }

  // Replace tables in OCR text using the provided script
  async replaceTablesInText(mdFile, tablesDir, sessionName) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'replace_tables_in_ocr_text.py');
      const outputFile = path.join(this.outputFrontendDir, `${sessionName}_ocr_text_with_tables.txt`);
      
      console.log(`[INFO] Running text enhancement: python ${pythonScript} ${mdFile} ${tablesDir} ${outputFile}`);
      
      const process = spawn('python', [pythonScript, mdFile, tablesDir, outputFile]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[REPLACE TABLES STDOUT]:', data.toString());
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[REPLACE TABLES STDERR]:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFile)) {
          console.log('[✅] Text enhancement completed');
          resolve(outputFile);
        } else {
          console.error('[❌] Text enhancement failed:', stderr);
          reject(new Error(`Text enhancement failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error('[❌] Failed to start text enhancement process:', error);
        reject(error);
      });
    });
  }

  // Load documents for a specific session (implementing the notebook logic)
  async loadDocumentsForSession(sessionId, textFile, tablesDir) {
    const session = this.documentSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    try {
      console.log(`[INFO] Loading documents for session ${sessionId}`);
      console.log(`[INFO] Text file: ${textFile}`);
      console.log(`[INFO] Tables dir: ${tablesDir}`);
      
      // Load text document and split into chunks (like notebook)
      const textContent = fs.readFileSync(textFile, 'utf-8');
      const textChunks = this.splitText(textContent, 800, 100);
      
      const documents = textChunks.map(chunk => ({
        type: 'text',
        content: chunk,
        source: 'ocr_text'
      }));

      // Load table documents (like notebook)
      if (fs.existsSync(tablesDir)) {
        const tableFiles = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json'));
        
        console.log(`[INFO] Found ${tableFiles.length} table files`);
        
        tableFiles.forEach(filename => {
          const tablePath = path.join(tablesDir, filename);
          const tableData = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
          const tableMarkdown = this.tableToMarkdown(tableData);
          
          documents.push({
            type: 'table',
            content: tableMarkdown,
            source: filename
          });
        });
      }

      session.documents = documents;
      session.isLoaded = true;
      
      console.log(`[✅] Loaded ${documents.length} documents for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[❌] Failed to load documents for session ${sessionId}:`, error);
      throw error;
    }
  }

  // Simple text splitting (implementing RecursiveCharacterTextSplitter logic)
  splitText(text, chunkSize = 800, chunkOverlap = 100) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to break at word boundaries
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }
      
      chunks.push(text.slice(start, end));
      start = end - chunkOverlap;
    }
    
    return chunks;
  }

  // Convert table to markdown (like notebook)
  tableToMarkdown(rows) {
    if (!rows || rows.length === 0) return '';
    
    const markdown = [];
    rows.forEach((row, index) => {
      const line = '| ' + row.map(cell => String(cell || '')).join(' | ') + ' |';
      markdown.push(line);
      
      if (index === 0) {
        const separator = '| ' + row.map(() => '---').join(' | ') + ' |';
        markdown.push(separator);
      }
    });
    
    return markdown.join('\n');
  }

  // Search documents for a specific session (simple keyword search like notebook fallback)
  searchDocuments(sessionId, query, maxResults = 5) {
    const session = this.documentSessions.get(sessionId);
    if (!session || !session.isLoaded) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const results = [];

    session.documents.forEach(doc => {
      const contentLower = doc.content.toLowerCase();
      let score = 0;
      
      const queryWords = queryLower.split(/\s+/);
      queryWords.forEach(word => {
        if (word.length > 2) {
          const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        }
      });

      if (score > 0) {
        results.push({ document: doc, score });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(result => result.document);
  }

  // Ask question for a specific session (using notebook logic)
  async ask(sessionId, query) {
    const session = this.documentSessions.get(sessionId);
    
    if (!session) {
      return "Session not found. Please upload a document first.";
    }
    
    if (!session.isLoaded) {
      return "Document is still being processed. Please wait for processing to complete.";
    }

    if (!this.apiKey) {
      return "API key not configured. Please set your OpenRouter API key in .env file.";
    }

    try {
      console.log(`[INFO] Processing query for session ${sessionId}: ${query}`);
      
      const relevantDocs = this.searchDocuments(sessionId, query, 5);
      
      if (relevantDocs.length === 0) {
        return "I couldn't find relevant information in this document to answer your question.";
      }

      const context = relevantDocs
        .map(doc => `Source: ${doc.source}\n${doc.content}`)
        .join('\n\n---\n\n');

      const prompt = `You are an assistant answering questions using the provided documents only.
If the answer is not in the documents, say "I don't know based on the provided documents."

### Query:
${query}

### Documents:
${context}`;

      console.log(`[INFO] Making API call to ${this.apiBase} with model ${this.modelName}`);

      const response = await axios.post(
        `${this.apiBase}/chat/completions`,
        {
          model: this.modelName,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 512
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[✅] API call successful');
      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('[❌] Error generating response:', error);
      
      if (error.response?.status === 401) {
        return "Authentication failed. Please check your API key.";
      } else if (error.response?.status === 429) {
        return "Rate limit exceeded. Please try again later.";
      } else {
        return "Sorry, I encountered an error processing your request.";
      }
    }
  }

  // Get all sessions
  getSessions() {
    const sessions = [];
    this.documentSessions.forEach((session, sessionId) => {
      sessions.push({
        sessionId,
        filename: session.metadata.filename,
        status: session.metadata.status,
        createdAt: session.metadata.createdAt,
        isLoaded: session.isLoaded,
        documentCount: session.documents.length
      });
    });
    
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get processing status
  getProcessingStatus(sessionId) {
    return this.processingQueue.get(sessionId) || null;
  }

  // Delete session
  deleteSession(sessionId) {
    const session = this.documentSessions.get(sessionId);
    if (session) {
      // Clean up files
      const { hraRulesDir, pdfplumberTablesDir, sessionName } = session.metadata;
      
      if (fs.existsSync(hraRulesDir)) {
        fs.rmSync(hraRulesDir, { recursive: true, force: true });
      }
      
      if (fs.existsSync(pdfplumberTablesDir)) {
        fs.rmSync(pdfplumberTablesDir, { recursive: true, force: true });
      }
      
      // Clean up enhanced text file
      const enhancedFile = path.join(this.outputFrontendDir, `${sessionName}_ocr_text_with_tables.txt`);
      if (fs.existsSync(enhancedFile)) {
        fs.unlinkSync(enhancedFile);
      }
      
      this.documentSessions.delete(sessionId);
      this.processingQueue.delete(sessionId);
      
      return true;
    }
    return false;
  }
}

export default AdvancedDocumentChatbot;