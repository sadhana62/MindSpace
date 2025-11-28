import json
import os
import time

class KnowledgeMerger:
    def __init__(self):
        self.data_dir = "../data"
        self.news_path = f"{self.data_dir}/news_mental_health_data.json"
        self.research_path = f"{self.data_dir}/data_from_research.json"
        self.output_path = f"{self.data_dir}/master_knowledge_base.json"

    def load_json(self, filepath):
        """Safely loads a JSON file. Returns empty list if file missing."""
        if not os.path.exists(filepath):
            print(f"Warning: File not found: {filepath}")
            return []
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                print(f"Loaded {len(data)} items from {os.path.basename(filepath)}")
                return data
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return []

    def merge_datasets(self):
        print("Starting Data Merge...")
        # 1. Load Data
        news_data = self.load_json(self.news_path)
        research_data = self.load_json(self.research_path)

        # 2. Add Type Tags (Crucial for the Bot to know the difference)
        # We modify the data in memory to ensure every item has a 'doc_type'
        
        normalized_data = []

        # Process News
        for item in news_data:
            # Ensure metadata exists
            if "metadata" not in item: item["metadata"] = {}
            
            # Tag it
            item["metadata"]["doc_source_type"] = "news"
            item["metadata"]["trust_level"] = "medium" # News is generally medium trust
            normalized_data.append(item)

        # Process Research
        for item in research_data:
            if "metadata" not in item: item["metadata"] = {}
            
            # Tag it
            item["metadata"]["doc_source_type"] = "research"
            item["metadata"]["trust_level"] = "high" # Research is high trust
            normalized_data.append(item)

        # 3. Stats
        total_count = len(normalized_data)
        print(f"\nMerge Stats:")
        print(f"   - News Articles: {len(news_data)}")
        print(f"   - Research Papers: {len(research_data)}")
        print(f"   - TOTAL KNOWLEDGE BASE: {total_count}")

        # 4. Save Master File
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(normalized_data, f, indent=4, ensure_ascii=False)
        
        print(f"\nSaved Master Knowledge Base to: {self.output_path}")
        return normalized_data

if __name__ == "__main__":
    merger = KnowledgeMerger()
    merger.merge_datasets()