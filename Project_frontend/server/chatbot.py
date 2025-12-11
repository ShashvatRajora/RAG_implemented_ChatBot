import os
import json
import re
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.schema import Document
import openai

class DocumentChatbot:
    def __init__(self, api_key, model_name="shisa-ai/shisa-v2-llama3.3-70b:free"):
        # Configure OpenAI for OpenRouter
        openai.api_key = api_key
        openai.api_base = "https://openrouter.ai/api/v1"
        self.model_name = model_name
        
        # Initialize embeddings
        self.embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.db = None
        
    def load_and_process_documents(self, text_file_path, tables_dir):
        """Load text and table documents, create embeddings"""
        # Load text document
        with open(text_file_path, "r", encoding="utf-8") as f:
            doc_text = f.read()

        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        text_chunks = splitter.split_text(doc_text)
        text_docs = [{"type": "text", "content": chunk, "source": "ocr_text"} for chunk in text_chunks]
        
        # Load table documents
        table_docs = []
        if os.path.exists(tables_dir):
            for fname in os.listdir(tables_dir):
                if fname.endswith('.json'):
                    with open(os.path.join(tables_dir, fname), "r", encoding="utf-8") as f:
                        rows = json.load(f)
                        table_md = self.table_to_md(rows)
                        table_docs.append({
                            "type": "table",
                            "content": table_md,
                            "source": fname
                        })
        
        # Create FAISS database
        all_docs = []
        for item in text_docs + table_docs:
            all_docs.append(Document(
                page_content=item["content"],
                metadata={"source": item["source"], "type": item["type"]}
            ))

        self.db = FAISS.from_documents(all_docs, self.embedder)
        print(f"[✓] Loaded {len(text_docs)} text chunks and {len(table_docs)} table chunks")
        
    def table_to_md(self, rows):
        """Convert table rows to markdown format"""
        md = []
        for i, row in enumerate(rows):
            line = "| " + " | ".join(str(cell) for cell in row) + " |"
            md.append(line)
            if i == 0:
                md.append("| " + " | ".join(["---"] * len(row)) + " |")
        return "\n".join(md)
    
    def ask(self, query, k=5):
        """Ask a question and get an answer"""
        if not self.db:
            return "Please load documents first using load_and_process_documents()"
            
        # Get relevant documents
        rel_docs = self.db.similarity_search(query, k=k)
        context = "\n\n---\n\n".join([doc.page_content for doc in rel_docs])
        
        prompt = f"""You are an assistant answering questions using the provided documents only.
If the answer is not in the documents, say "I don't know based on the provided documents."

### Query:
{query}

### Documents:
{context}
"""
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response['choices'][0]['message']['content']
        except Exception as e:
            return f"Error generating response: {str(e)}"

# Example usage
if __name__ == "__main__":
    # Initialize chatbot
    chatbot = DocumentChatbot(api_key="your-openrouter-api-key")
    
    # Load documents
    chatbot.load_and_process_documents(
        text_file_path="ocr_text_with_tables.txt",
        tables_dir="Altered_tables"
    )
    
    # Test query
    response = chatbot.ask("What is the HRA rate for X class cities?")
    print(response)