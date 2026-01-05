# app/routes/chat.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json  # ADD THIS IMPORT
from app.database.database import get_db
from app.schemas.schemas import (
    ChatInput,
    ChatResponse,
    ChatSessionResponse,
    EnhancedAdviceOutWithReminders,
)
from app.services.chat_service import ChatService
from app.services.conversational_ai_service import ConversationalAIService
from app.services.auth_service import get_current_user
from app.database.models import User
from typing import List

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_input: ChatInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Main chat endpoint - handles both normal conversation and medical analysis offers
    """
    # Get or create session
    if chat_input.session_id:
        session = ChatService.get_session(db, chat_input.session_id, current_user.id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        # Create new session
        session = ChatService.create_session(db, current_user.id)

    # Get conversation history
    history_messages = ChatService.get_session_messages(db, session.id)
    conversation_history = [
        {"role": msg.role, "content": msg.content} for msg in history_messages
    ]

    # Save user message
    user_message = ChatService.add_message(db, session.id, "user", chat_input.message)

    conversational_response = ConversationalAIService.generate_conversational_response(
        chat_input.message, conversation_history, session.context_data or {}
    )

    # FIX: Handle both string and dictionary responses
    print(f"🔍 DEBUG: conversational_response type: {type(conversational_response)}")
    print(f"🔍 DEBUG: conversational_response content: {conversational_response}")

    if isinstance(conversational_response, str):
        try:
            # Try to parse as JSON
            conversational_response = json.loads(conversational_response)
            response_content = conversational_response.get(
                "response",
                "I'm here to help with your health concerns. Could you tell me more about what you're experiencing?",
            )
        except json.JSONDecodeError:
            # If it's not JSON, use the string directly
            response_content = conversational_response
    elif isinstance(conversational_response, dict):
        response_content = conversational_response.get(
            "response",
            "I'm here to help with your health concerns. Could you tell me more about what you're experiencing?",
        )
        should_offer_analysis = (
            conversational_response.get("should_offer_analysis", False)
            and conversational_response.get("has_sufficient_info", False)
            and conversational_response.get("confidence_score", 0) > 0.7
        )

        # Update session context if new medical info was extracted
        if conversational_response.get("update_context"):
            ChatService.update_session_context(
                db, session.id, conversational_response["update_context"]
            )

        # Also update context with extracted details for later use
        extracted_updates = {}
        if conversational_response.get("extracted_symptoms"):
            extracted_updates["symptoms"] = conversational_response["extracted_symptoms"]
        if conversational_response.get("extracted_duration"):
            extracted_updates["duration"] = conversational_response["extracted_duration"]
        if extracted_updates:
            ChatService.update_session_context(db, session.id, extracted_updates)
    else:
        # Fallback response
        response_content = "Hello! I'm here to help with your health concerns. How are you feeling today?"

    if should_offer_analysis:
        # OFFER ANALYSIS MODE
        response_content = (
            "Based on what you've told me, I can analyze your symptoms and provide medical guidance. "
            "This includes possible causes, self-care advice, and when to see a doctor. "
            "Would you like me to do that analysis for you?"
        )

    # Save assistant response
    assistant_message = ChatService.add_message(
        db, session.id, "assistant", response_content
    )

    return ChatResponse(
        session_id=session.id,
        message=assistant_message,
        requires_analysis=should_offer_analysis,
        analysis_prompt="Would you like me to analyze your symptoms and provide medical guidance?"
        if should_offer_analysis
        else None,
    )


@router.post(
    "/chat/{session_id}/analyze", response_model=EnhancedAdviceOutWithReminders
)
async def analyze_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Switch to medical analysis mode using all the conversation context
    This triggers your existing ehr_advice system with extracted data
    """
    # Verify session belongs to user
    session = ChatService.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all messages from this session
    messages = ChatService.get_session_messages(db, session_id, limit=100)
    conversation_history = [
        {"role": msg.role, "content": msg.content} for msg in messages
    ]

    # Prefer existing session context to avoid an extra LLM call when possible
    context_data = session.context_data or {}
    medical_context = {
        "symptoms": context_data.get("symptoms")
        or context_data.get("extracted_symptoms")
        or "",
        "duration": context_data.get("duration")
        or context_data.get("extracted_duration")
        or "",
        "medications": context_data.get("medications")
        or context_data.get("meds")
        or [],
        "conditions": context_data.get("conditions") or [],
        "age": context_data.get("age") or 30,
        "sex": context_data.get("sex"),
    }

    if not medical_context.get("symptoms"):
        # Fallback to full-conversation extraction if context is missing
        medical_context = (
            ConversationalAIService.extract_medical_context_from_conversation(
                conversation_history
            )
        )

    print(f"🩺 Extracted Medical Context: {medical_context}")

    # Use your existing ehr_advice logic but with conversation-extracted context
    from app.ehr.ehr_advice import enhanced_advice_with_ehr
    from app.schemas.schemas import SymptomInput

    # Create SymptomInput from extracted context
    symptom_input = SymptomInput(
        age=medical_context.get("age", 30),  # default age if not mentioned
        sex=medical_context.get("sex"),
        symptoms=medical_context.get("symptoms", ""),
        meds=medical_context.get("medications", []),
        conditions=medical_context.get("conditions", []),
        duration=medical_context.get("duration"),
    )
    # DEBUG: Print exactly what we're sending to EHR analysis
    print("🎯 SENDING TO EHR ANALYSIS:")
    print(f"  Age: {symptom_input.age}")
    print(f"  Sex: {symptom_input.sex}")
    print(f"  Symptoms: {symptom_input.symptoms}")
    print(f"  Medications: {symptom_input.meds}")
    print(f"  Conditions: {symptom_input.conditions}")
    print(f"  Duration: {symptom_input.duration}")

    # Add a message indicating we're switching to analysis mode
    ChatService.add_message(
        db,
        session_id,
        "assistant",
        "I'm now analyzing your symptoms with your medical history. Please wait a moment...",
        "analysis_request",
    )

    # Call your existing analysis function (this does triage, EHR lookup, LLM analysis, etc.)
    try:
        analysis_result_dict = enhanced_advice_with_ehr(symptom_input, db, current_user)
        analysis_result = EnhancedAdviceOutWithReminders(**analysis_result_dict)
        # Save the analysis result as a message
        analysis_summary = f"Analysis complete: {', '.join(analysis_result.possible_diagnosis) if analysis_result.possible_diagnosis else 'See recommendations'}"
        ChatService.add_message(
            db,
            session_id,
            "assistant",
            analysis_summary,
            "medical_advice",
            {"analysis_data": analysis_result.dict()},
        )

        return analysis_result
    except Exception as e:
        print(f"Analysis failed: {e}")
        ChatService.add_message(
            db,
            session_id,
            "assistant",
            "I apologize, but I'm having trouble analyzing your symptoms right now. Please try again later.",
            "error",
        )
        raise HTTPException(status_code=500, detail="Analysis failed")


@router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for the current user"""
    sessions = ChatService.get_user_sessions(db, current_user.id)
    return sessions


@router.get("/chat/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific chat session with all its messages"""
    session = ChatService.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get messages for this session
    messages = ChatService.get_session_messages(db, session_id)
    session.messages = messages

    return session


@router.get("/chat/debug-test")
async def debug_test(current_user: User = Depends(get_current_user)):
    """Debug endpoint to test authentication"""
    return {
        "message": "Debug endpoint working",
        "user_id": current_user.id,
        "username": current_user.username,
    }
