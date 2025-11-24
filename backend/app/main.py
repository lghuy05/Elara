# app/main.py - FIXED VERSION
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import text
from app.database.database import engine, Base
from app.routes import triage, advice, referrals, rx_draft, auth, patient_profile, chat
from app.services.auth_service import verify_token_service
from dotenv import load_dotenv


load_dotenv()

# try:
#     Base.metadata.create_all(bind=engine)
# except Exception as e:
#     print(f"❌ Error creating tables: {e}")
app = FastAPI(title="AI Doctor Backend (OpenRouter)")
#
# EHR Configuration
EHR_ENABLED = True
FHIR_BASE_URL = os.getenv("FHIR_BASE_URL", "https://hapi.fhir.org/baseR4")

print(f" EHR Integration: {'ENABLED' if EHR_ENABLED else 'DISABLED'}")
print(f" FHIR Server: {FHIR_BASE_URL}")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add to main.py for debugging
@app.middleware("http")
async def debug_auth(request: Request, call_next):
    auth_header = request.headers.get("Authorization")
    if auth_header:
        print(f"🔐 Token present for: {request.url.path}")
    else:
        print(f"🔓 No token for: {request.url.path}")

    response = await call_next(request)
    return response


@app.middleware("http")
async def authenticate_request(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    # Skip auth for these public endpoints
    public_paths = [
        "/auth/login",
        "/auth/register",
        "/auth/verify",
        "/health",
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/favicon.ico",
        "/patient/discover",
        # "/patient/profile",
        # "/patient/medications",
        # "/ehr-advice",
        "/triage",
        # "/analytics",
    ]

    # Check if path starts with any public path
    if any(request.url.path.startswith(path) for path in public_paths):
        return await call_next(request)

    # Check for Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header.replace("Bearer ", "")
    payload = verify_token_service(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    print(f"🔐 Auth: Valid token for user {payload.get('sub')} - {request.url.path}")

    response = await call_next(request)
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(">>", request.method, request.url.path)
    try:
        resp = await call_next(request)
        print("<<", resp.status_code, request.url.path)
        return resp
    except Exception as e:
        print("!!", request.url.path, repr(e))
        raise


# Include base routers
app.include_router(auth.router)
app.include_router(triage.router)
app.include_router(advice.router)
app.include_router(referrals.router)
app.include_router(rx_draft.router)

# Conditionally include EHR routers
if EHR_ENABLED:
    try:
        from app.routes.patient_profile import router as patient_profile_router
        from app.ehr.ehr_advice import router as ehr_advice_router

        app.include_router(ehr_advice_router)
        app.include_router(patient_profile_router)
        print("✅ EHR routes registered: /ehr-advice, /patient/profile")
    except ImportError as e:
        print(f"Failed to import EHR: {e}")

analytics_succeed = False
try:
    from app.routes.analytics import router as analytics_router

    app.include_router(analytics_router)
    print("✅ Analytics routes registered")
    analytics_succeed = True
except ImportError as e:
    print(f"Analytics routes not available: {e}")

try:
    from app.routes.reminders import router as reminders_router

    app.include_router(reminders_router)
    print("✅ Reminder routes registered")
except ImportError as e:
    print(f"Reminder routes not available: {e}")

try:
    from app.routes.chat import router as chat_router

    app.include_router(chat_router)
except ImportError as e:
    print(f"Chat not available: {e}")

# app/main.py - Add the new router
try:
    from app.routes.healthcare_recommendations import router as healthcare_router

    app.include_router(healthcare_router)
    print("✅ Healthcare recommendation routes registered")
except ImportError as e:
    print(f"Healthcare recommendation routes not available: {e}")


@app.get("/")
async def root():
    ehr_status = "enabled" if EHR_ENABLED else "disabled"
    return {
        "message": "AI Doctor Chatbot API is running!",
        "status": "healthy",
        "ehr_integration": ehr_status,
        "fhir_server": FHIR_BASE_URL if EHR_ENABLED else "none",
        "analytics": analytics_succeed if analytics_succeed else "none",
    }


@app.get("/health")
async def health():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            db_test = result.scalar()

        health_info = {
            "status": "healthy",
            "database": "connected",
            "service": "AI Doctor Chatbot API",
            "database_test": db_test,
            "ehr_integration": "enabled" if EHR_ENABLED else "disabled",
        }

        if EHR_ENABLED:
            health_info["fhir_server"] = FHIR_BASE_URL

        return health_info

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "ehr_integration": "enabled" if EHR_ENABLED else "disabled",
                "error": str(e),
            },
        )
