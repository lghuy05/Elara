from fastapi import APIRouter
from app.schemas.schemas import SymptomInput, ReferralOut
from app.services.llm_service import require_json_with_retry

router = APIRouter()


@router.post("/referrals", response_model=ReferralOut)
def route_referrals(inp: SymptomInput):
    def build_messages():
        system = (
            "You assist clinicians by drafting specialist referrals. "
            "JSON ONLY; no patient instructions; no dosing."
        )
        user = (
            f"Age: {inp.age}\nSymptoms: {inp.symptoms}\n"
            f"Conditions: {inp.conditions}\nSchema example:\n"
            + '{"suggested_specialties":[{"name":"Pulmonology","reason":"Chronic cough"}],"pre_referral_workup":["Chest X-ray","Spirometry"],"priority":"routine"}'
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    data = require_json_with_retry(
        build_messages,
        defaults={
            "suggested_specialties": [],
            "pre_referral_workup": [],
            "priority": "routine",
        },
    )
    return ReferralOut(**data)
