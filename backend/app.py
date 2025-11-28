from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from datetime import datetime,UTC, timedelta
from flask_bcrypt import Bcrypt
import os
import dotenv
import secrets
from datetime import datetime, date
from pathlib import Path
from guardrails import is_query_mental_health_related 
import random 
import chromadb
from sentence_transformers import SentenceTransformer
from local_llm_engine import OllamaEngine
from online_llm_engine import OpenAIEngine, GroqEngine
from database import init_db, db, User, MoodEntry, ActivityLog, AssessmentResult
from pymongo import MongoClient
from mongodb_engine import BucketHistoryService
import uuid
import certifi
from tools import get_tool_system_prompt,TOOL_DEFINITIONS
from dotenv import load_dotenv
import json
import re

load_dotenv()

USE_LOCAL_LLM = False

def find_project_root() -> Path:
    current_path = Path(__file__).resolve()
    while current_path != current_path.parent: 
        if (current_path / '.git').exists() or (current_path / '.env').exists():
            return current_path
        current_path = current_path.parent
    raise FileNotFoundError("Project root marker (.git or .env) not found.")


try:
    project_root = find_project_root()
    dotenv_path = project_root / '.env'
    dotenv.load_dotenv(dotenv_path=dotenv_path)
    print(f"Successfully loaded .env file from: {dotenv_path}")

except FileNotFoundError as e:
    print(e)
    exit(1)

print("Initializing AI System...")
# 1. Intialize AI Engines
local_bot = OllamaEngine(model="qwen2.5:1.5b") 
openai_bot = OpenAIEngine(api_key=os.getenv("OPENAI_API_KEY"))
groq_bot = GroqEngine()

# 2. RAG Vector Database
try:
    print("Loading Embedding Model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print("Connecting to ChromaDB...")
    db_path = os.path.join(project_root, "backend", "chroma_db") 
    chroma_client = chromadb.PersistentClient(path=db_path)
    collection = chroma_client.get_collection("mental_health_knowledge")
    print("RAG Database Connected.")
except Exception as e:
    print(f"RAG Warning: {e}")
    collection = None
    embedding_model = None


def get_rag_chunks(query):
    """Searches ChromaDB and returns list of text chunks."""
    if not collection or not embedding_model:
        return []
    try:
        query_vec = embedding_model.encode([query]).tolist()
        results = collection.query(query_embeddings=query_vec, n_results=5)
        
        chunks = []
        docs = results['documents'][0]
        metas = results['metadatas'][0]
        
        for doc, meta in zip(docs, metas):
            source_label = f"[Source: {meta.get('source', 'Unknown')}]"
            chunks.append(f"{source_label}\n{doc}")
        return chunks
    except Exception as e:
        print(f"RAG Lookup Error: {e}")
        return []

OFF_TOPIC_REPLIES = [
    "My purpose is to provide support and information on mental well-being. I can't help with topics outside of that area. Is there anything related to mental health I can assist you with?",
    "My knowledge is focused specifically on mental health and well-being. My goal is to be a helpful resource in that area. How can I support you today?",
    "I can only answer questions related to mental health topics like stress, anxiety, and mindfulness. I am not equipped to handle other subjects. What's on your mind regarding your well-being?"
]



app = Flask(__name__, instance_relative_config=True)

try:
    os.makedirs(app.instance_path)
except OSError:
    pass


CORS(app)                      
bcrypt = Bcrypt(app)          
init_db(app)     

# --- MongoDB Atlas Initialization ---
MONGO_URI = os.getenv("MONGO_DB_URI") 
HISTORY_DB_NAME = os.getenv("CHAT_HISTORY_DB_NAME", "mindspace")
mongo_client = MongoClient(MONGO_URI)

try:
    if not MONGO_URI:
        raise EnvironmentError("MONGO_URI not set. Cannot connect to Atlas.")
    
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    mongo_client.admin.command('ping')
    print("MongoDB Atlas Connected.")

    # Initialize the Bucket Service
    history_service = BucketHistoryService(mongo_client, db_name=HISTORY_DB_NAME)

except Exception as e:
    print(f"HISTORY SERVICE DISABLED: Failed to connect to MongoDB Atlas. {e}")
    history_service = None




@app.route("/")
def home():
    return jsonify({"message": "Mental Health Chatbot API is running!", "status": "active"})


def analyze_intent(user_input):
    """
    Fast, zero-shot classification of user intent to handle crises immediately.
    Uses Groq (fastest) or OpenAI to categorize the message.
    """
    router_prompt = f"""
    You are a strictly mechanical intent classifier for a mental health app. 
    Analyze the user's input and classify it into one of these categories.
    
    Output ONLY the JSON object. Do not output any conversational text.

    CATEGORIES:
    1. "CRISIS_PANIC" -> User is panicking, hyperventilating, freaking out, saying "can't breathe".
    2. "CRISIS_SUICIDE" -> User mentions self-harm, ending life, or extreme hopelessness.
    3. "MOOD_LOG" -> User explicitly wants to log mood (e.g., "I want to track my mood").
    4. "GENERAL_CHAT" -> Normal conversation, venting, asking questions, feeling sad/anxious but not in immediate crisis.

    USER INPUT: "{user_input}"
    
    Expected Output Format:
    {{"category": "CATEGORY_NAME"}}
    """

    try:
        # We use Groq for speed (low latency is crucial for panic attacks)
        # If Groq isn't available, fallback to OpenAI
        messages = [{"role": "system", "content": router_prompt}]
        
        # Determine which bot to use for routing (Prefer Groq for speed)
        router_bot = groq_bot if groq_bot else openai_bot
        
        # Get raw response
        response_text = router_bot.generate_response_with_history(messages)
        
        # CLEANUP: LLMs sometimes wrap JSON in markdown (```json ... ```). Remove it.
        cleaned_text = re.sub(r'```json|```', '', response_text).strip()
        
        intent_data = json.loads(cleaned_text)
        return intent_data.get("category", "GENERAL_CHAT")
        
    except Exception as e:
        print(f"Router Error: {e}")
        return "GENERAL_CHAT" # Fail-safe default

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    single_message = data.get("message")
    messages_payload = data.get("messages")
    print(data)
    
    # 1. USER IDENTITY AND CHAT CODE LOOKUP
    user_email = data.get("email")

    if not user_email:
        return jsonify({"error": "User identity (email) is required for chat history lookup."}), 401

    user = User.query.filter_by(email=user_email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    chat_code = user.chat_code  

    # --- 2. MESSAGE EXTRACTION---
    user_message = ""
    if single_message:
        user_message = str(single_message)

    elif isinstance(messages_payload, list) and len(messages_payload) > 0:
        for m in reversed(messages_payload):
            if m.get("role") == "user":
                user_message = m.get("content")
                break

    if not user_message:
        return jsonify({"error": "No user message provided in payload"}), 400


    # --- 3. GUARDRAILS CHECK---
    if not is_query_mental_health_related(user_message):
        print("Guardrail Triggered: Off-topic")
        reply = random.choice(OFF_TOPIC_REPLIES)
        
        # Save the off-topic user message, but not the canned reply
        if history_service:
            history_service.add_message(
                conversation_id=chat_code,
                sender_id=user_email,
                content=user_message
            )
        return jsonify({"response": reply, "reply": reply}), 200
    
    # --- 4. INTENT ROUTER LOGIC ---
    print("Analyzing Intent...")
    intent = analyze_intent(user_message)
    print(f"Detected Intent: {intent}")

    if intent == "CRISIS_PANIC":
        # Get tag dynamically from TOOL_DEFINITIONS
        breathing_tag = TOOL_DEFINITIONS['activities']['breathing']['tag']
        
        # Immediate Intervention
        panic_response = f"I am here with you. I'm loading the breathing assistant now. Follow the animation with me. {breathing_tag}"
        
        if history_service:
            history_service.add_message(chat_code, user_email, user_message)
            history_service.add_message(chat_code, "assistant", panic_response)
            
        return jsonify({"response": panic_response, "reply": panic_response}), 200

    elif intent == "CRISIS_SUICIDE":
        # Immediate Safety Resource (No widget tag, strict text response)
        safety_response = "I am very concerned about you. You are not alone. Please reach out to these crisis lines immediately:\n\n**National Helpline: 14416**\n**Vandrevala Foundation: 9999 666 555**"
        
        if history_service:
            history_service.add_message(chat_code, user_email, user_message)
            history_service.add_message(chat_code, "assistant", safety_response)

        return jsonify({"response": safety_response, "reply": safety_response}), 200

    elif intent == "MOOD_LOG":
        # Handle explicit requests to log mood (e.g. "I want to track my mood")
        mood_tag = TOOL_DEFINITIONS['mood_tracker']['tag']
        
        mood_response = f"Understood. Let's log how you are feeling right now. {mood_tag}"
        
        if history_service:
            history_service.add_message(chat_code, user_email, user_message)
            history_service.add_message(chat_code, "assistant", mood_response)

        return jsonify({"response": mood_response, "reply": mood_response}), 200

    # Note: We do NOT handle assessments (Anxiety/Depression) here in the Router.
    # Why? Because assessments usually require a "Conversation -> Ask Permission -> Yes" flow.
    # Those are handled by the LLM (Step 7) which uses the System Prompt to negotiate.

    # 5. HISTORY RETRIEVAL
    chat_history = []
    if history_service:
        # Retrieve the last 20 messages for LLM context
        chat_history = history_service.get_history(chat_code, limit=20)
        print(f"Retrieved history length: {len(chat_history)}")
        
    # 6. RAG RETRIEVAL
    context_chunks = get_rag_chunks(user_message)
    print(f"Context chunks found: {len(context_chunks)}")
    
    # 7. CONSTRUCT FULL LLM CONTEXT
    
    # Convert MongoDB documents into the LLM API format [{"role": "user", "content": "..."}]
    messages_for_llm = [
        {"role": "user" if m['sender_id'] == user_email else "assistant", 
         "content": m['content']} 
        for m in chat_history
    ]

    # --- SYSTEM PROMPT CONSTRUCTION (UPDATED) ---
    # Get the RAG text
    rag_text = "\n\n".join(context_chunks)
    
    # Get the dynamic tool instructions from tools.py
    tool_instructions = get_tool_system_prompt()

    # Combine them
    system_prompt = (
        "You are a supportive mental health assistant. Always base your reply on the following context if relevant.\n"
        f"Context:\n\n{rag_text}\n"
        f"{tool_instructions}"
    )

    # Final list of messages to send to the LLM (System + History + Current Message)
    final_messages = [
        {"role": "system", "content": system_prompt}
    ] + messages_for_llm + [
        {"role": "user", "content": user_message}
    ]

    # 8. GENERATE RESPONSE
    reply = ""
    print("USE_LOCAL_LLM",USE_LOCAL_LLM)
    if USE_LOCAL_LLM:
        print("Using Engine: OLLAMA (Local)")
        # Note: You need to update your LLM Engines to accept the full final_messages list
        # instead of just user_message and context_chunks separately.
        if local_bot.check_status():
            # This part would need to be updated to support tool calling for local models
            reply = local_bot.generate_response_with_history(final_messages)
        else:
            print("Local bot is down. Falling back to Cloud...")
            reply=groq_bot.generate_response_with_history(final_messages)
    else:
        print("Using Engine: Cloud LLM")
        reply=groq_bot.generate_response_with_history(final_messages)
        

    # 9. SAVE HISTORY
    if history_service:
        # Saving the current user message
        history_service.add_message(
            conversation_id=chat_code,
            sender_id=user_email,
            content=user_message
        )
        
        # Saveing the assistant's response
        history_service.add_message(
            conversation_id=chat_code,
            sender_id="assistant",
            content=reply
        )
        
    return jsonify({"response": reply, "reply": reply}), 200


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    print("data",data)
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    print("name",name)

    if not all([name, email, password]):
        print("no name")
        return jsonify({"error": "Missing name, email, or password"}), 400

    user_exists = User.query.filter_by(email=email).first()
    if user_exists:
        return jsonify({"error": "User with this email already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(name=name, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    # Return the new user object so the frontend can automatically log them in
    user_data = {"name": new_user.name, "email": new_user.email}
    return jsonify({"message": "User registered successfully", "user": user_data}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    chat_code=str(uuid.uuid4())

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Login successful", "user": {"name": user.name, "email": user.email}}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401


@app.route("/mood", methods=["POST"])
def save_mood():
    data = request.get_json()
    email = data.get("email")
    mood = data.get("mood")
    note = data.get("note")
    entry_date_str = data.get("entry_date", date.today().isoformat())
    entry_date_obj = datetime.strptime(entry_date_str, "%Y-%m-%d").date()

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_entry = MoodEntry(
        mood=mood,
        note=note,
        timestamp=datetime.now(UTC),
        entry_date=entry_date_obj,
        user_id=user.id
    )
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({"message": "Mood saved"})


@app.route("/moods/<email>", methods=["GET"])
def get_mood_entries(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    entries = MoodEntry.query.filter_by(user_id=user.id).order_by(MoodEntry.timestamp.desc()).all()
    result = [{ "mood": entry.mood, "note": entry.note, "timestamp": entry.timestamp.isoformat()} for entry in entries]
    return jsonify(result), 200


@app.route("/assessment/<assessment_type>", methods=["POST"])
def assessment(assessment_type):
    data = request.get_json()
    email = data.get("email")
    answers = data.get("answers")

    if not email or not answers:
        return jsonify({"error": "Missing email or answers"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    score = sum([int(a) if str(a).isdigit() else 0 for a in answers.values()])
    
    if assessment_type == "anxiety":
        result = f"Your GAD-7 score is {score}. {'Moderate/Severe Anxiety' if score >= 10 else 'Mild Anxiety'}"
    elif assessment_type == "depression":
        result = f"Your PHQ-9 score is {score}. {'Moderate/Severe Depression' if score >= 10 else 'Mild Depression'}"
    elif assessment_type == "stress":
        result = f"Your Stress score is {score}. {'High Stress' if score >= 18 else 'Low/Moderate Stress'}"
    else:
        return jsonify({"error": "Unknown assessment type"}), 400
    
    new_assessment = AssessmentResult(
        user_id=user.id,
        assessment_type=assessment_type,
        score=score,
        timestamp=datetime.now(UTC)
    )
    db.session.add(new_assessment)
    db.session.commit()

    return jsonify({"result": result, "score": score}), 200


@app.route("/assessments/<email>", methods=["GET"])
def get_assessment_history(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    results = AssessmentResult.query.filter_by(user_id=user.id).order_by(AssessmentResult.timestamp.asc()).all()
    history = {"anxiety": [], "depression": [], "stress": []}
    for res in results:
        if res.assessment_type in history:
            history[res.assessment_type].append({"date": res.timestamp.isoformat(), "score": res.score})
    return jsonify(history), 200


@app.route("/activity", methods=["POST"])
def log_activity():
    data = request.get_json()
    email = data.get("email")
    activity = data.get("activity")

    if not email or not activity:
        return jsonify({"error": "Missing email or activity"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    log = ActivityLog(activity=activity, user_id=user.id)
    db.session.add(log)
    db.session.commit()
    return jsonify({"message": "Activity logged successfully"}), 201


GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen"
]

PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself",
    "Trouble concentrating on things",
    "Moving or speaking slowly or being fidgety",
    "Thoughts of self-harm"
]

STRESS_QUESTIONS = [
    "I found it hard to wind down",
    "I tended to over-react to situations",
    "I felt that I was using a lot of nervous energy",
    "I found myself getting agitated",
    "I found it difficult to relax",
    "I was intolerant of anything that kept me from getting on with what I was doing",
    "I felt that I was rather touchy",
    "I felt upset by trivial things",
    "I found it hard to calm down after something upset me",
    "I found it difficult to tolerate interruptions"
]


@app.route("/assessment/questions/anxiety", methods=["GET"])
def get_gad7_questions():
    return jsonify({"questions": GAD7_QUESTIONS})


@app.route("/assessment/questions/depression", methods=["GET"])
def get_phq9_questions():
    return jsonify({"questions": PHQ9_QUESTIONS})


@app.route("/assessment/questions/stress", methods=["GET"])
def get_stress_questions():
    return jsonify({"questions": STRESS_QUESTIONS})


if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=True)
