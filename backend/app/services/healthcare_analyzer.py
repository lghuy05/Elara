# Create new file: app/services/healthcare_analyzer.py
from app.services.llm_service import require_json_with_retry
from app.openrouter_client import OPENROUTER_FAST_MODEL


def analyze_healthcare_needs(symptoms: str) -> dict:
    """
    Use LLM to determine what type of healthcare provider is needed
    """
    prompt = [
        {
            "role": "system",
            "content": """You are a medical triage specialist. Analyze symptoms and determine the most appropriate healthcare provider type.
                CRITICAL: Return ONLY valid JSON with EXACTLY these fields:
                - needed_specialty: string (specific medical specialty)
                - urgency: string ("emergency", "urgent", "routine") 
                - reasoning: string (brief clinical explanation)
                COMMON SPECIALTIES:
                - dentist (tooth pain, gum issues, dental problems)
                - ophthalmologist (eye pain, vision issues, eye problems)  
                - cardiologist (chest pain, heart palpitations, cardiac issues)
                - dermatologist (skin rash, acne, skin conditions)
                - orthopedist (bone pain, joint pain, fractures)
                - neurologist (headache, migraine, nerve pain, seizures)
                - gastroenterologist (stomach pain, digestive issues, nausea)
                - psychiatrist (anxiety, depression, mental health)
                - primary_care (general symptoms, cold, flu, non-specific)
                URGENCY GUIDELINES:
                - emergency: chest pain, difficulty breathing, severe bleeding, stroke symptoms
                - urgent: severe pain, high fever, worsening symptoms  
                - routine: mild symptoms, chronic conditions, follow-up care
                EXAMPLE RESPONSES:
                {"needed_specialty": "dentist", "urgency": "urgent", "reasoning": "Severe tooth pain with swelling suggests dental abscess"}
                {"needed_specialty": "ophthalmologist", "urgency": "routine", "reasoning": "Blurry vision may indicate need for eye exam"}
                {"needed_specialty": "primary_care", "urgency": "routine", "reasoning": "General cold symptoms can be managed by primary care"}
                STRICTLY FOLLOW THIS JSON FORMAT. DO NOT INCLUDE ANY OTHER FIELDS.""",
        },
        {"role": "user", "content": f"Symptoms: {symptoms}"},
    ]

    try:
        response = require_json_with_retry(
            prompt,
            model=OPENROUTER_FAST_MODEL,
            defaults={
                "needed_specialty": "primary_care",
                "urgency": "routine",
                "reasoning": "General symptoms.",
            },
        )
        return response
    except Exception as e:
        print(f"❌ LLM healthcare analysis failed: {e}")
        return {
            "needed_specialty": "hospital",
            "urgency": "routine",
            "reasoning": "general treatment",
        }
