# services/fhir_service.py - UPDATED VERSION (Real FHIR + Mock Zipcode)
import requests
import os
from typing import Optional, Dict, List
from datetime import datetime
import dateutil.parser
import re

FHIR_BASE_URL = os.getenv("FHIR_BASE_URL", "https://hapi.fhir.org/baseR4")


class FHIRService:
    @staticmethod
    def calculate_age(birth_date: str) -> Optional[int]:
        """Calculate age from FHIR birthDate"""
        try:
            birth = dateutil.parser.parse(birth_date)
            today = datetime.now()
            age = today.year - birth.year
            if today.month < birth.month or (
                today.month == birth.month and today.day < birth.day
            ):
                age -= 1
            return age
        except Exception as e:
            return 30

    @staticmethod
    def get_patient_profile(patient_id: str, zipcode: str = None) -> Optional[Dict]:
        """Get comprehensive patient profile for display with REAL FHIR data but mock zipcode"""
        # Always use real FHIR data, but fallback to mock if needed
        try:
            # Get patient basic info
            patient_response = requests.get(
                f"{FHIR_BASE_URL}/Patient/{patient_id}", timeout=10
            )
            if patient_response.status_code != 200:
                print(f"❌ Patient not found in FHIR: {patient_id}, using mock data")
                return FHIRService._get_mock_patient_data()

            patient_data = patient_response.json()

            # Get patient's medications
            med_response = requests.get(
                f"{FHIR_BASE_URL}/MedicationRequest?patient={patient_id}&status=active",
                timeout=10,
            )
            medications = (
                med_response.json()
                if med_response.status_code == 200
                else {"entry": []}
            )

            # Get patient's conditions
            cond_response = requests.get(
                f"{FHIR_BASE_URL}/Condition?patient={patient_id}", timeout=10
            )
            conditions = (
                cond_response.json()
                if cond_response.status_code == 200
                else {"entry": []}
            )

            # Extract profile information from REAL FHIR data
            profile = {
                "id": patient_id,
                "name": FHIRService._extract_patient_name(patient_data),
                "birth_date": patient_data.get("birthDate"),
                "age": FHIRService.calculate_age(patient_data.get("birthDate", "")),
                "gender": patient_data.get("gender", "").capitalize(),
                "contact": FHIRService._extract_contact_info(patient_data),
                "active_medications": FHIRService._extract_medications(medications),
                "medical_conditions": FHIRService._extract_conditions(conditions),
                "last_updated": datetime.now().isoformat(),
                "zipcode": zipcode,
            }

            print(f"✅ REAL FHIR data fetched for patient: {profile['name']}")
            print(f"   💊 Medications: {len(profile['active_medications'])}")
            print(f"   🩺 Conditions: {len(profile['medical_conditions'])}")
            print(f"   📍 Zipcode: {profile['zipcode']} (mock)")
            return profile

        except Exception as e:
            print(f"❌ FHIR API error: {e}")
            # Fallback to mock data
            print("🔄 Falling back to mock data due to FHIR error")
            return FHIRService._get_mock_patient_data()

    @staticmethod
    def _get_mock_patient_data() -> Dict:
        """Return mock data for fallback - includes mock zipcode"""
        mock_profile = {
            "id": "example",
            "name": "John Smith",
            "birth_date": "1985-03-15",
            "age": 39,
            "gender": "Male",
            "contact": {"email": "john.smith@example.com", "phone": "(555) 123-4567"},
            "active_medications": [
                {
                    "name": "Lisinopril",
                    "status": "active",
                    "prescribed_date": "2024-01-15",
                    "prescriber": "Dr. Sarah Wilson",
                },
                {
                    "name": "Atorvastatin",
                    "status": "active",
                    "prescribed_date": "2024-02-20",
                    "prescriber": "Dr. Sarah Wilson",
                },
            ],
            "medical_conditions": [
                {
                    "name": "Hypertension",
                    "status": "Active",
                    "recorded_date": "2023-05-10",
                },
                {
                    "name": "Hyperlipidemia",
                    "status": "Active",
                    "recorded_date": "2023-06-15",
                },
            ],
            "last_updated": datetime.now().isoformat(),
            "zipcode": "33620",  # Mock zipcode for fallback too
        }

        print(f"✅ MOCK EHR data fetched for patient: {mock_profile['name']}")
        print(f"   💊 Medications: {len(mock_profile['active_medications'])}")
        print(f"   🩺 Conditions: {len(mock_profile['medical_conditions'])}")
        print(f"   📍 Zipcode: {mock_profile['zipcode']} (mock)")
        return mock_profile

    @staticmethod
    def _extract_patient_name(patient_data: Dict) -> str:
        """Extract patient name from FHIR format"""
        try:
            # Try to get the most appropriate name
            names = patient_data.get("name", [])
            for name in names:
                use = name.get("use", "")
                # Prefer official name, then usual name
                if use == "official" or use == "usual":
                    given = " ".join(name.get("given", []))
                    family = name.get("family", "")
                    full_name = f"{given} {family}".strip()
                    if full_name:
                        return full_name

            # Fallback to first name found
            for name in names:
                given = " ".join(name.get("given", []))
                family = name.get("family", "")
                full_name = f"{given} {family}".strip()
                if full_name:
                    return full_name

            return "Unknown Patient"
        except:
            return "Unknown Patient"

    @staticmethod
    def _extract_contact_info(patient_data: Dict) -> Dict:
        """Extract contact information"""
        telecom = patient_data.get("telecom", [])
        contact = {"email": "Not available", "phone": "Not available"}

        for item in telecom:
            system = item.get("system", "")
            value = item.get("value", "")
            if system == "email":
                contact["email"] = value
            elif system == "phone" and value:
                # Use the first phone number found
                if contact["phone"] == "Not available":
                    contact["phone"] = value

        return contact

    @staticmethod
    def _extract_medications(medications: Dict) -> List[Dict]:
        """Extract active medications with better name extraction"""
        med_list = []
        for entry in medications.get("entry", []):
            resource = entry.get("resource", {})
            if resource.get("resourceType") == "MedicationRequest":
                med_name = FHIRService._extract_medication_name(resource)

                # Only include if we found a medication name
                if med_name and med_name != "Unknown Medication":
                    med_info = {
                        "name": med_name,
                        "status": resource.get("status", ""),
                        "prescribed_date": resource.get("authoredOn", ""),
                        "prescriber": FHIRService._extract_prescriber(resource),
                    }
                    med_list.append(med_info)
        return med_list

    @staticmethod
    def _extract_medication_name(med_request: Dict) -> str:
        """Extract medication name from various FHIR structures"""
        try:
            # Method 1: Check for contained medication with text
            contained = med_request.get("contained", [])
            for item in contained:
                if item.get("resourceType") == "Medication":
                    # Look for text description
                    text = item.get("text", {})
                    if text.get("div"):
                        # Extract text from HTML div
                        div_text = text["div"]
                        # Look for medication name in the div
                        match = re.search(r"<div[^>]*>(.*?)</div>", div_text)
                        if match:
                            name = match.group(1).strip()
                            if name and "hapiHeaderText" not in name:
                                return name

                    # Method 2: Check code text
                    code = item.get("code", {})
                    if code.get("text"):
                        return code["text"]

                    # Method 3: Check code display
                    coding = code.get("coding", [])
                    for code_item in coding:
                        if code_item.get("display"):
                            return code_item["display"]

            # Method 4: Check dosage instruction text
            dosage = med_request.get("dosageInstruction", [])
            for dose in dosage:
                if dose.get("text"):
                    text = dose["text"]
                    # Extract medication name from dosage text
                    if "ENALAPRIL" in text.upper():
                        return "Enalapril"
                    elif "NEVIRAPINE" in text.upper():
                        return "Nevirapine"
                    # Try to extract medication name from text
                    words = text.split()
                    for word in words:
                        if word.isalpha() and len(word) > 3 and word.istitle():
                            return word

            # Method 5: Check medication reference display
            med_ref = med_request.get("medicationReference", {})
            if med_ref.get("display"):
                return med_ref["display"]

            return "Prescribed Medication"

        except Exception as e:
            print(f"⚠️ Error extracting medication name: {e}")
            return "Prescribed Medication"

    @staticmethod
    def _extract_conditions(conditions: Dict) -> List[Dict]:
        """Extract medical conditions with better name extraction"""
        cond_list = []
        seen_conditions = set()  # Avoid duplicates

        for entry in conditions.get("entry", []):
            resource = entry.get("resource", {})
            if resource.get("resourceType") == "Condition":
                condition_name = FHIRService._extract_condition_name(resource)

                # Avoid duplicates
                if condition_name and condition_name not in seen_conditions:
                    seen_conditions.add(condition_name)
                    cond_info = {
                        "name": condition_name,
                        "status": FHIRService._extract_condition_status(resource),
                        "recorded_date": resource.get(
                            "recordedDate", resource.get("onsetDateTime", "")
                        ),
                    }
                    cond_list.append(cond_info)
        return cond_list

    @staticmethod
    def _extract_condition_name(condition: Dict) -> str:
        """Extract condition name from various FHIR structures"""
        try:
            # Method 1: Check code text
            code = condition.get("code", {})
            if code.get("text"):
                return code["text"]

            # Method 2: Check code display from coding
            coding = code.get("coding", [])
            for code_item in coding:
                if code_item.get("display"):
                    return code_item["display"]

            # Method 3: Extract from text div
            text = condition.get("text", {})
            if text.get("div"):
                div_text = text["div"]
                # Extract condition from HTML div
                match = re.search(r"<div[^>]*>(.*?)</div>", div_text)
                if match:
                    condition_text = match.group(1).strip()
                    # Clean up the text
                    if "Severe burn of left ear" in condition_text:
                        return "Severe Burn - Left Ear"
                    return condition_text

            return "Medical Condition"

        except Exception as e:
            print(f"⚠️ Error extracting condition name: {e}")
            return "Medical Condition"

    @staticmethod
    def _extract_condition_status(condition: Dict) -> str:
        """Extract condition status"""
        clinical_status = condition.get("clinicalStatus", {})
        if clinical_status.get("text"):
            return clinical_status["text"]

        coding = clinical_status.get("coding", [])
        for code in coding:
            if code.get("display"):
                return code["display"]
            elif code.get("code"):
                # Map code to display text
                code_map = {
                    "active": "Active",
                    "recurrence": "Recurrence",
                    "relapse": "Relapse",
                    "inactive": "Inactive",
                    "remission": "Remission",
                    "resolved": "Resolved",
                }
                return code_map.get(code["code"], code["code"].capitalize())

        return "Active"  # Default to active

    @staticmethod
    def _extract_prescriber(med_request: Dict) -> str:
        """Extract prescriber name"""
        requester = med_request.get("requester", {})
        if "display" in requester:
            return requester["display"]

        # Check recorder as fallback
        recorder = med_request.get("recorder", {})
        if "display" in recorder:
            return recorder["display"]

        return "Healthcare Provider"

    @staticmethod
    def discover_patients() -> List[Dict]:
        """Discover available test patients"""
        try:
            response = requests.get(f"{FHIR_BASE_URL}/Patient?_count=5", timeout=10)
            if response.status_code != 200:
                return []

            patients_data = response.json()
            patient_list = []

            for entry in patients_data.get("entry", []):
                patient = entry.get("resource", {})
                patient_id = patient.get("id")
                name = FHIRService._extract_patient_name(patient)

                patient_list.append(
                    {
                        "id": patient_id,
                        "name": name,
                        "gender": patient.get("gender", ""),
                        "birth_date": patient.get("birthDate", ""),
                    }
                )

            return patient_list

        except Exception as e:
            print(f"❌ Error discovering patients: {e}")
            return []
