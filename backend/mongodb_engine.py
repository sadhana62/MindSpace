from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime,UTC
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION CONSTANTS ---
BUCKET_CAPACITY = 100 
DEFAULT_LIMIT = 50

class BucketHistoryService:
    """
    Manages chat history using the Bucket Pattern for read optimization.
    """
    def __init__(self, db_client: MongoClient, db_name: str = 'mindspace'):
        self.db = db_client[db_name]
        self.collection = self.db['conversation_buckets']
        
        # Ensure compound index for fast lookups and sorting
        self.collection.create_index([
            ("conversation_id", ASCENDING), 
            ("bucket_time", DESCENDING)
        ])
        print("BucketHistoryService initialized with compound index.")

    def add_message(self, conversation_id: str, sender_id: str, content: str) -> None:
        """
        Adds a message by pushing it into the current bucket or creating a new one.
        """
        message = {
            "sender_id": sender_id,
            "content": content,
            "timestamp": datetime.now(UTC)
        }
        
        # 1. Try to push to the latest bucket if it has space
        update_result = self.collection.update_one(
            {
                "conversation_id": conversation_id,
                "count": {"$lt": BUCKET_CAPACITY}
            },
            {
                "$push": {"messages": message},
                "$inc": {"count": 1},
                "$set": {"last_update": datetime.now(UTC)}
            }
        )
        
        # 2. CREATE NEW BUCKET if no bucket was found or the found bucket was full.
        if update_result.matched_count == 0:
            new_bucket = {
                "conversation_id": conversation_id,
                "bucket_time": datetime.now(UTC),
                "count": 1,
                "messages": [message]
            }
            self.collection.insert_one(new_bucket)
            print(f"Created new bucket for {conversation_id}.")

    def get_history(self, conversation_id: str, limit: int = DEFAULT_LIMIT) -> List[Dict[str, Any]]:
        """
        Retrieves the last 'limit' messages for a given conversation.
        Optimized by reading only the necessary buckets.
        """
        # Calculate how many buckets we might need to retrieve
        num_buckets = (limit + BUCKET_CAPACITY - 1) // BUCKET_CAPACITY 
        
        # 1. Retrieve the latest N buckets (N is usually 1 or 2)
        buckets = self.collection.find(
            {"conversation_id": conversation_id}
        ).sort("bucket_time", DESCENDING).limit(num_buckets)
        
        all_messages = []
        for bucket in buckets:
            # Add messages from oldest to newest bucket retrieved
            all_messages.extend(bucket['messages'])

        # 2. Slice and Reverse: Slice the messages to the requested limit 
        # and reverse the order back to chronological (oldest first for LLM context)
        
        # Sort by timestamp (in memory) to ensure perfect order across bucket breaks
        all_messages.sort(key=lambda m: m['timestamp']) 
        
        # Return only the requested number of messages (slice from the end)
        return all_messages[-limit:]

