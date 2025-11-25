# ------------------------------------------------------
# Step 1: Import Pydantic BaseModel and typing helpers
# ------------------------------------------------------
from pydantic import BaseModel, Field, EmailStr
from typing import List, Literal, Optional, Dict

# from app.database.database import Base
from datetime import datetime, date, time
# from decimal import Decimal

# ------------------------------------------------------
# Step 2: Define the request model the app expects from the client
# ------------------------------------------------------


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    age: int
    sex: str
    role: str = Field(..., description="User role: patient or clinician")
    zipcode: str


class UserLogin(BaseModel):
    username_or_email: EmailStr
    password: str


class TokenVerificationRequest(BaseModel):
    token: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    age: int
    sex: str
    role: str

    class Config:
        from_attributes = True


class SymptomInput(BaseModel):
    age: int = Field(..., ge=0, description="Patient age in years")
    sex: Optional[str] = Field(None, description="Optional: male/female/other")
    symptoms: str = Field(..., description="Free text symptom description")
    meds: List[str] = Field(default_factory=list, description="Current medications")
    conditions: List[str] = Field(default_factory=list, description="Known conditions")
    duration: Optional[str] = Field(None, description="e.g., '2 days'")
    patient_id: Optional[str] = None
    latitude: Optional[float] = Field(None, description="user location latitude")
    longitude: Optional[float] = Field(None, description="user location longitude")


# ------------------------------------------------------
# Step 3: Define the triage response model
# ------------------------------------------------------


class TriageOut(BaseModel):
    risk: Literal["emergency", "routine"]
    next_step: Literal["call_emergency", "self_care"]
    red_flags: List[str]
    disclaimer: str


# ------------------------------------------------------
# Step 4: Define the advice response model
# ------------------------------------------------------


class AdviceStep(BaseModel):
    step: str
    details: str
    research_basis: Optional[str] = None


class AdviceOut(BaseModel):
    advice: List[AdviceStep] = []
    when_to_seek_care: List[str] = []
    disclaimer: str
    research_references: List[str] = []


# ------------------------------------------------------
# Step 5: Define the referral response model (clinician-facing)
# ------------------------------------------------------


class ReferralSpecialty(BaseModel):
    name: str
    reason: str


class ReferralOut(BaseModel):
    suggested_specialties: List[ReferralSpecialty] = []
    pre_referral_workup: List[str] = []
    priority: Literal["routine", "expedited", "urgent"] = "routine"


# ------------------------------------------------------
# Step 6: Define the Rx-draft response model (clinician-facing)
# ------------------------------------------------------


class RxCandidate(BaseModel):
    drug_class: str
    example: str
    use_case: str
    contraindications: List[str] = []
    monitoring: List[str] = []


class RxDraftOut(BaseModel):
    candidates: List[RxCandidate] = []
    notes: str = ""


class SymptomIntensity(BaseModel):
    symptom_name: str
    intensity: int = Field(ge=1, le=10)
    duration_minutes: Optional[int] = Field(default=0, ge=0)
    notes: Optional[str] = None


class SymptomAnalysis(BaseModel):
    intensities: List[SymptomIntensity]
    overall_severity: Optional[float] = Field(ge=0, le=10, default=None)


class EnhancedAdviceOut(BaseModel):
    possible_diagnosis: List[str] = Field(default_factory=list)
    diagnosis_reasoning: Optional[str] = None
    advice: List[Dict[str, str]]
    when_to_seek_care: List[str]
    disclaimer: str
    symptom_analysis: Optional[SymptomAnalysis] = None


# Request schemas for incoming data
class SymptomIntensityCreate(BaseModel):
    user_id: int
    symptom_name: str = Field(..., max_length=100)
    intensity: int = Field(..., ge=1, le=10)
    duration_minutes: Optional[int] = Field(default=0, ge=0)
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class SymptomFrequencyUpdate(BaseModel):
    user_id: int
    symptom_name: str = Field(..., max_length=100)
    month_year: date
    occurrence_count: int = Field(..., ge=1)
    last_occurrence: datetime


# Response schemas for database results
class SymptomIntensityResponse(BaseModel):
    id: int
    user_id: int
    symptom_name: str
    intensity: int
    duration_minutes: Optional[int]
    notes: Optional[str]
    reported_at: datetime

    class Config:
        from_attributes = True


class SymptomFrequencyResponse(BaseModel):
    user_id: int
    symptom_name: str
    month_year: date
    occurrence_count: int
    last_occurrence: datetime

    class Config:
        from_attributes = True


# Analytics response schemas
class SymptomIntensityAnalytics(BaseModel):
    symptom_name: str
    date: date
    daily_avg_intensity: float
    daily_occurrences: int
    avg_duration: float


class SymptomFrequencyAnalytics(BaseModel):
    symptom_name: str
    total_occurrences: int
    last_occurrence: datetime


class RecentSymptomResponse(BaseModel):
    symptom_name: str
    intensity: int
    duration_minutes: Optional[int]
    notes: Optional[str]
    reported_at: datetime


class ReminderBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    reminder_type: str = Field(
        default="custom", description="medication, exercise, appointment, custom"
    )
    scheduled_time: time
    scheduled_date: Optional[date] = None
    days_of_week: List[str] = Field(default_factory=list)
    is_recurring: bool = False
    recurrence_pattern: str = Field(
        default="daily", description="daily, weekly, monthly"
    )
    is_active: bool = True


class ReminderCreate(ReminderBase):
    source: str = Field(default="manual", description="manual, ai_suggestion")
    ai_suggestion_context: Optional[str] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_time: Optional[time] = None
    scheduled_date: Optional[date] = None
    days_of_week: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None


class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    source: str
    ai_suggestion_context: Optional[str]
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AIReminderSuggestion(BaseModel):
    reminder_title: str
    reminder_description: Optional[str] = None
    suggested_time: Optional[str] = None  # e.g., "08:00", "after_meal", "morning"
    suggested_frequency: Optional[str] = None  # e.g., "daily", "weekly", "once"
    priority: Literal["low", "medium", "high"] = "medium"


class HealthcareProvider(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    total_ratings: Optional[int] = None
    open_now: Optional[bool] = None
    distance_km: Optional[float] = None
    place_id: str
    types: List[str] = []
    google_maps_url: str


class HealthcareRecommendations(BaseModel):
    providers: List[HealthcareProvider]
    recommendation_reason: str
    provider_type: str


class EnhancedAdviceOutWithReminders(EnhancedAdviceOut):
    ai_reminder_suggestions: List[AIReminderSuggestion] = []


class ChatMessageBase(BaseModel):
    role: str
    content: str
    message_type: str = "text"
    message_metadata: Optional[Dict] = None


class ChatMessageCreate(ChatMessageBase):
    session_id: int


class ChatMessageResponse(ChatMessageBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatSessionBase(BaseModel):
    user_id: int
    context_data: Optional[Dict] = None


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionResponse(ChatSessionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


class ChatInput(BaseModel):
    message: str
    session_id: Optional[int] = None  # None for new sessions


class ChatResponse(BaseModel):
    session_id: int
    message: ChatMessageResponse
    requires_analysis: bool = False
    analysis_prompt: Optional[str] = None


class HealthcareRecommendationsRequest(BaseModel):
    symptoms: str
    specialty: Optional[str] = None
    max_results: Optional[int] = 5


class HealthcareRecommendations(BaseModel):
    providers: List[HealthcareProvider]
    recommendation_reason: str
    provider_type: str
    user_location: str
