# app/services/conversational_ai_service.py
from app.services.llm_service import require_json_with_retry
from typing import List, Dict, Optional
import re


class ConversationalAIService:
    @staticmethod
    def analyze_conversation_for_medical_context(
        user_message: str, conversation_history: List[Dict]
    ) -> Dict:
        """
        Analyze if we have enough medical info to switch to analyzer mode.
        This is the BRAIN that decides when to switch modes.
        """
        system_prompt = """You are a medical conversation analyzer. Determine if we have enough information to provide medical advice.
        
        Look for:
        - Specific symptoms mentioned (headache, fever, pain, etc.)
        - Duration of symptoms (how long, when it started)
        - Severity descriptions (mild, severe, etc.)
        - Whether the user is directly asking for medical advice or analysis
        - Enough details to make a reasonable assessment
        
        Return JSON with:
        {
            "has_sufficient_info": boolean,
            "missing_info": list of strings (e.g., ["duration", "severity"]),
            "extracted_symptoms": string of all symptoms mentioned,
            "extracted_duration": string if duration mentioned,
            "should_offer_analysis": boolean (true if user seems to want medical advice),
            "confidence_score": number 0-1 (how confident we are in the assessment)
        }
        
        Only return valid JSON. Be conservative - only offer analysis when clearly appropriate."""

        # Build the conversation context for analysis
        conversation_text = "\n".join(
            [
                f"{msg['role']}: {msg['content']}"
                for msg in conversation_history[-8:]  # Last 8 messages for context
            ]
        )
        conversation_text += f"\nuser: {user_message}"

        message = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": conversation_text},
        ]

        return require_json_with_retry(message)

    @staticmethod
    def generate_conversational_response(
        user_message: str, conversation_history: List[Dict], context_data: Dict = None
    ) -> Dict:
        """
        Generate a conversational response that properly extracts medical info
        """
        system_prompt = """You are a medical assistant gathering information. Your goal is to:
        1. Extract key medical information (symptoms, duration, severity, medications, conditions)
        2. Ask clarifying questions when information is missing
        3. Determine when you have enough information to offer medical analysis
        4. Respond conversationally and empathetically

        Return JSON with:
        - response: string (the conversational reply)
        - update_context: object (any extracted medical info)
        - should_offer_analysis: boolean (true when you have enough info)

        Example:
        {
            "response": "I understand you're experiencing headache. How long has this been going on?",
            "update_context": {"symptoms": "headache"},
            "should_offer_analysis": false
        }
        """

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
            response = require_json_with_retry(messages)

            # Ensure response has the correct structure
            if isinstance(response, dict):
                return {
                    "response": response.get(
                        "response",
                        "I'm here to help. Could you tell me more about what you're experiencing?",
                    ),
                    "update_context": response.get("update_context", {}),
                    "should_offer_analysis": response.get(
                        "should_offer_analysis", False
                    ),
                }
            else:
                # Fallback if LLM doesn't return proper JSON
                return {
                    "response": "I'm here to help with your health concerns. Could you tell me more about what you're experiencing?",
                    "update_context": {},
                    "should_offer_analysis": False,
                }

        except Exception as e:
            print(f"❌ Conversational AI error: {e}")
            return {
                "response": "I'm here to help. Could you describe what you're feeling?",
                "update_context": {},
                "should_offer_analysis": False,
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

        return require_json_with_retry(message)  # Pass the function, not the list
