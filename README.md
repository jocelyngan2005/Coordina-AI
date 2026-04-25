# Coordina AI

Autonomous AI Teammate & Workflow Orchestrator

Coordina AI is a stateful, multi-agent workflow system for student group projects. It ingests unstructured project inputs, reasons over them with Z.AI GLM, and turns them into structured execution plans, coordination actions, risk signals, and submission readiness reports.

## Deliverables 

* Product Requirement Document (PRD): 
* System Analysis Document (SAD): 
* Quality Assurance Testing Document (QATD): 
* Pitch Deck: 
* Demo Video: 

## Why it exists

Student collaboration usually breaks down because project information is scattered across briefs, rubrics, chat logs, meeting transcripts, and informal updates. Coordina AI addresses that fragmentation by acting as an intelligent workflow layer that can:

- interpret project requirements
- decompose goals into tasks and milestones
- assign roles and track accountability
- detect inactivity and deadline risk
- generate submission readiness outputs

GLM is the reasoning core. If you remove it, the system loses its ability to interpret requirements, plan work, and coordinate execution.

## Core Capabilities

- Ingests project briefs, rubrics, meeting transcripts, and chat logs
- Extracts structured goals and grading priorities
- Generates task plans, milestones, dependencies, and critical paths
- Assigns roles based on team context and activity signals
- Detects risks such as inactivity, ambiguity, and deadline pressure
- Produces submission readiness scores and final checklists
- Persists workflow state, activity history, and decision logs
- Streams workflow progress to the frontend in real time

## System Architecture

### Input Layer
Unstructured sources are parsed before they enter the reasoning pipeline.

- Project brief documents
- Rubrics and grading criteria
- Meeting transcripts
- Chat logs
- File submissions
- Progress updates

### GLM Reasoning Core
Z.AI GLM is the central intelligence layer responsible for:

- requirement interpretation
- multi-step reasoning
- task decomposition
- responsibility inference
- replanning when conditions change
- maintaining context across the project lifecycle

### Agent Layer
Coordina AI uses specialized agents instead of one generic assistant.

- Instruction Analysis Agent: extracts goals, ambiguities, and grading priorities
- Planning Agent: builds tasks, milestones, dependencies, and timeline data
- Coordination Agent: assigns roles and generates meeting agendas
- Risk Detection Agent: flags inactivity and deadline failure probability
- Submission Readiness Agent: checks rubric coverage and final readiness

### State and Orchestration
The workflow engine coordinates the full lifecycle and stores persistent project state, including:

- team activity history
- task completion state
- decision reasoning logs
- workflow evolution timeline

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy 2.x with async PostgreSQL
- Redis for workflow/session state
- Z.AI GLM as the reasoning engine
- Pydantic for validation
- pytest and pytest-asyncio for testing

### Frontend

- React 19
- Vite
- TypeScript
- React Router
- PDF and OCR support for document ingestion

## Repository Layout

```text
Coordina-AI/
├── README.md
├── validate_fixes.sh
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   ├── main.py
│   ├── requirements.txt
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base_agent.py
│   │   ├── coordination_agent.py
│   │   ├── instruction_analysis_agent.py
│   │   ├── planning_agent.py
│   │   ├── risk_detection_agent.py
│   │   └── submission_readiness_agent.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── agents.py
│   │   │   ├── analytics.py
│   │   │   ├── documents.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── teams.py
│   │   │   └── workflow.py
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── connection_manager.py
│   │       └── workflow_stream.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── exceptions.py
│   │   ├── logger.py
│   │   ├── redis.py
│   │   └── redis_client.py
│   ├── edge_cases/
│   │   ├── __init__.py
│   │   ├── ambiguity_resolver.py
│   │   ├── deadline_recovery.py
│   │   ├── inactivity_detector.py
│   │   └── missing_data_handler.py
│   ├── glm/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   ├── reasoning_engine.py
│   │   └── prompts/
│   │       ├── __init__.py
│   │       ├── base_system.txt
│   │       ├── coordination.txt
│   │       ├── instruction_analysis.txt
│   │       ├── planning.txt
│   │       ├── risk_detection.txt
│   │       └── submission_readiness.txt
│   ├── logs/
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── activity_tracker.py
│   │   └── decision_log.py
│   ├── migrations/
│   │   └── env.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── accountability_pair.py
│   │   ├── activity_event.py
│   │   ├── contribution_balance.py
│   │   ├── decision_log.py
│   │   ├── detected_risk.py
│   │   ├── document.py
│   │   ├── goal.py
│   │   ├── meeting_agenda.py
│   │   ├── member.py
│   │   ├── milestone.py
│   │   ├── project.py
│   │   ├── risk_report.py
│   │   ├── role_assignment.py
│   │   ├── rubric.py
│   │   ├── submission_checklist.py
│   │   ├── submission_report.py
│   │   ├── task.py
│   │   └── workflow_event.py
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   ├── event_bus.py
│   │   ├── state_manager.py
│   │   ├── task_router.py
│   │   └── workflow_engine.py
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── chat_logs_parser.py
│   │   ├── document_parser.py
│   │   ├── rubric_parser.py
│   │   └── transcript_parser.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── document.py
│   │   ├── member.py
│   │   ├── project.py
│   │   ├── task.py
│   │   └── workflow.py
│   ├── scripts/
│   │   └── smoke_test_glm.py
│   └── tests/
│       ├── conftest.py
│       ├── ai_output/
│       │   ├── test_ai_output.py
│       │   └── artifacts/
│       ├── fixtures/
│       │   └── mock_project_state.json
│       ├── integration/
│       │   ├── test_api_routes.py
│       │   ├── test_edge_cases_integration.py
│       │   ├── test_glm_reasoning.py
│       │   ├── test_pipeline_integration.py
│       │   └── test_workflow_engine.py
│       ├── performance/
│       │   └── ...
│       └── unit/
│           └── ...
└── coordina-ai/
    ├── public/
    └── src/
        ├── App.css
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── api/
        │   ├── client.ts
        │   ├── documents.ts
        │   ├── mappers.ts
        │   ├── projects.ts
        │   ├── tasks.ts
        │   ├── teams.ts
        │   ├── types.ts
        │   └── workflow.ts
        ├── assets/
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.tsx
        │   │   └── PageLayout.tsx
        │   └── ui/
        │       ├── Badge.tsx
        │       └── Button.tsx
        ├── data/
        │   └── mockData.ts
        ├── pages/
        │   ├── DashboardPage.tsx
        │   ├── NewProjectPage.tsx
        │   └── ProjectWorkspacePage.tsx
        ├── types/
        │   └── index.ts
        └── utils/
            └── text.ts
```

## Backend Overview

The backend is the orchestration layer. It exposes workflow and data APIs, runs all agents, stores project state, and streams workflow events.

Key areas:

- api/ - REST routes and WebSocket endpoints
- agents/ - specialized AI agents
- orchestrator/ - workflow engine, task router, event bus, state manager
- parsers/ - document, transcript, rubric, and chat log parsers
- edge_cases/ - ambiguity, inactivity, missing data, deadline recovery handlers
- memory/ - activity tracking and decision logging
- glm/ - GLM client, reasoning engine, and prompts
- models/ and schemas/ - persistence and request/response contracts

### Main Workflow Endpoints

- POST /api/workflow/{project_id}/analyse
- POST /api/workflow/{project_id}/plan
- POST /api/workflow/{project_id}/coordinate
- POST /api/workflow/{project_id}/risk-check
- POST /api/workflow/{project_id}/submission-check
- POST /api/workflow/{project_id}/run-pipeline
- GET /api/workflow/{project_id}/state
- GET /api/workflow/{project_id}/decisions
- GET /api/workflow/{project_id}/stream-pipeline

### Health and Docs

- Health check: http://localhost:8000/health
- OpenAPI docs: http://localhost:8000/docs

## Frontend Overview

The frontend is a project workspace and dashboard for interacting with the workflow engine. It provides pages for:

- creating projects
- viewing dashboards and workspace status
- inspecting risks and submission readiness
- following the agent pipeline

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis
- Z.AI API key

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create a backend .env file with at least:

```env
ZAI_API_KEY=your_key_here
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/coordina_ai
REDIS_URL=redis://localhost:6379/0
ZAI_API_BASE_URL=https://api.ilmu.ai/v1
ZAI_MODEL=ilmu-glm-5.1
APP_ENV=development
```

If you are using local Postgres and Redis with Docker:

```bash
docker run -d --name coordina-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
docker run -d --name coordina-redis -p 6379:6379 redis:7
```

Run the backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd coordina-ai
npm install
npm run dev
```

By default, the frontend runs on Vite’s development server and talks to the backend API.

## Testing

### Backend unit tests

```bash
cd backend
pytest tests/unit -v
```

### Backend integration tests

```bash
cd backend
pytest tests/integration -v
```

### AI output tests

These use the live GLM API and require ZAI_API_KEY.

```bash
cd backend
pytest tests/ai_output/test_ai_output.py -v -s
```

### Performance tests

These expect the backend to be running locally on port 8000.

```bash
cd backend
pytest tests/performance/test_response_time.py -v -s
```

## Supported Input Types

Coordina AI currently supports these document types:

- brief
- rubric
- meeting_transcript
- chat_logs

## Agent Pipeline

1. Interpret project requirements
2. Create an execution workflow
3. Allocate responsibilities
4. Monitor progress and detect risk
5. Replan when conditions change
6. Prepare submission output

## Competition Framing

This project is designed for AI Systems & Agentic Workflow Automation. The key contribution is not just task automation, but an AI teammate that reasons over project state and orchestrates execution over time.

## Notes

- The backend uses Redis-backed state and decision logging.
- Several tests rely on the live GLM API and can be skipped when ZAI_API_KEY is unavailable.
- The performance suite will fail fast if the backend server is not running.

