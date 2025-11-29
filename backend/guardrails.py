import requests
import re

# --- CONFIGURATION ---
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "qwen2.5:1.5b" 

def is_query_mental_health_related(user_message: str) -> bool:
    if not user_message or not isinstance(user_message, str):
        return False
    
    # 1. FEW-SHOT PROMPT (The Fix)
    # Clear examples of what is allowed vs not allowed.
    system_instruction = (
        "You are a strict content classifier for a mental health chatbot. "
        "Classify the user's text into exactly one of these three categories:\n"
        "- 'mental_health': (stress, anxiety, emotions, therapy, life struggles)\n"
        "- 'greeting': (hello, hi, good morning, how are you)\n"
        "- 'off_topic': (coding, programming, math, politics, facts, general knowledge)\n\n"
        "EXAMPLES:\n"
        "User: 'I feel sad' -> mental_health\n"
        "User: 'Write python code' -> off_topic\n"
        "User: 'Who is the president?' -> off_topic\n"
        "User: 'Hello there' -> greeting\n"
        "User: 'Solve 2+2' -> off_topic\n\n"
        "Now classify the following text. Output ONLY the category name."
    )

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"User: '{user_message}'"}
        ],
        "stream": False,
        "temperature": 0.0 # Zero creativity required
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        
        # 2. Parse Output
        result = response.json()['message']['content'].strip().lower()
        # Clean up punctuation (e.g., "off_topic.")
        result = re.sub(r'[^\w\s]', '', result)

        print(f"Input: '{user_message}' -> Classified as: '{result}'")

        # 3. Strict Logic
        if "mental_health" in result:
            return True
        elif "greeting" in result:
            return True
        elif "off_topic" in result:
            return False
        else:
            #If the model output something weird like "I can't do that", block it.
            print(f"Unknown classification: {result}")
            return False

    except Exception as e:
        print(f"Guardrail Error: {e}")
        return False 

# --- TEST IT ---
if __name__ == "__main__":
    print(f"4. 'Who won the world cup?': {is_query_mental_health_related('who is sachin tendulkar?')}")