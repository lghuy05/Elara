# app/services/conversational_ai_service.py
from app.services.llm_service import require_json_with_retry
from app.openrouter_client import OPENROUTER_FAST_MODEL
from typing import List, Dict


class ConversationalAIService:
    @staticmethod
    def generate_conversational_response(
        user_message: str, conversation_history: List[Dict], context_data: Dict = None
    ) -> Dict:
        """
        Generate a conversational response and decide if analysis should be offered
        """
        system_prompt = """You are a medical assistant gathering information. Your goals:
        1) Extract key medical information (symptoms, duration, severity, medications, conditions)
        2) Ask clarifying questions when information is missing
        3) Decide if you have enough info to offer medical analysis
        4) Respond conversationally and empathetically

        Return JSON with EXACT fields:
        {
          "response": string,
          "update_context": object,
          "has_sufficient_info": boolean,
          "missing_info": list of strings,
          "extracted_symptoms": string,
          "extracted_duration": string,
          "should_offer_analysis": boolean,
          "confidence_score": number 0-1
        }

        Be conservative: only set should_offer_analysis when sufficient info is present
        and the user is clearly asking for medical advice or analysis."""

        user_context = f"Current conversation:\n"
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            user_context += f"{msg['role']}: {msg['content']}\n"

        user_context += f"\nUser's latest message: {user_message}"

        if context_data:
            user_context += f"\nKnown context: {context_data}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_context},
        ]

        try:
            response = require_json_with_retry(
                messages,
                model=OPENROUTER_FAST_MODEL,
                max_tokens=350,
                defaults={
                    "response": "I'm here to help. Could you tell me more about what you're experiencing?",
                    "update_context": {},
                    "has_sufficient_info": False,
                    "missing_info": [],
                    "extracted_symptoms": "",
                    "extracted_duration": "",
                    "should_offer_analysis": False,
                    "confidence_score": 0,
                },
            )

            # Ensure response has the correct structure
            if isinstance(response, dict):
                return response
            else:
                # Fallback if LLM doesn't return proper JSON
                return {
                    "response": "I'm here to help with your health concerns. Could you tell me more about what you're experiencing?",
                    "update_context": {},
                    "has_sufficient_info": False,
                    "missing_info": [],
                    "extracted_symptoms": "",
                    "extracted_duration": "",
                    "should_offer_analysis": False,
                    "confidence_score": 0,
                }

        except Exception as e:
            print(f"❌ Conversational AI error: {e}")
            return {
                "response": "I'm here to help. Could you describe what you're feeling?",
                "update_context": {},
                "has_sufficient_info": False,
                "missing_info": [],
                "extracted_symptoms": "",
                "extracted_duration": "",
                "should_offer_analysis": False,
                "confidence_score": 0,
            }

    @staticmethod
    def extract_medical_context_from_conversation(
        conversation_history: List[Dict],
    ) -> Dict:
        """
        Extract structured medical info from conversation when switching to analyzer mode.
        This prepares data for your existing ehr_advice system.
        """
        system_prompt = """Extract medical information from this conversation and structure it for medical analysis.
        
        Return JSON with:
        {
            "symptoms": string of all symptoms mentioned,
            "duration": string describing duration if mentioned,
            "medications": list of medications mentioned,
            "conditions": list of medical conditions mentioned,
            "age": number if mentioned, else 30,
            "sex": string if mentioned, else null
        }
        
        Only include information that was explicitly mentioned in the conversation."""

        conversation_text = "\n".join(
            [f"{msg['role']}: {msg['content']}" for msg in conversation_history]
        )
        message = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": conversation_text},
        ]

        return require_json_with_retry(
            message,
            model=OPENROUTER_FAST_MODEL,
            max_tokens=350,
            defaults={
                "symptoms": "",
                "duration": "",
                "medications": [],
                "conditions": [],
                "age": 30,
                "sex": None,
            },
        )
