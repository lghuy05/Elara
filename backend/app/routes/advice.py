from fastapi import APIRouter, HTTPException
from app.schemas.schemas import SymptomInput, AdviceOut
from app.services.triage_service import triage_rules
from app.services.llm_service import require_json_with_retry, PATIENT_RX_BLOCK

router = APIRouter()


@router.post("/advice", response_model=AdviceOut)
def route_advice(inp: SymptomInput):
    # First check for emergencies using triage
    triage = triage_rules(inp.symptoms)
    if triage.risk == "emergency":
        raise HTTPException(400, "Possible emergency. Call emergency services now.")

    def build_messages():
        system = (
            "You are a clinical decision support assistant for patients. "
            "NEVER diagnose. NEVER provide medication names/doses to patients. "
            "Return JSON ONLY with keys: advice[], when_to_seek_care[], disclaimer."
        )
        user = (
            f"Age: {inp.age}\nSex: {inp.sex}\nSymptoms: {inp.symptoms}\n"
            f"Duration: {inp.duration}\nMeds: {inp.meds}\n"
            f"Conditions: {inp.conditions}\nSchema example:\n"
            + '{"advice":[{"step":"Hydration","details":"Small sips of water."}],"when_to_seek_care":["Trouble breathing"],"disclaimer":"This is not a diagnosis."}'
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    data = require_json_with_retry(
        build_messages,
        defaults={
            "advice": [],
            "when_to_seek_care": [],
            "disclaimer": "This is not a diagnosis.",
        },
    )

    # Post-filter: block dosing in patient-facing advice
    full = " ".join(
        f"{x.get('step', '')} {x.get('details', '')}" for x in data.get("advice", [])
    )
    if PATIENT_RX_BLOCK.search(full):
        raise HTTPException(400, "Medication instructions to patients are not allowed.")

    return AdviceOut(**data)
