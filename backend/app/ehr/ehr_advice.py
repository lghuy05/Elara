from app.database.models import User, UserFHIRMapping
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.schemas import (
    EnhancedAdviceOutWithReminders,
    SymptomInput,
    SymptomIntensityCreate,
)

from app.services.fhir_service import FHIRService
from app.services.triage_service import triage_rules
from app.services.llm_service import require_json_with_retry
from app.services.symptom_tracking_service import SymptomTrackingService
from app.services.rag_service import get_medical_context
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/ehr-advice", response_model=EnhancedAdviceOutWithReminders)
def enhanced_advice_with_ehr(
    inp: SymptomInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("📥 EHR_ADVICE RECEIVED INPUT:")
    print(f"  Symptoms: {inp.symptoms}")
    print(f"  Age: {inp.age}")
    print(f"  Sex: {inp.sex}")
    print(f"  Duration: {inp.duration}")
    print(f"  Meds: {inp.meds}")
    print(f"  Conditions: {inp.conditions}")

    mapping = (
        db.query(UserFHIRMapping)
        .filter(UserFHIRMapping.user_id == current_user.id)
        .first()
    )

    user = db.query(User).filter(User.id == current_user.id).first()

    if not mapping:
        mapping = UserFHIRMapping(user_id=current_user.id, fhir_patient_id="example")
        db.add(mapping)
        db.commit()
        print(f"Mapped user {current_user.id} to mock patient")

    ehr_data = FHIRService.get_patient_profile(mapping.fhir_patient_id, user.zipcode)

    # 2. Get medical context (synchronous - no await needed)
    try:
        medical_context = get_medical_context(inp.symptoms, min_results=1)
    except Exception as e:
        print(f"Medical context failed: {e}")
        medical_context = {"articles": []}

    # 3. Get EHR data for LLM context
    ehr_context = {
        "ehr_medications": [
            med["name"] for med in ehr_data.get("active_medications", [])[:3]
        ],
        "ehr_conditions": [
            cond["name"] for cond in ehr_data.get("medical_conditions", [])[:2]
        ],
        "ehr_age": ehr_data.get("age"),
        "ehr_gender": ehr_data.get("gender"),
        "source": "mock_ehr",
    }

    print(f"📋 Using REAL EHR data from patient: {ehr_data['name']}")

    system = (
        "You are a clinical decision support assistant. "
        "Consider the patient's existing conditions and medications from their EHR if available. "
        "Also consider the provided medical research context from PubMed when giving advice. "
        "Based on the symptoms described and available medical context, provide a POSSIBLE diagnosis with reasoning. "
        "Clearly state that this is a tentative assessment based on available information and may be incorrect. "
        "Additionally, analyze the symptom intensity and estimate duration based on the patient's description. "
        "Consider words like 'mild', 'moderate', 'severe', 'excruciating', 'unbearable', 'kinda', 'very', 'pretty', 'persistent', 'constant', 'intermittent' to determine intensity (1-10). "
        "Estimate duration in minutes based on time-related words like 'today','this morning','hours', 'days', 'weeks', 'constant', 'intermittent', 'few', 'several'. "
        "CRITICAL: You MUST return valid JSON with EXACTLY these fields:\n"
        "- possible_diagnosis: array of strings\n"
        "- diagnosis_reasoning: string\n"
        "- advice: array of objects with 'step' and 'details' strings\n"
        "- when_to_seek_care: array of strings\n"
        "- disclaimer: string\n"
        "- symptom_analysis: object with 'intensities' array and 'overall_severity' number\n\n"
        "IMPORTANT RULES FOR JSON FORMAT:\n"
        "1. Every field must be present, even if empty arrays/objects\n"
        "2. Do NOT include any fields not listed above\n\n"
        "Example of valid JSON format:\n"
        "{\n"
        '  "possible_diagnosis": ["Tension headache", "Migraine"],\n'
        '  "diagnosis_reasoning": "The throbbing head pain described as severe...",\n'
        '  "advice": [{"step": "Hydration", "details": "Small sips of water."}],\n'
        '  "when_to_seek_care": ["Trouble breathing", "Worsening headache"],\n'
        '  "disclaimer": "THIS IS NOT A DEFINITIVE DIAGNOSIS...",\n'
        '  "symptom_analysis": {\n'
        '    "intensities": [\n'
        '      {"symptom_name": "headache", "intensity": 7, "duration_minutes": 120, "notes": "Throbbing pain"}\n'
        "    ],\n"
        '    "overall_severity": 6\n'
        "  }\n"
        "}\n\n"
        "STRICTLY FOLLOW THIS JSON FORMAT. DO NOT DEVIATE."
    )
    ehr_text = ""
    if ehr_context and (
        ehr_context.get("ehr_medications") or ehr_context.get("ehr_conditions")
    ):
        ehr_text = (
            f"EHR MEDICAL HISTORY:\n"
            f"Current Medications: {', '.join(ehr_context.get('ehr_medications', []))}\n"
            f"Existing Conditions: {', '.join(ehr_context.get('ehr_conditions', []))}\n"
            f"EHR Age: {ehr_context.get('ehr_age', 'Not specified')}\n"
            f"EHR Gender: {ehr_context.get('ehr_gender', 'Not specified')}\n\n"
        )
    else:
        ehr_text = "No EHR data available for this patient.\n\n"

    research_text = ""
    if (
        medical_context
        and "articles" in medical_context
        and medical_context["articles"]
    ):
        research_text = "MEDICAL RESEARCH CONTEXT (from recent PubMed Studies):\n"
        for i, article in enumerate(medical_context["articles"][:1], 1):
            research_text += (
                f"{i}. {article['title']} ({article['year']}) - "
                f"Relevance: {article.get('relevance_score', 0):.2f}\n"
                f"Key findings: {article['content'][:100]}...\n\n"
            )
    else:
        research_text = "No recent medical research text available for these symptoms."

    user = (
        f"{ehr_text}"
        f"{research_text}"
        f"PATIENT-REPORTED INFORMATION:\n"
        f"Age: {inp.age}\n"
        f"Gender: {inp.sex}\n"
        f"Symptoms: {inp.symptoms}\n"
        f"Duration: {inp.duration}\n"
        f"Patient-Reported Meds: {inp.meds}\n"
        f"Patient-Reported Conditions: {inp.conditions}\n\n"
        f"ANALYZE SYMPTOM INTENSITY BASED ON THIS DESCRIPTION: {inp.symptoms}\n"
        f"ANALYZE DURATION BASED ON THIS: {inp.duration}\n\n"
        f"Provide personalized advice considering their complete medical history.\n"
        f"IMPORTANT: Generate realistic symptom_analysis based on the actual patient description."
    )

    print("🔍 PROMPT SENT TO LLM:")
    print(f"System: {system[:200]}...")
    print(f"User: {user[:500]}...")

    message = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    print("🤖 Generating medical advice with EHR context...")
    try:
        response = require_json_with_retry(
            message,
            max_tokens=900,
            defaults={
                "possible_diagnosis": [],
                "diagnosis_reasoning": "",
                "advice": [],
                "when_to_seek_care": [],
                "disclaimer": "This is not a diagnosis.",
                "symptom_analysis": {"intensities": [], "overall_severity": None},
            },
        )
    except Exception as e:
        print(f"❌ LLM analysis failed: {e}")
        response = {
            "possible_diagnosis": ["Unable to analyze - AI service issue"],
            "diagnosis_reasoning": "The AI analysis service did not return a valid response.",
            "advice": [
                {
                    "step": "Try again",
                    "details": "Please retry the analysis in a few moments.",
                }
            ],
            "when_to_seek_care": [
                "If symptoms worsen or you experience emergency symptoms"
            ],
            "disclaimer": "AI service temporarily unavailable",
            "symptom_analysis": {"intensities": [], "overall_severity": None},
        }

    print(f"🔍 LLM RESPONSE TYPE: {type(response)}")
    print(f"🔍 LLM RESPONSE CONTENT: {response}")

    if isinstance(response, str):
        print(f"❌ LLM failed to return JSON, got string: {response}")
        # Create a fallback response structure
        response = {
            "possible_diagnosis": ["Unable to analyze - AI service issue"],
            "diagnosis_reasoning": "The AI analysis service returned an invalid response format.",
            "advice": [
                {
                    "step": "Try again",
                    "details": "Please retry the analysis in a few moments.",
                }
            ],
            "when_to_seek_care": [
                "If symptoms worsen or you experience emergency symptoms"
            ],
            "disclaimer": "AI service temporarily unavailable",
            "symptom_analysis": {"intensities": [], "overall_severity": None},
        }
    elif "error" in response:
        print(f"❌ LLM returned error: {response}")
        # Convert error response to proper format
        response = {
            "possible_diagnosis": ["Service temporarily unavailable"],
            "diagnosis_reasoning": response.get("error", "AI service error"),
            "advice": [{"step": "Retry", "details": "Please try again later"}],
            "when_to_seek_care": ["Seek immediate care for emergency symptoms"],
            "disclaimer": "Analysis service issue",
            "symptom_analysis": {"intensities": [], "overall_severity": None},
        }

    response.setdefault("ai_reminder_suggestions", [])

    symptom_intensities_to_store = []

    if "symptom_analysis" in response and response["symptom_analysis"]:
        symptom_analysis = response["symptom_analysis"]
        symptom_intensities_to_store = symptom_analysis.get("intensities", [])
        print(
            f"📊 LLM provided {len(symptom_intensities_to_store)} symptom intensities"
        )
    else:
        # FALLBACK: Create basic symptom analysis if LLM didn't provide it
        print("⚠️ LLM did not provide symptom_analysis, creating fallback analysis")
        symptom_intensities_to_store = create_fallback_symptom_analysis(
            inp.symptoms, inp.duration
        )

    # Store each symptom intensity
    user_id = current_user.id

    stored_count = 0
    for intensity_data in symptom_intensities_to_store:
        # Validate the intensity data
        if (
            isinstance(intensity_data, dict)
            and "symptom_name" in intensity_data
            and "intensity" in intensity_data
        ):
            tracking_data = SymptomIntensityCreate(
                user_id=user_id,
                symptom_name=intensity_data["symptom_name"],
                intensity=intensity_data["intensity"],
                duration_minutes=intensity_data.get("duration_minutes", 0),
                notes=intensity_data.get("notes", "AI-analyzed from chat session"),
            )
            success = SymptomTrackingService.record_symptom_intensity(db, tracking_data)
            if success:
                stored_count += 1
                print(
                    f"✅ Stored: {intensity_data['symptom_name']} (intensity: {intensity_data['intensity']}/10)"
                )
        else:
            print(f"❌ Invalid intensity data format: {intensity_data}")

    print(f"📊 Recorded {stored_count} symptom intensities")

    # Return only the medical advice without healthcare recommendations
    return response


def create_fallback_symptom_analysis(symptoms: str, duration: str) -> list:
    """Create fallback symptom analysis when LLM doesn't provide it"""
    fallback_intensities = []

    # Simple keyword-based intensity estimation
    symptom_keywords = {
        "mild": 3,
        "kinda": 3,
        "slight": 3,
        "minor": 3,
        "moderate": 5,
        "medium": 5,
        "some": 5,
        "severe": 8,
        "very": 8,
        "pretty": 7,
        "bad": 7,
        "strong": 7,
        "excruciating": 10,
        "unbearable": 10,
        "worst": 10,
        "extreme": 9,
    }

    # Duration estimation
    duration_minutes = estimate_duration_minutes(duration)

    # Extract individual symptoms (simple approach)
    symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()]

    for symptom in symptom_list:
        # Default intensity
        base_intensity = 5

        # Adjust based on keywords in the symptom description
        symptom_lower = symptom.lower()
        for keyword, intensity in symptom_keywords.items():
            if keyword in symptom_lower:
                base_intensity = intensity
                break

        fallback_intensities.append(
            {
                "symptom_name": symptom.strip(),
                "intensity": base_intensity,
                "duration_minutes": duration_minutes,
                "notes": f"Fallback analysis based on: {symptom}",
            }
        )

    return fallback_intensities


def estimate_duration_minutes(duration: str) -> int:
    """Estimate duration in minutes from text description"""
    if not duration:
        return 60  # Default 1 hour

    duration_lower = duration.lower()

    if "minute" in duration_lower or "few min" in duration_lower:
        return 30
    elif "hour" in duration_lower:
        if "few" in duration_lower:
            return 180  # 3 hours
        elif "several" in duration_lower:
            return 360  # 6 hours
        else:
            # Extract number of hours
            import re

            numbers = re.findall(r"\d+", duration)
            if numbers:
                return int(numbers[0]) * 60
            return 120  # Default 2 hours
    elif "day" in duration_lower:
        if "few" in duration_lower:
            return 4320  # 3 days
        elif "several" in duration_lower:
            return 10080  # 7 days
        else:
            numbers = re.findall(r"\d+", duration)
            if numbers:
                return int(numbers[0]) * 1440  # minutes in a day
            return 1440  # Default 1 day
    elif "week" in duration_lower:
        return 10080  # 1 week
    else:
        return 60  # Default 1 hour
