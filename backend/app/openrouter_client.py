# ------------------------------------------------------
# Step 1: Load environment variables from .env file
# ------------------------------------------------------
# We use the python-dotenv package to automatically load
# variables like OPENROUTER_API_KEY, APP_REFERER, etc.
# from your local .env file into os.environ.
# This makes development and local testing much easier.
import requests
import os
from dotenv import load_dotenv

load_dotenv()  # so local runs pick up .env

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY or not OPENROUTER_API_KEY.startswith("sk-or-"):
    raise RuntimeError("OPENROUTER_API_KEY missing or malformed.")


# ------------------------------------------------------
# Step 2: Import standard libraries and dependencies
# ------------------------------------------------------
# os → access environment variables
# requests → send HTTP requests to the OpenRouter API

# ------------------------------------------------------
# Step 3: Read the required API variables from environment
# ------------------------------------------------------
# These should all be set in your .env file (or docker-compose env_file)
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
APP_REFERER = os.getenv("APP_REFERER", "http://localhost:8000")
APP_TITLE = os.getenv("APP_TITLE", "AI Doctor App")
OPENROUTER_FAST_MODEL = os.getenv(
    "OPENROUTER_FAST_MODEL", "meta-llama/llama-3.3-70b-instruct:free"
)

# ------------------------------------------------------
# Step 4: Safety check — verify API key exists and is valid
# ------------------------------------------------------
# This helps catch missing or invalid keys early on startup.

# ------------------------------------------------------
# Step 5: Define the chat_completion function
# ------------------------------------------------------
# This function sends a POST request to OpenRouter's chat endpoint.
# It uses your LLM model (e.g. meta-llama/llama-3.3-70b-instruct:free)
# and returns the model’s response text.


def extract_medical_keywords(symptoms_text: str) -> list[str] | None:
    prompt = f"""
    Extract the key medical symptoms and conditions from this patient description.
    Return ONLY a comma-separated LIST of medical terms. Be concise and clinical.
    The result should be a list that contains string datatype.

    PATIENT DESCRIPTION:
    "{symptoms_text}"

    MEDICAL KEYWORDS:
    """
    try:
        response = chat_completion(
            [
                {
                    "role": "system",
                    "content": "You are a medical transcription assistant. Extract only medical symptoms and conditions.",
                },
                {"role": "user", "content": prompt},
            ],
            model=OPENROUTER_FAST_MODEL,
            temperature=0.0,
        )
        keywords = response.strip()
        if "\n" in keywords:
            keywords = keywords.split("\n")[0]
        keywords = keywords.split(",")
        return keywords
    except Exception as e:
        print(f"LLM extraction failed: {e}")
        return None


def chat_completion(
    messages,
    model="meta-llama/llama-3.3-70b-instruct:free",
    *,
    max_tokens=400,
    temperature=0.5,
    timeout=60,
):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": APP_REFERER,
        "X-Title": APP_TITLE,
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    # Make the POST request to the API
    r = requests.post(
        f"{OPENROUTER_BASE}/chat/completions",
        json=payload,
        headers=headers,
        timeout=timeout,
    )
    if not r.ok:
        # If unauthorized or server error, print details
        raise RuntimeError(f"OpenRouter API error {r.status_code}: {r.text[:500]}")

    # Return the model’s text output
    data = r.json()
    return data["choices"][0]["message"]["content"]
