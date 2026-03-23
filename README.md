# Elara

An AI-powered mobile health companion built as a first full-stack end-to-end project.

Elara started from a simple problem: health information is everywhere, but turning symptoms, personal history, medical research, and nearby care options into one usable experience is hard. This project was my attempt to build that experience myself. As a freshman in my first semester, I wanted one project that forced me to learn the full stack for real: mobile frontend, backend APIs, databases, authentication, LLM integration, vector search, retrieval-augmented generation, external healthcare/location APIs, and product thinking.

This project is where my interest in the field really emerged. I implemented JWT auth from scratch, built a FastAPI backend, connected an Expo/React Native mobile app, integrated an LLM API, used a vector database for RAG, stored chat session context/history, pulled patient context from FHIR-style EHR data, and used Google Maps APIs to recommend nearby healthcare providers. It was honestly an insane amount to build for a first-semester project, and I learned a lot by doing it end to end.

## Demo

![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/1.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/2.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/3.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/4.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/5.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/6.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/7.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/8.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/13.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/10.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/14.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/11.png)
![img alt](https://github.com/lghuy05/Elara/blob/552e3217928c63c10e2f8532fde9e3a2abbdcf54/img/12.png)

## The Problem

Most health apps do one thing well and ignore the rest.

- Symptom checkers are usually generic and stateless.
- Chatbots often ignore a patient’s history and medications.
- Medical information online is hard to trust and hard to personalize.
- Care discovery is separate from symptom understanding.
- Reminder apps do not connect to the actual health journey.

I wanted to build a system that feels more like a real assistant:

- talk to the user naturally
- gather enough context before analysis
- use medical history when possible
- retrieve relevant research context
- remember the conversation
- log symptom trends over time
- suggest reminders
- help the user find nearby care

## My Approach

Instead of building just a chatbot, I designed Elara as a small healthcare support system with multiple connected layers:

- a mobile frontend for the user experience
- a FastAPI backend for business logic and orchestration
- PostgreSQL for users, reminders, symptom tracking, and chat sessions
- JWT-based auth built manually to understand secure session flows
- an LLM pipeline for conversational intake and structured medical guidance
- Pinecone vector retrieval for medical research context
- FHIR integration for patient profile, medications, and conditions
- Google Maps integration for nearby provider recommendations

The goal was not to replace clinicians. The goal was to build a strong technical system that could combine context, retrieval, personalization, and usability into one end-to-end product.

## Project Story

This is the first project where I really stopped thinking in isolated assignments and started thinking in systems.

I had to figure out:

- how frontend state should map to backend session state
- how to protect routes with JWT and persist auth on mobile
- how to turn messy natural language into structured medical context
- how to make LLM output reliable enough by forcing JSON and repairing malformed responses
- how to attach retrieved knowledge to generated answers
- how to store symptom intensity so analytics screens can visualize real history
- how to bridge profile data, AI analysis, reminders, and provider search into one product flow

A lot of the value of this project came from wrestling with those integration points. That was where I learned the most.

## What Elara Can Do

### 1. Conversational AI intake

The user can describe symptoms naturally in chat. The system gathers context over multiple turns instead of immediately jumping to conclusions.

### 2. Structured symptom analysis

Once enough information is available, Elara can transition from conversation mode into analysis mode and return:

- possible diagnoses
- reasoning
- symptom severity estimates
- care guidance
- when to seek care
- disclaimer messaging

### 3. Chat context and session history

Chat sessions are persisted in the database. The backend stores message history and session context so later analysis can use what the user already said.

### 4. EHR-aware responses

The backend maps users to FHIR patient data and includes medications, conditions, age, and demographic context in analysis.

### 5. RAG with vector search

Medical context is retrieved from a Pinecone vector index before final advice is generated, so responses can be grounded in relevant research context instead of being pure generation.

### 6. Symptom analytics

Symptom intensity and frequency are stored and exposed through analytics endpoints, then visualized in the mobile app with charts.

### 7. Smart reminders

Users can create and manage medication or appointment reminders directly in the app.

### 8. Healthcare provider recommendations

Given a user’s symptoms and location context, the app can recommend nearby providers and open Maps, websites, or phone calls directly from the UI.

## System Overview

```text
Mobile App (Expo / React Native)
        |
        v
FastAPI Backend
        |
        |-- JWT auth + protected routes
        |-- Chat session orchestration
        |-- LLM conversational extraction
        |-- EHR/FHIR profile lookup
        |-- RAG retrieval from Pinecone
        |-- Symptom tracking + analytics
        |-- Reminder management
        |-- Google Maps provider search
        |
        v
PostgreSQL + External APIs
```

## Architecture, System-Wise

### Frontend

The frontend is an Expo/React Native app using Expo Router for navigation and Zustand for state management.

Major frontend flows:

- auth flow with token persistence
- drawer-based navigation for the main product areas
- chat UI for conversational intake and analysis results
- analytics dashboard with symptom trend charts
- reminder CRUD workflow
- profile screen backed by patient/EHR data
- healthcare locator with provider cards and deep links

Key frontend ideas:

- auth token is stored locally and attached to API calls
- chat state persists through Zustand
- patient profile is cached in state
- analytics auto-refreshes after medical analysis updates

### Backend

The backend is a FastAPI app that acts as the orchestration layer for the whole system.

It handles:

- user registration and login
- password hashing with Argon2 via Passlib
- JWT creation and verification
- protected route middleware
- chat session storage
- conversation-to-analysis transitions
- EHR/FHIR data access
- LLM prompting and JSON enforcement
- symptom analytics aggregation
- reminder endpoints
- provider recommendation endpoints

### Database

The SQLAlchemy models show that PostgreSQL is used for:

- users
- user-to-FHIR patient mappings
- symptom intensity records
- symptom frequency records
- reminders
- chat sessions
- chat messages

This is important because the app is not just generating responses. It is persisting state across auth, analytics, reminders, and conversational history.

## Core Technical Highlights

### JWT auth from scratch

One of the biggest learning moments in this project was implementing authentication myself.

The backend:

- hashes passwords with Argon2
- creates signed JWTs
- verifies expiry and payload
- resolves the current authenticated user
- protects non-public endpoints with middleware and dependency injection

The frontend:

- stores the token locally
- injects it into Axios requests
- redirects back to login if the token is invalid or expired

### LLM integration

The project uses OpenRouter as the LLM gateway. The backend prompts the model for structured JSON, then validates and repairs malformed outputs when needed.

That let me move beyond a basic chatbot and build flows like:

- extract symptoms/duration from natural conversation
- decide whether enough context exists for analysis
- transform conversation into structured medical context
- generate richer advice with EHR and retrieval context attached

### Vector DB + RAG

Elara uses Pinecone as the vector database for medical knowledge retrieval.

The flow is:

1. user symptoms are turned into a retrieval query
2. relevant medical content is fetched from the vector index
3. retrieved articles are formatted into prompt context
4. the final medical guidance is generated with that context included

This is one of the parts that made the project feel genuinely end to end to me: I was not only calling an LLM, I was building the retrieval layer around it.

### Chat context history

The backend stores chat sessions and messages in the database. Session context is updated as the conversation progresses, including extracted symptoms and duration when available.

That means the system can:

- keep multi-turn context
- analyze later using earlier user messages
- avoid treating every prompt as a brand-new conversation

### FHIR / EHR integration

The backend can fetch patient information from a FHIR server and fall back to mock data when needed. The profile includes:

- patient demographics
- medications
- conditions
- contact information

That context is then fed into the medical analysis pipeline, which makes the app feel more personalized and system-oriented than a simple symptom checker.

### Google Maps API integration

The project uses Google APIs to:

- geocode location from zipcode
- search nearby healthcare providers
- enrich provider data with ratings, website, phone, and maps links

This closes the loop between advice and action. The app is not just telling the user what might be happening; it also helps them find where to go next.

## End-to-End User Flow

### Auth

1. User registers with username, email, password, age, sex, role, and zipcode.
2. Backend creates the user, hashes the password, and returns a JWT.
3. User logs in and the mobile app stores the token.

### Profile context

1. App fetches the mapped patient profile.
2. Backend resolves FHIR patient data and returns medications and conditions.
3. Frontend caches the result for later use in chat and profile screens.

### Chat and analysis

1. User sends a symptom message.
2. Backend creates or reuses a chat session.
3. Conversation history is loaded from the database.
4. LLM extracts context and decides whether analysis should be triggered.
5. If analysis runs, the backend combines:
   - patient-reported symptoms
   - session context/history
   - FHIR/EHR profile data
   - retrieved medical context from Pinecone
6. The response is returned as structured guidance.
7. Symptom intensity is stored for analytics.

### Analytics

1. Stored symptom intensity/frequency data is aggregated in backend routes.
2. Frontend renders charts for symptom trends and summary metrics.

### Care locator

1. User describes the kind of care they need.
2. Backend analyzes specialty need and user location.
3. Google Places data is fetched and enriched.
4. App displays providers with links to Maps, websites, and phone calls.

## Tech Stack

### Frontend

- React Native
- Expo
- Expo Router
- TypeScript
- Zustand
- Axios
- react-native-gifted-charts

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- Gunicorn
- Passlib + Argon2
- python-jose

### Data and Infra

- PostgreSQL
- Pinecone
- ChromaDB files in the repo for local vector storage experiments

### External APIs

- OpenRouter
- FHIR server
- Google Maps / Places API

## Repository Structure

```text
Elara/
├── frontend/          # Expo / React Native mobile app
├── backend/           # FastAPI backend
├── img/               # Demo screenshots
├── chroma_storage/    # Local vector storage artifacts
└── README.md
```

## Important Backend Routes

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/verify`

### Chat and AI

- `POST /chat`
- `POST /chat/{session_id}/analyze`
- `GET /chat/sessions`
- `GET /chat/sessions/{session_id}`

### Patient / EHR

- `GET /patient/profile/me`
- `GET /patient/profile/{patient_id}`
- `GET /patient/discover`

### Analytics

- `GET /analytics/symptom-intensity`
- `GET /analytics/symptom-frequency`
- `GET /analytics/symptom-summary`

### Reminders

- `GET /reminders`
- `POST /reminders`
- `PUT /reminders/{reminder_id}`
- `DELETE /reminders/{reminder_id}`

### Care recommendations

- `POST /healthcare-recommendations`

## Local Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd Elara
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file for the backend with values for the environment variables used in code:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/doctorchatbot
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE=https://openrouter.ai/api/v1
OPENROUTER_FAST_MODEL=meta-llama/llama-3.3-70b-instruct:free
APP_REFERER=http://localhost:8000
APP_TITLE=AI Doctor App

PINECONE_API_KEY=your-pinecone-key
PINECONE_QUERY_TIMEOUT=8

FHIR_BASE_URL=https://hapi.fhir.org/baseR4
GOOGLE_MAP_API=your-google-maps-key
ALLOWED_ORIGINS=*
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

The frontend is currently configured to call the deployed backend URL in `frontend/api/client.ts` and the auth screens. For local-only development, change that base URL to your local backend.

## Deployment Notes

From the codebase:

- frontend is intended for Expo / React Native
- backend is structured to run cleanly on FastAPI with Uvicorn or Gunicorn
- current code references a deployed Render backend URL from the mobile app

## What I Learned

This project taught me much more than syntax.

- how to design and connect a full client-server system
- how auth actually works in a real app
- how difficult reliability is once LLMs enter the stack
- how retrieval and prompt design change output quality
- how state, persistence, and session design affect UX
- how external APIs fail and why fallbacks matter
- how much product thinking matters alongside engineering

More than anything, this project made the field feel real to me. It took AI, backend engineering, mobile development, data flow, and systems design from abstract ideas into something I had to make work together.

## Why This Project Matters To Me

Elara is not just a class project I finished and moved on from. It is the project that made me realize how much I enjoy building systems that combine software engineering with intelligent behavior. It pushed me into areas I had never touched before and gave me a reason to learn deeply, not just enough to submit something.

For a first-semester freshman project, this was intentionally ambitious. I wanted to see how far I could go if I treated learning like building. This repo is the result of that.

## Future Directions

If I continue this project, the next areas I would improve are:

- stronger medical safety guardrails
- better evaluation for RAG quality
- improved session/history UX
- notification delivery for reminders
- clinician-facing views
- cleaner environment/config handling
- more robust tests across frontend and backend

## Disclaimer

Elara is an educational software project and not a licensed medical device or a substitute for professional medical care. Any guidance produced by the app should be treated as informational only.
