# app/routes/healthcare_recommendations.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, UserFHIRMapping
from app.services.fhir_service import FHIRService
from app.services.map_service import maps_service
from app.services.healthcare_analyzer import analyze_healthcare_needs
from app.services.auth_service import get_current_user
from app.schemas.schemas import (
    HealthcareRecommendationsRequest,
    HealthcareRecommendations,
)

router = APIRouter()


@router.post("/healthcare-recommendations", response_model=HealthcareRecommendations)
def get_healthcare_recommendations(
    request: HealthcareRecommendationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get healthcare provider recommendations based on symptoms and location
    """
    print(f"📍 HEALTHCARE_RECOMMENDATIONS RECEIVED:")
    print(f"  Symptoms: {request.symptoms}")
    print(f"  Specialty (optional): {request.specialty}")

    # Get user's EHR data for location
    mapping = (
        db.query(UserFHIRMapping)
        .filter(UserFHIRMapping.user_id == current_user.id)
        .first()
    )

    user = db.query(User).filter(User.id == current_user.id).first()

    if not mapping:
        raise HTTPException(404, "User EHR mapping not found")

    ehr_data = FHIRService.get_patient_profile(mapping.fhir_patient_id, user.zipcode)
    user_zipcode = ehr_data.get("zipcode")

    if not user_zipcode:
        raise HTTPException(404, "User location not available in EHR data")

    print(f"📍 User location from EHR: {user_zipcode}")

    # Analyze healthcare needs
    if request.specialty:
        # Use provided specialty if available
        healthcare_analysis = {
            "needed_specialty": request.specialty,
            "urgency": "routine",  # Default urgency
            "reasoning": f"User requested {request.specialty} specifically",
        }
    else:
        # Analyze based on symptoms
        healthcare_analysis = analyze_healthcare_needs(request.symptoms)

    needed_specialty = healthcare_analysis.get("needed_specialty", "primary_care")
    urgency = healthcare_analysis.get("urgency", "routine")

    print(f"🩺 Healthcare analysis: {needed_specialty} (urgency: {urgency})")
    print(
        f"   Reasoning: {healthcare_analysis.get('reasoning', 'No reasoning provided')}"
    )

    # Don't recommend for emergency situations
    if urgency == "emergency":
        raise HTTPException(
            400, "Emergency situation detected - please seek immediate care"
        )

    # Search for providers
    print(f"🔍 Searching for {needed_specialty} providers near {user_zipcode}...")
    providers = maps_service.get_providers_by_zipcode(
        zipcode=user_zipcode,
        specialty=needed_specialty,
        max_results=request.max_results or 5,
    )

    if not providers:
        raise HTTPException(
            404, f"No {needed_specialty} providers found near your location"
        )

    return HealthcareRecommendations(
        providers=providers,
        recommendation_reason=healthcare_analysis.get(
            "reasoning", f"Based on your symptoms, consider seeing a {needed_specialty}"
        ),
        provider_type=needed_specialty,
        user_location=user_zipcode,
    )
