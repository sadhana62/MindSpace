import os
from openai import OpenAI
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class OpenAIEngine:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.organization = os.getenv("ORGANIZATION")
        self.is_available = bool(self.api_key)
        self.client = OpenAI(api_key=self.api_key) if self.is_available else None
        self.model = "gpt-4o-mini" 
        
    def generate_response_with_history(self, messages: list):
        if not self.is_available or not self.client:
            return "I am currently having trouble connecting to the cloud server."
        try:
            print("Sending request to OpenAI with history...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages 
            )
            return self._cleanup(response.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI Error with history: {e}")
            return "I am currently having trouble connecting to the cloud server."

    def _cleanup(self, text):
        return text.replace("**", "")


class OpenRouterEngine:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.is_available = bool(self.api_key)
        self.client = (
            OpenAI(
                api_key=self.api_key,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),
                    "X-Title": "MindSpace",
                },
            )
            if self.is_available
            else None
        )
        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "meta-llama/llama-3.3-8b-instruct:free",
        )

    def generate_response_with_history(self, messages: list):
        if not self.is_available or not self.client:
            return "I am currently having trouble connecting to the AI server."
        try:
            print("Sending request to OpenRouter with history...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            return response.choices[0].message.content.replace("**", "")
        except Exception as e:
            print(f"OpenRouter Error with history: {e}")
            return "I am currently having trouble connecting to the cloud server."


class GroqEngine:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.is_available = bool(self.api_key)
        self.client = Groq(api_key=self.api_key) if self.is_available else None
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


    def generate_response_with_history(self, messages: list):
        if not self.is_available or not self.client:
            return "I'm having trouble connecting to the AI server. Please try again."
        try:
            print("Sending request to Groq (Llama 3) with history...")
            chat_completion = self.client.chat.completions.create(
                messages=messages, 
                model=self.model,
                temperature=0.5,
            )

            reply = chat_completion.choices[0].message.content
            reply = reply.replace("**", "")
            return reply

        except Exception as e:
            print(f"Groq Error with history: {e}")
            return "I'm having trouble connecting to the AI server. Please try again."
