from fastapi import APIRouter
from app.schemas.schemas import SymptomInput, RxDraftOut
from app.services.llm_service import require_json_with_retry

router = APIRouter()


@router.post("/rx_draft", response_model=RxDraftOut)
def route_rx(inp: SymptomInput):
    def build_messages():
        system = "Clinician-only medication class draft. No dosing. JSON ONLY."
        user = (
            f"Age: {inp.age}\nSymptoms: {inp.symptoms}\nMeds: {inp.meds}\n"
            f"Conditions: {inp.conditions}\nSchema example:\n"
            + '{"candidates":[{"drug_class":"Inhaled corticosteroid","example":"budesonide DPI","use_case":"Persistent asthma","contraindications":["hypersensitivity"],"monitoring":["symptom diary"]}],"notes":"Draft for clinician review—do not display to patient."}'
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    data = require_json_with_retry(
        build_messages,
        defaults={"candidates": [], "notes": ""},
    )
    return RxDraftOut(**data)
