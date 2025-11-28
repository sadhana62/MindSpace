import json
import os
import chromadb
from sentence_transformers import SentenceTransformer
import chromadb.errors
import re

class VectorDBBuilder:
    def __init__(self):
        # 1. Paths
        self.data_path = "../data/master_knowledge_base.json"
        self.db_path = "../chroma_db" 
        
        # 2. Initialize Embedding Model
        print("Loading Embedding Model...")
        self.model_name = "all-MiniLM-L6-v2"
        self.encoder = SentenceTransformer(self.model_name)
        print("Model Loaded.")

        # 3. Initialize ChromaDB
        self.client = chromadb.PersistentClient(path=self.db_path)
        
        # Reset Collection
        try:
            self.client.delete_collection(name="mental_health_knowledge")
            print("Deleted old database collection to ensure freshness.")
        except Exception: 
            pass 

        self.collection = self.client.create_collection(
            name="mental_health_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

    def load_data(self):
        if not os.path.exists(self.data_path):
            print(f"Error: {self.data_path} not found. Run merge_data.py first!")
            return []
        
        with open(self.data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def chunk_text(self, text, chunk_size=1000, overlap=200):
        if not text: return []
        
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            if end < text_len:
                last_space = text.rfind(' ', start, end)
                if last_space != -1: end = last_space
            
            chunk = text[start:end].strip()
            if len(chunk) > 50: chunks.append(chunk)
            
            start = end - overlap
            if start >= end: start = end 
            
        return chunks

    def sanitize_id(self, text):
        """Creates a safe ID string from a title if URL is missing"""
        # Remove special characters and spaces
        return re.sub(r'[^a-zA-Z0-9]', '_', text)[:50]

    def build_database(self):
        raw_data = self.load_data()
        print(f"Processing {len(raw_data)} documents...")

        ids = []
        documents = []
        metadatas = []

        total_chunks = 0

        # Loop with index to help generate IDs
        for idx, item in enumerate(raw_data):
            # 1. Get Content
            full_text = item.get('text', '') or item.get('summary', '')
            if not full_text: continue

            # 2. Get Safe ID (The Fix)
            # If URL is missing, generate one from Title or Index
            if 'url' in item and item['url']:
                base_id = item['url']
            else:
                # Fallback: Use sanitized title or document index
                safe_title = self.sanitize_id(item.get('title', 'doc'))
                base_id = f"research_{idx}_{safe_title}"

            # 3. Chunk
            text_chunks = self.chunk_text(full_text)

            for i, chunk in enumerate(text_chunks):
                # Create Unique Chunk ID
                chunk_id = f"{base_id}_chunk_{i}"
                
                # Metadata
                meta = {
                    "source": item['metadata'].get('source', 'Unknown'),
                    "title": item.get('title', 'No Title'),
                    "url": item.get('url', 'N/A'), # Safe .get() for metadata too
                    "type": item['metadata'].get('doc_source_type', 'general'),
                    "country": "India"
                }

                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append(meta)
                total_chunks += 1

        print(f"Generated {total_chunks} text chunks. Generating Vectors ...")

        if total_chunks == 0:
            print("No chunks generated. Check your json file content.")
            return

        # 4. Create Embeddings in Batches
        batch_size = 100
        total_batches = (len(documents) + batch_size - 1) // batch_size

        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i : i + batch_size]
            batch_ids = ids[i : i + batch_size]
            batch_metas = metadatas[i : i + batch_size]

            batch_embeddings = self.encoder.encode(batch_docs).tolist()

            self.collection.add(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_metas,
                embeddings=batch_embeddings
            )
            print(f"   -> Processed batch {i//batch_size + 1}/{total_batches}")

        print(f"\n SUCCESS: Stored {total_chunks} chunks in Vector Database at '{self.db_path}'")

if __name__ == "__main__":
    builder = VectorDBBuilder()
    builder.build_database()