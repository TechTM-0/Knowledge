# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()

from google import genai

api_key = os.environ.get("GEMINI_API_KEY")
print("API Key:", api_key[:10] + "..." if api_key else "NOT SET")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="日本語で「テスト成功」と答えてください",
    )
    print("SUCCESS:", response.text)
except Exception as e:
    print("ERROR:", type(e).__name__, str(e))
