import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentChatbot {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1';
    this.modelName = 'shisa-ai/shisa-v2-llama3.3-70b:free';
    
    // File paths from environment or defaults
    this.ocrTextPath = process.env.OCR_TEXT_FILE_PATH || path.join(__dirname, '../data/ocr_text_with_tables.txt');
    this.tablesDir = process.env.TABLES_DIR_PATH || path.join(__dirname, '../data/Altered_tables');
    
    this.documents = [];
    this.isLoaded = false;
    
    this.loadDocuments();
  }

  loadDocuments() {
    try {
      // Load main text document
      if (fs.existsSync(this.ocrTextPath)) {
        const textContent = fs.readFileSync(this.ocrTextPath, 'utf-8');
        this.documents.push({
          type: 'text',
          content: textContent,
          source: 'ocr_text_with_tables'
        });
        console.log('[✓] Loaded OCR text document');
      } else {
        console.log('[!] OCR text file not found at:', this.ocrTextPath);
      }

      // Load table documents
      if (fs.existsSync(this.tablesDir)) {
        const tableFiles = fs.readdirSync(this.tablesDir).filter(file => file.endsWith('.json'));
        
        tableFiles.forEach(filename => {
          const filePath = path.join(this.tablesDir, filename);
          const tableData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const tableMarkdown = this.tableToMarkdown(tableData);
          
          this.documents.push({
            type: 'table',
            content: tableMarkdown,
            source: filename
          });
        });
        
        console.log(`[✓] Loaded ${tableFiles.length} table documents`);
      } else {
        console.log('[!] Tables directory not found at:', this.tablesDir);
      }

      this.isLoaded = this.documents.length > 0;
      console.log(`[✓] Total documents loaded: ${this.documents.length}`);
      
    } catch (error) {
      console.error('[ERROR] Failed to load documents:', error);
      this.isLoaded = false;
    }
  }

  tableToMarkdown(rows) {
    if (!rows || rows.length === 0) return '';
    
    const markdown = [];
    rows.forEach((row, index) => {
      const line = '| ' + row.map(cell => String(cell || '')).join(' | ') + ' |';
      markdown.push(line);
      
      // Add header separator after first row
      if (index === 0) {
        const separator = '| ' + row.map(() => '---').join(' | ') + ' |';
        markdown.push(separator);
      }
    });
    
    return markdown.join('\n');
  }

  // Simple keyword-based document search (fallback for when embeddings aren't available)
  searchDocuments(query, maxResults = 5) {
    const queryLower = query.toLowerCase();
    const results = [];

    this.documents.forEach(doc => {
      const contentLower = doc.content.toLowerCase();
      let score = 0;
      
      // Simple scoring based on keyword matches
      const queryWords = queryLower.split(/\s+/);
      queryWords.forEach(word => {
        if (word.length > 2) { // Skip very short words
          const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        }
      });

      if (score > 0) {
        results.push({
          document: doc,
          score: score
        });
      }
    });

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(result => result.document);
  }

  async ask(query) {
    if (!this.isLoaded) {
      return "Sorry, the document database is not loaded. Please check if the data files are properly placed.";
    }

    if (!this.apiKey) {
      return "API key not configured. Please set your OpenRouter API key in the .env file.";
    }

    try {
      // Get relevant documents
      const relevantDocs = this.searchDocuments(query, 5);
      
      if (relevantDocs.length === 0) {
        return "I couldn't find relevant information in the documents to answer your question.";
      }

      // Create context from relevant documents
      const context = relevantDocs
        .map(doc => `Source: ${doc.source}\n${doc.content}`)
        .join('\n\n---\n\n');

      const prompt = `You are an assistant answering questions using the provided documents only.
If the answer is not in the documents, say "I don't know based on the provided documents."

### Query:
${query}

### Documents:
${context}`;

      // Make API call to OpenRouter
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

      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('Error generating response:', error);
      
      if (error.response?.status === 401) {
        return "Authentication failed. Please check your API key.";
      } else if (error.response?.status === 429) {
        return "Rate limit exceeded. Please try again later.";
      } else {
        return "Sorry, I encountered an error processing your request. Please try again.";
      }
    }
  }

  // Reload documents (useful for development)
  reload() {
    this.documents = [];
    this.isLoaded = false;
    this.loadDocuments();
  }
}

export default DocumentChatbot;