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


# ==========================================
#  NEW HIERARCHICAL ROUTERS
# ==========================================

def execute_router(prompt, default_val):
    """Helper to run the LLM call for any router"""
    try:
        # Prefer Groq for speed
        router_bot = groq_bot if groq_bot else openai_bot
        messages = [{"role": "system", "content": prompt}]
        response_text = router_bot.generate_response_with_history(messages)
        
        cleaned_text = re.sub(r'```json|```', '', response_text).strip()
        intent_data = json.loads(cleaned_text)
        return intent_data.get("category", default_val)
    except Exception as e:
        print(f"Router Error: {e}")
        return default_val

def analyze_broad_intent(user_input):
    """
    LEVEL 1: Determines the High-Level Category.
    """
    router_prompt = f"""
    Classify the user's intent into ONE of these BROAD categories.
    Output ONLY JSON: {{"category": "CATEGORY_NAME"}}

    CATEGORIES:
    1. "CRISIS_SUICIDE" -> Self-harm, ending life, extreme hopelessness.
    2. "CRISIS_PANIC" -> Panicking, hyperventilating, "can't breathe".
    3. "MOOD_LOG" -> Explicitly wants to log mood.
    
    4. "ROUTING_ACTIVITY" -> User wants to do a physical or relaxation exercise (breathe, stretch, walk, meditate).
    5. "ROUTING_ASSESSMENT" -> User wants to take a test, quiz, or check mental levels (anxiety, depression, stress).
    
    6. "GENERAL_CHAT" -> Normal conversation, venting, questions.

    USER INPUT: "{user_input}"
    """
    return execute_router(router_prompt, "GENERAL_CHAT")

def classify_activity_type(user_input):
    """
    LEVEL 2 (Activities): Determines which specific activity.
    """
    router_prompt = f"""
    The user wants to perform an activity. Classify into one specific type.
    Output ONLY JSON: {{"category": "CATEGORY_NAME"}}

    CATEGORIES:
    1. "breathing" -> Relaxation, meditation, calming down, deep breaths.
    2. "stretch" -> Physical tension, neck pain, sitting too long, yoga.
    3. "walking" -> Restless, need a break, change of scenery, trapped.

    USER INPUT: "{user_input}"
    """
    # Matches keys in TOOL_DEFINITIONS['activities']
    return execute_router(router_prompt, "breathing") 

def classify_assessment_type(user_input):
    """
    LEVEL 2 (Assessments): Determines which specific test.
    """
    router_prompt = f"""
    The user wants to take a mental health assessment. Classify into one specific type.
    Output ONLY JSON: {{"category": "CATEGORY_NAME"}}

    CATEGORIES:
    1. "anxiety" -> GAD-7, worried, nervous, on edge.
    2. "depression" -> PHQ-9, sad, hopeless, no energy.
    3. "stress" -> Overwhelmed, burnout, pressure.

    USER INPUT: "{user_input}"
    """
    # Matches keys in TOOL_DEFINITIONS['assess']
    return execute_router(router_prompt, "stress")

def determine_widget_type(text_response):
    """
    Checks if the LLM response contains a known tool tag.
    If yes, returns that specific type. If no, returns 'general_chat'.
    """
    # 1. Check for specific activity tags (from your TOOL_DEFINITIONS)
    # We iterate through your definitions to see if the tag string exists in the response
    if 'activities' in TOOL_DEFINITIONS:
        for activity_key, activity_data in TOOL_DEFINITIONS['activities'].items():
            if activity_data.get('tag') and activity_data['tag'] in text_response:
                return activity_key # e.g., 'breathing'

    # 2. Check for Mood Tracker
    if 'mood_tracker' in TOOL_DEFINITIONS:
        mood_tag = TOOL_DEFINITIONS['mood_tracker'].get('tag')
        if mood_tag and mood_tag in text_response:
            return "mood_tracker"

    # 3. Default fallback
    return "general_chat"

def remove_tags_from_text(text):
    """
    Removes any substring matching <<ACTION: ... >> from the text.
    """
    # Regex pattern to find <<ACTION:ANYTHING_INSIDE>>
    cleaned_text = re.sub(r'<<ACTION:.*?>>', '', text)
    return cleaned_text.strip()

@app.route("/chat", methods=["POST"])
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    single_message = data.get("message")
    messages_payload = data.get("messages")
    print(data)
    
    # 1. USER IDENTITY
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "User identity (email) is required."}), 401

    user = User.query.filter_by(email=user_email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    chat_code = user.chat_code  

    # 2. MESSAGE EXTRACTION
    user_message = ""
    if single_message:
        user_message = str(single_message)
    elif isinstance(messages_payload, list) and len(messages_payload) > 0:
        for m in reversed(messages_payload):
            if m.get("role") == "user":
                user_message = m.get("content")
                break

    if not user_message:
        return jsonify({"error": "No user message provided"}), 400

    # 3. GUARDRAILS CHECK
    if not is_query_mental_health_related(user_message):
        reply = random.choice(OFF_TOPIC_REPLIES)
        if history_service:
            history_service.add_message(chat_code, user_email, user_message)
        # Returns standard structure
        return jsonify({
            "response": reply, 
            "reply": reply, 
            "widget_type": "off_topic"
        }), 200
    
    # 4. HIERARCHICAL INTENT ROUTING
    print("Analyzing Broad Intent...")
    broad_intent = analyze_broad_intent(user_message)
    print(f"Broad Intent: {broad_intent}")

    # Initialize DEFAULT values (fallback to general chat)
    widget_type = "general_chat"
    assistant_reply = ""

    # --- BRANCH A: CRISIS & MOOD (Direct) ---
    if broad_intent == "CRISIS_SUICIDE":
        assistant_reply = "I am very concerned about you. You are not alone. Please reach out to these crisis lines immediately:\n\n**National Helpline: 14416**\n**Vandrevala Foundation: 9999 666 555**"
        widget_type = "crisis_resource"

    elif broad_intent == "CRISIS_PANIC":
        # Panic skips the "Activity" router for speed
        tag = TOOL_DEFINITIONS['activities']['breathing']['tag']
        assistant_reply = f"I am here with you. Let's focus on your breathing right now. Follow this animation."
        widget_type = "breathing"

    elif broad_intent == "MOOD_LOG":
        tag = TOOL_DEFINITIONS['mood_tracker']['tag']
        assistant_reply = f"Understood. Let's log how you are feeling right now."
        widget_type = "mood_tracker"

    # --- BRANCH B: ACTIVITIES (Sub-Router) ---
    elif broad_intent == "ROUTING_ACTIVITY":
        print("Routing Activity Sub-type...")
        specific_activity = classify_activity_type(user_message) # e.g. "stretch"
        
        # Verify it exists in definitions
        if specific_activity in TOOL_DEFINITIONS['activities']:
            tool_data = TOOL_DEFINITIONS['activities'][specific_activity]
            assistant_reply = f"That sounds like a good idea. Let's do it."
            widget_type = specific_activity
        else:
            # Fallback
            assistant_reply = "Here is a breathing exercise to help you center yourself."
            widget_type = "breathing"

    # --- BRANCH C: ASSESSMENTS (Sub-Router) ---
    elif broad_intent == "ROUTING_ASSESSMENT":
        print("Routing Assessment Sub-type...")
        specific_test = classify_assessment_type(user_message) # e.g. "anxiety"
        
        if specific_test in TOOL_DEFINITIONS['assess']:
            tool_data = TOOL_DEFINITIONS['assess'][specific_test]
            assistant_reply = f"Let's check in on your levels."
            widget_type = specific_test
        else:
            assistant_reply = "Let's check your stress levels."
            widget_type = "stress"

    # --- BRANCH D: GENERAL CHAT (RAG Flow) ---
    else:
        # 5. HISTORY RETRIEVAL
        chat_history = []
        if history_service:
            chat_history = history_service.get_history(chat_code, limit=20)

        # 6. RAG RETRIEVAL
        context_chunks = get_rag_chunks(user_message)
        
        # 7. CONSTRUCT PROMPT
        messages_for_llm = [
            {"role": "user" if m['sender_id'] == user_email else "assistant", "content": m['content']} 
            for m in chat_history
        ]
        rag_text = "\n\n".join(context_chunks)
        tool_instructions = get_tool_system_prompt()
        system_prompt = (
            "You are a supportive mental health assistant. Always base your reply on the following context if relevant.\n"
            f"Context:\n\n{rag_text}\n"
            f"{tool_instructions}"
        )
        final_messages = [{"role": "system", "content": system_prompt}] + messages_for_llm + [{"role": "user", "content": user_message}]

        # 8. GENERATE RESPONSE
        if USE_LOCAL_LLM:
             if local_bot.check_status():
                 assistant_reply = local_bot.generate_response_with_history(final_messages)
             else:
                 assistant_reply = groq_bot.generate_response_with_history(final_messages)
        else:
             assistant_reply = groq_bot.generate_response_with_history(final_messages)
        
        # 9. DETERMINE WIDGET (Final Check)
        # Even in general chat, the LLM might have decided to output a tag.
        widget_type = determine_widget_type(assistant_reply)


    # FINAL SAVE & RETURN
    
    # 1. Save the RAW response (with tags) to History
    # We keep tags in history so the LLM knows it previously used a tool
    if history_service:
        history_service.add_message(conversation_id=chat_code, sender_id=user_email, content=user_message)
        history_service.add_message(conversation_id=chat_code, sender_id="assistant", content=assistant_reply)
        
    # 2. Creating a CLEAN response (no tags) for the Frontend
    clean_reply = remove_tags_from_text(assistant_reply)

    # 3. Send the clean text + the widget type
    return jsonify({
        "response": clean_reply,   
        "reply": clean_reply,      
        "widget_type": widget_type
    }), 200

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
