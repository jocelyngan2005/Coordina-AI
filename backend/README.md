# Coordina AI — Backend

Autonomous AI Teammate & Workflow Orchestrator  
**UMHackathon 2026 — AI Systems & Agentic Workflow Automation**

---

## Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI (async) |
| AI Reasoning | Z.AI GLM (central engine) |
| Database | PostgreSQL + SQLAlchemy (async) |
| State / Memory | Redis |
| Migrations | Alembic |
| Testing | pytest + pytest-asyncio |
| Frontend | React + Vite (separate repo) |

---

## Quick Start

```bash
# 1. Clone and install
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env — add your ZAI_API_KEY, DATABASE_URL, REDIS_URL

# 3. Start Postgres and Redis (Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
docker run -d -p 6379:6379 redis:7

# 4. Run migrations
alembic upgrade head

# 5. Start the server
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

## Architecture

```
Unstructured Inputs (PDF/DOCX/chat/transcript)
        │
        ▼
   [ Parsers ]  ──────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
[ InstructionAnalysisAgent ]  ← GLM Reasoning Engine      │
        │                                                  │
        ▼                                                  │
  [ PlanningAgent ]           ← GLM Reasoning Engine      │
        │                                                  │
        ▼                                                  │
[ CoordinationAgent ]         ← GLM Reasoning Engine      │
        │                                                  │
        ▼                                                  │
[ RiskDetectionAgent ]        ← GLM Reasoning Engine      │
        │                                                  │
        ▼                                                  │
[ SubmissionReadinessAgent ]  ← GLM Reasoning Engine      │
        │                                                  │
        ▼                                                  │
[ Structured Outputs ] ─── Dashboard / Reports / Alerts ◄─┘
        │
        ▼
[ WebSocket / SSE ] ──► React + Vite Frontend
```

---

## API Endpoints

### Workflow (core)
| Method | Path | Description |
|---|---|---|
| POST | `/api/workflow/{id}/analyse` | Parse brief/rubric → structured goals |
| POST | `/api/workflow/{id}/plan` | Goals → tasks + milestones |
| POST | `/api/workflow/{id}/coordinate` | Assign roles + meeting agenda |
| POST | `/api/workflow/{id}/risk-check` | Detect risks + trigger recovery |
| POST | `/api/workflow/{id}/submission-check` | Validate rubric coverage |
| POST | `/api/workflow/{id}/run-pipeline` | Run all stages in sequence |
| GET  | `/api/workflow/{id}/state` | Current project state |
| GET  | `/api/workflow/{id}/decisions` | GLM decision audit log |
| GET  | `/api/workflow/{id}/stream-pipeline` | SSE streaming pipeline |

### Projects / Tasks / Teams / Documents / Analytics
Standard CRUD + activity tracking. See `/docs` for full reference.

### WebSocket
```
ws://localhost:8000/ws/projects/{project_id}
```
Receive real-time workflow events as they are published by the orchestrator.

---

## Agents

| Agent | Responsibility |
|---|---|
| `InstructionAnalysisAgent` | Parses briefs, extracts goals, flags ambiguities |
| `PlanningAgent` | Decomposes goals into tasks + dependency graph |
| `CoordinationAgent` | Role assignment, workload balancing, meeting agendas |
| `RiskDetectionAgent` | Inactivity detection, deadline failure probability |
| `SubmissionReadinessAgent` | Rubric coverage validation, readiness score |

---

## Running Tests

```bash
pytest tests/ -v

# Unit tests only
pytest tests/unit/ -v

# Integration tests only
pytest tests/integration/ -v

# With coverage
pytest tests/ --cov=. --cov-report=term-missing
```

---

## Edge Cases Handled

| Scenario | Handler |
|---|---|
| Ambiguous requirements | `edge_cases/ambiguity_resolver.py` |
| Missing deadline / rubric | `edge_cases/missing_data_handler.py` |
| Inactive team member | `edge_cases/inactivity_detector.py` |
| Deadline failure risk | `edge_cases/deadline_recovery.py` |

---

## Project Structure

```
coordina-ai-backend/
├── main.py                     FastAPI app entry point
├── core/                       Config, DB, Redis, logging, exceptions
├── glm/                        Z.AI GLM client + reasoning engine + prompts
├── agents/                     5 specialised autonomous agents
├── orchestrator/               Workflow engine, task router, state manager, event bus
├── memory/                     Decision log, activity tracker, session store
├── api/                        REST routes + WebSocket stream
├── services/                   Business logic layer
├── models/                     SQLAlchemy ORM models
├── schemas/                    Pydantic request/response schemas
├── parsers/                    PDF/DOCX/transcript/chat text extraction
├── edge_cases/                 Ambiguity, missing data, inactivity, deadline recovery
├── migrations/                 Alembic migrations
└── tests/                      Unit + integration test suite
```