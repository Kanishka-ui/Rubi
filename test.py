import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

print("Available Gemini models that support generateContent:")
print("=" * 60)
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"✓ {model.name}")
print("=" * 60)