from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
    ARRAY,
    Boolean,
    Time,
    Date,
    JSON,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
from datetime import time, datetime
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    age = Column(Integer)
    sex = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String, default="patient")
    zipcode = Column(String)
    chat_sessions = relationship("ChatSession", back_populates="user")
    fhir_mapping = relationship("UserFHIRMapping", back_populates="user", uselist=False)
    symptom_intensities = relationship("SymptomIntensity", back_populates="user")
    symptom_frequencies = relationship("SymptomFrequency", back_populates="user")


class UserFHIRMapping(Base):
    __tablename__ = "user_fhir_mapping"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    fhir_patient_id = Column(String, default="example", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to User
    user = relationship("User", back_populates="fhir_mapping")


class SymptomIntensity(Base):
    __tablename__ = "symptom_intensity"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symptom_name = Column(String(100), nullable=False)
    intensity = Column(Integer, nullable=False)  # 1-10 scale
    duration_minutes = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # CHANGED

    # Relationship to User
    user = relationship("User", back_populates="symptom_intensities")


class SymptomFrequency(Base):
    __tablename__ = "symptom_frequency"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symptom_name = Column(String(100), nullable=False)
    month_year = Column(DateTime, nullable=False)  # First day of month
    occurrence_count = Column(Integer, default=1)
    last_occurrence = Column(
        DateTime(timezone=True), server_default=func.now()
    )  # CHANGED

    # Relationship to User
    user = relationship("User", back_populates="symptom_frequencies")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    reminder_type = Column(String(50), default="custom")
    scheduled_time = Column(Time, nullable=False)
    scheduled_date = Column(Date)
    days_of_week = Column(PG_ARRAY(String(20)), default=[])
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(20), default="daily")
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    source = Column(String(50), default="manual")
    ai_suggestion_context = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    completed_at = Column(DateTime(timezone=True))


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.now)  # Tampa time
    updated_at = Column(DateTime, default=datetime.now)  # Tampa time
    is_active = Column(Boolean, default=True)
    context_data = Column(JSON)  # Store symptoms, meds, etc. as conversation progresses

    # Relationship
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String(20))  # 'user' or 'assistant'
    content = Column(Text)
    message_type = Column(
        String(20), default="text"
    )  # 'text', 'symptom', 'analysis_request'
    timestamp = Column(DateTime, default=datetime.now)  # Tampa time
    message_metadata = Column(JSON)  # Store any additional data like symptom details

    # Relationship
    session = relationship("ChatSession", back_populates="messages")
