# Coordina AI

Autonomous AI Teammate & Workflow Orchestrator

Coordina AI is a stateful, multi-agent workflow system for student group projects. It ingests unstructured project inputs, reasons over them with Gemini AI, and turns them into structured execution plans, coordination actions, risk signals, and submission readiness reports.

## Deliverables for Finals  

* Pitch Deck: https://drive.google.com/file/d/1vQ1GI4-tDEv86JDkWxlCQtDJd2jeaUcv/view?usp=sharing
* Refined QATD: https://drive.google.com/file/d/1k-BhqFRAS3cOC40AVFSL-QRKsRndnIcb/view?usp=sharing 
* Deployment PLan: https://drive.google.com/file/d/1xkZRfLc0FDckuJojEDrkecwbXtabG0Xt/view?usp=sharing 
* Business Proposal: https://drive.google.com/file/d/1g8v5oGDfaejGL9Csgjh7aH1YF6L2GjMO/view?usp=drive_link 

## Why it exists

Student collaboration usually breaks down because project information is scattered across briefs, rubrics, chat logs, meeting transcripts, and informal updates. Coordina AI addresses that fragmentation by acting as an intelligent workflow layer that can:

- interpret project requirements
- decompose goals into tasks and milestones
- assign roles and track accountability
- detect inactivity and deadline risk
- generate submission readiness outputs

GLM is the reasoning core. If you remove it, the system loses its ability to interpret requirements, plan work, and coordinate execution.

## Target Users 

### Primary Users

- University students on group assignments.
- Hackathon teams working under tight deadlines.
- Team leads managing deliverables and timelines.

### Secondary Users

- Instructors reviewing team collaboration quality.
- Research teams managing multi-phase projects.

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

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐    │
│   │   Project    │  │  Task        │  │  Risk Panel   │  │  Decision   │    │
│   │  Dashboard   │  │  Checklist   │  │  & Health     │  │  Audit Log  │    │
│   └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  └────────┬────┘    │
│          └─────────────────┴──────────┬───────┘                   │         │
│                                       │  REST + WebSocket         │         │
└───────────────────────────────────────┼───────────────────────────┼─────────┘
                                        │                           │
                    ┌───────────────────▼───────────────────────────▼──────────┐
                    │                 API LAYER (FastAPI)                      │
                    │                                                          │
                    │  /api/projects   /api/tasks    /api/teams                │
                    │  /api/documents  /api/workflow /api/analytics            │
                    │  /api/agents     ws:/projects/{id}  GET /stream-pipeline │
                    └───────────────────────────────┬──────────────────────────┘
                                                    │
                    ┌───────────────────────────────▼──────────────────────────┐
                    │                 ORCHESTRATION ENGINE                     │
                    │                                                          │
                    │   WorkflowEngine ──► TaskRouter ──► StateManager         │
                    │         │                                │               │
                    │         └──────────► EventBus ◄──────────┘               │
                    └────────────────────────┬─────────────────────────────────┘
                                             │  dispatches to
                       ┌─────────────────────┼─────────────────────────────────┐
                       │                     │  AGENT LAYER                    │
                       │                     │                                 │
                       │   ┌─────────────────▼──────────────────────────────┐  │
                       │   │              BaseAgent (abstract)              │  │
                       │   └─────┬──────┬──────┬──────┬──────┬──────────────┘  │
                       │         │      │      │      │      │                 │
                       │      ┌──▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼───┐             │
                       │      │ A1  │ │ A2 │ │ A3 │ │ A4 │ │ A5  │             │
                       │      │Inst │ │Plan│ │Cord│ │Risk│ │Subm │             │
                       │      └──┬──┘ └─┬──┘ └┬───┘ └┬───┘ └┬────┘             │
                       │         └──────┴─────┴──────┴──────┘                  │
                       │                       │  every agent calls            │
                       └───────────────────────┼───────────────────────────────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────────┐
                    │              GLM REASONING ENGINE                       │
                    │                                                         │
                    │   ReasoningEngine                                       │
                    │     ├── load_prompt(template)  ← prompts/*.txt          │
                    │     ├── inject context (project state + history)        │
                    │     ├── call GLMClient ──► Z.AI API (GLM-4)             │
                    │     ├── parse + validate JSON response                  │
                    │     └── raise GLMReasoningError on failure              │
                    └─────────────────────────────────────────────────────────┘
                                 │                           │
         ┌───────────────────────▼──────┐    ┌───────────────▼───────────────┐
         │         REDIS (live state)   │    │     POSTGRESQL (persistent)   │
         │                              │    │                               │
         │  project:state:{id}          │    │  projects   members           │
         │    workflow_stage            │    │  tasks      documents         │
         │    structured_goals          │    │  decision_logs                │
         │    tasks, milestones         │    │  workflow_events              │
         │    role_assignments          │    │  ...                          │
         │    last_risk_report          │    │  Alembic migrations           │
         │    TTL: 30 days              │    │  SQLAlchemy ORM               │
         │                              │    └───────────────────────────────┘
         │  project:decisions:{id}      │
         │    agent decision audit log  │
         │    capped at 200 entries     │
         │                              │
         │  project:activity:{id}       │
         │    member activity events    │
         │    capped at 500 entries     │
         │                              │
         │  coordina:events:{id}        │
         │    pub/sub channel           │
         │    WebSocket bridge          │
         └──────────────────────────────┘
```

---

### Workflow Pipeline (5 Stages)

```
  User uploads brief/rubric
           │
           ▼
  ┌─────────────────────┐
  │  PARSERS            │  PDF → PyPDF2
  │  document_parser    │  DOCX → python-docx
  │  rubric_parser      │  TXT → decode UTF-8
  │  transcript_parser  │  Chat → speaker turns
  └────────┬────────────┘
           │ extracted_text
           ▼
  ┌─────────────────────┐
  │  STAGE 1 — ANALYSE  │  InstructionAnalysisAgent
  │                     │  Input:  document_text, document_type,
  │                     │          project_id
  │  GLM extracts:      │  Output: structured_goals [ ]
  │  • Goals            │          rubric_criteria [ ]
  │  • Rubric weights   │          ambiguities [ ]
  │  • Ambiguities      │          confidence_score
  │  • Implicit expects │          escalation_required
  │                     │          escalation_reason (if low confidence)
  └────────┬────────────┘
           │ saves to project:state
           ▼
  ┌─────────────────────┐
  │  STAGE 2 — PLAN     │  PlanningAgent
  │                     │  Input:  structured_goals, team_size,
  │  GLM generates:     │          deadline_date, project_start_date,
  │                     │          existing_tasks, days_available
  │  • Task list        │  Output: tasks [ ] with dependencies
  │  • Milestones       │          milestones [ ]
  │  • Critical path    │          critical_path [ ]
  │  • Capacity check   │          total_estimated_hours
  │                     │          capacity_analysis, risk_flags [ ]
  └────────┬────────────┘
           │ saves tasks to project:state + DB
           ▼
  ┌─────────────────────┐
  │  STAGE 3 — COORD    │  CoordinationAgent
  │                     │  Input:  members, tasks,
  │  GLM assigns:       │          activity_history, project_phase
  │  • Roles            │  Output: role_assignments [ ]
  │  • Workload         │          meeting_agenda [ ]
  │  • Meeting agenda   │          fairness_index (0–1)
  │  • Fairness index   │          accountability_pairs [ ]
  └────────┬────────────┘
           │ saves to project:state
           ▼
  ┌─────────────────────┐
  │  STAGE 4 — MONITOR  │  RiskDetectionAgent  (runs continuously)
  │                     │  Input:  tasks, members,
  │  GLM detects:       │          deadline_date, current_date,
  │                     │          project_id, decision_history
  │  • Deadline risk    │  Output: project_health
  │  • Inactivity       │          deadline_failure_probability
  │  • Blockers         │          identified_risks [ ]
  │  • Auto-recovery    │          auto_recovery_triggered
  │                     │          recovery_urgency, inactivity_alert
  └────────┬────────────┘
           │  if auto_recovery_triggered → DeadlineRecovery
           ▼
  ┌─────────────────────┐
  │  STAGE 5 — VALIDATE │  SubmissionReadinessAgent
  │                     │  Input:  rubric_criteria,
  │  GLM checks:        │          completed_deliverables,
  │  • Rubric coverage  │          uploaded_artefacts, project_id
  │  • Missing items    │  Output: readiness_score (0–100)
  │  • Checklist        │          rubric_coverage [ ]
  │  • Recommendation   │          recommendation
  │                     │          coverage_summary
  └─────────────────────┘
```

---

### Agent Inputs & Outputs

| Agent | Input Sources | GLM Output | Stored In |
|---|---|---|---|
| **A1** InstructionAnalysis | `document_text`, `document_type`, `project_id` | GLM JSON result + post-process fields: `escalation_required`, optional `escalation_reason` (set when `confidence_score < 0.6`) | `project:state` |
| **A2** Planning | `structured_goals`, `team_size`, `deadline_date`, `project_start_date`, `existing_tasks`, `days_available` | `tasks[]`, `milestones[]`, `critical_path[]`, `total_estimated_hours`, `capacity_analysis`, `risk_flags[]` | `project:state` + `tasks` table |
| **A3** Coordination | `members[]`, `tasks[]`, `activity_history`, `project_phase` | GLM JSON result + computed `fairness_index` from `role_assignments[].workload_hours` | `project:state` |
| **A4** RiskDetection | `project_id`, `tasks[]`, `members[]`, `deadline_date`, `current_date`, `decision_history[]` | `project_health`, `deadline_failure_probability`, `identified_risks[]`, `inactive_members[]`, `auto_recovery_triggered`, `recovery_urgency`, `inactivity_alert` | `project:state` |
| **A5** SubmissionReadiness | `rubric_criteria[]`, `completed_deliverables[]`, `uploaded_artefacts[]`, `project_id` | `readiness_score`, `rubric_coverage[]`, `checklist[]`, `recommendation`, `coverage_summary` | `project:state` |

> Every agent also writes to `project:decisions:{id}` (Redis) and `decision_logs` (PostgreSQL) for full audit trail.
>
> Runtime note: each `execute()` call returns an envelope with `agent`, `status`, `result`, `executed_at`, and `duration_seconds`.

---

### End-to-End Sequence Diagram (One User Flow)

The flow below demonstrates one full interaction from project creation to submission readiness.

```mermaid
sequenceDiagram
   autonumber
   actor U as Student Team Lead
   participant FE as Frontend (React)
   participant API as FastAPI Routes
   participant ORCH as WorkflowEngine
   participant PARSE as Parsers
   participant A1 as InstructionAnalysisAgent
   participant A2 as PlanningAgent
   participant A3 as CoordinationAgent
   participant A4 as RiskDetectionAgent
   participant A5 as SubmissionReadinessAgent
   participant GLM as GLM Reasoning Engine
   participant R as Redis
   participant DB as PostgreSQL
   participant WS as WebSocket Stream

   U->>FE: Create project and upload brief + rubric
   FE->>API: POST /api/projects, POST /api/documents
   API->>DB: Persist project and documents metadata
   API->>PARSE: Extract text from uploaded files
   PARSE-->>API: normalized document_text + document_type

   U->>FE: Run workflow pipeline
   FE->>API: POST /api/workflow/{project_id}/run-pipeline
   API->>ORCH: start pipeline(project_id)
   ORCH->>WS: publish stage=start

   ORCH->>A1: execute(document_text, document_type, project_id)
   A1->>GLM: reason(prompt=instruction_analysis)
   GLM-->>A1: structured_goals, rubric_criteria, ambiguities, confidence_score
   A1->>R: update project:state:{id}
   A1->>DB: write decision_logs
   A1-->>ORCH: analysis result
   ORCH->>WS: publish stage=analyse_complete

   ORCH->>A2: execute(structured_goals, team_size, deadline_date,...)
   A2->>GLM: reason(prompt=planning)
   GLM-->>A2: tasks, milestones, critical_path
   A2->>R: update tasks/milestones in project:state:{id}
   A2->>DB: upsert tasks, write decision_logs
   A2-->>ORCH: plan result + capacity_analysis + risk_flags
   ORCH->>WS: publish stage=plan_complete

   ORCH->>A3: execute(members, tasks, activity_history, project_phase)
   A3->>GLM: reason(prompt=coordination)
   GLM-->>A3: role_assignments, meeting_agenda, accountability_pairs
   A3->>R: update coordination outputs
   A3->>DB: write decision_logs
   A3-->>ORCH: coordination result + fairness_index
   ORCH->>WS: publish stage=coordinate_complete

   ORCH->>A4: execute(project_id, tasks, members, deadline_date, current_date,...)
   A4->>GLM: reason(prompt=risk_detection)
   GLM-->>A4: project_health, deadline_failure_probability, risks/inactive_members
   A4->>R: update risk status and alerts
   A4->>DB: persist detected_risks/risk_reports + decision_logs
   A4-->>ORCH: risk result + auto_recovery_triggered + recovery_urgency
   ORCH->>WS: publish stage=risk_check_complete

   ORCH->>A5: execute(rubric_criteria, completed_deliverables, uploaded_artefacts, project_id)
   A5->>GLM: reason(prompt=submission_readiness)
   GLM-->>A5: readiness_score, rubric_coverage, checklist, recommendation
   A5->>R: update readiness snapshot
   A5->>DB: persist submission_checklists/submission_reports + decision_logs
   A5-->>ORCH: submission result + coverage_summary
   ORCH->>WS: publish stage=submission_check_complete

   ORCH-->>API: final pipeline result
   API-->>FE: 200 OK + aggregated outputs
   FE-->>U: Dashboard shows tasks, risks, and readiness score
```

### Step-by-Step Feature Demonstration

1. Project intake and document ingestion
  - User creates a project and uploads brief/rubric files.
  - System features demonstrated: project management, document ingestion, parser pipeline.

2. Requirement understanding (A1)
  - System converts raw text into structured goals, rubric criteria, ambiguity signals, and confidence.
  - Feature demonstrated: instruction analysis and ambiguity detection.

3. Execution planning (A2)
  - System produces task graph, milestones, critical path, and capacity warnings.
  - Feature demonstrated: automated planning and dependency-aware scheduling.

4. Team coordination (A3)
  - System assigns roles, balances workload, builds meeting agenda, and computes fairness index.
  - Feature demonstrated: role allocation and accountability support.

5. Continuous risk monitoring (A4)
  - System evaluates deadline risk and inactivity, then triggers recovery urgency when needed.
  - Feature demonstrated: proactive risk detection and recovery signaling.

6. Submission readiness validation (A5)
  - System scores readiness, checks rubric coverage, and outputs checklist and recommendation.
  - Feature demonstrated: rubric-based submission quality control.

7. Real-time visibility and audit trail
  - WebSocket streams stage events to frontend while Redis and PostgreSQL persist state and decisions.
  - Feature demonstrated: live pipeline tracking, persistence, and explainable decision logging.

---

### Edge Case Handlers

```
Ambiguous brief (confidence < 0.6)
  └──► AmbiguityResolver ──► clarification_questions [ ]
                          └──► working_assumptions [ ]

Missing fields (no deadline, no rubric)
  └──► MissingDataHandler ──► safe_defaults + uncertainty_flags

Inactive member (> 2 days)
  └──► InactivityDetector ──► severity: warn | critical
                          └──► redistribution_needed: bool

Deadline failure probability > 50%
  └──► DeadlineRecovery ──► tasks_to_cut [ ]
                        └──► tasks_to_compress [ ]
                        └──► priority_order [ ]
```

---

### Database Schema (PostgreSQL)

```
projects (id, name, status, workflow_stage, start_date, deadline_date, team_size, confidence_score)
  |
  +-- members
  |      (id, project_id, name, email, skills JSON, contribution_score, last_activity_at, joined_at)
  |
  +-- tasks
  |      (id, project_id, task_id, title, description, phase, priority, status,
  |       completion_pct, estimated_hours, start_date, due_date,
  |       dependencies JSON, assignee_id -> members.id, assigned_to JSON, percentage_utilized)
  |
  +-- documents
  |      (id, project_id, file_name, document_type, mime_type, content BYTEA, extracted_text, uploaded_at)
  |
  +-- structured_goals
  |      (id, project_id, goal_id, title, description, priority, category, created_at)
  |
  +-- grading_criteria
  |      (id, project_id, criterion_id, criterion_name, description,
  |       max_score, weight, score, status, evidence, feedback)
  |
  +-- milestones
  |      (id, project_id, name, description, due_date, is_completed, completed_at)
  |
  +-- role_assignments
  |      (id, project_id, member_id -> members.id, role, description, assigned_at)
  |
  +-- contribution_balance
  |      (id, project_id, member_id -> members.id, contribution_percentage, expected_percentage, balance_score)
  |
  +-- meeting_agendas
  |      (id, project_id, title, description, scheduled_at, held_at, notes)
  |
  +-- accountability_pairs
  |      (id, project_id, member_1_id -> members.id, member_2_id -> members.id,
  |       objectives, check_in_frequency)
  |
  +-- activity_events
  |      (id, project_id, activity_type, description, actor_id, target_id, created_at)
  |
  +-- detected_risks
  |      (id, project_id, title, description, risk_level, probability, impact,
  |       mitigation_plan, is_resolved, detected_at)
  |
  +-- risk_reports
  |      (id, project_id, title, executive_summary, findings, recommendations, generated_at)
  |
  +-- submission_checklists
  |      (id, project_id, item_description, is_completed, notes, completed_at)
  |
  +-- submission_reports
  |      (id, project_id, title, content, status, submitted_at, feedback)
  |
  +-- decision_logs
  |      (id, project_id, agent, decision_summary, output JSON, logged_at)
  |
  +-- workflow_events
       (id, project_id, event_type, payload JSON, created_at)
```

---

### Redis Key Design

| Key Pattern | Type | Content | TTL |
|---|---|---|---|
| `project:state:{id}` | String (JSON) | Full workflow state — stage, goals, tasks, roles, risk report | 30 days |
| `project:decisions:{id}` | List | GLM decision audit entries, max 200 | 30 days |
| `project:activity:{id}` | List | Member activity events, max 500 | 30 days |
| `coordina:events:{id}` | Pub/Sub channel | Workflow event stream → WebSocket | — |

---

### CI/CD Pipeline

```
git push
    │
    ▼
GitHub Actions
    ├── Services: PostgreSQL 16 + Redis 7
    ├── pip install -r requirements.txt
    ├── alembic upgrade head          ← migration gate
    ├── pytest tests/unit/ -v         ← 100% required
    ├── pytest tests/integration/ -v  ← 100% required
    └── pytest --cov=. --cov-fail-under=80  ← 80% required

Pull Request to main → all gates must pass before merge
```

---

### Tech Stack

| Layer | Technology |
|---|---|
| AI Reasoning | Z.AI GLM-4 (mandatory) |
| Backend | FastAPI + Python 3.12 |
| Frontend | React 18 + Vite |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 |
| State Store | Redis 7 |
| Document Parsing | PyPDF2, python-docx |
| Testing | pytest, pytest-asyncio, Locust |
| CI/CD | GitHub Actions |


## Repository Layout

```text
Coordina-AI/
├── README.md                                   # Root documentation and architecture guide
├── validate_fixes.sh                           # Helper script to validate quick fixes
├── backend/                                    # FastAPI backend + orchestration + agents
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md                               # Backend-specific setup and notes
│   ├── main.py                                 # FastAPI app entrypoint
│   ├── requirements.txt                        # Python dependencies
│   ├── agents/                                 # Specialized workflow agents
│   │   ├── __init__.py
│   │   ├── base_agent.py                       # Shared agent execution and GLM wrapper
│   │   ├── coordination_agent.py               # A3: role/workload/fairness coordination
│   │   ├── instruction_analysis_agent.py       # A1: parse requirements and rubric signals
│   │   ├── planning_agent.py                   # A2: tasks, milestones, dependency planning
│   │   ├── risk_detection_agent.py             # A4: deadline/inactivity risk analysis
│   │   └── submission_readiness_agent.py       # A5: submission readiness scoring
│   ├── api/                                    # REST + WebSocket API layer
│   │   ├── __init__.py
│   │   ├── router.py                           # Top-level API router registration
│   │   ├── routes/                             # Route modules by domain
│   │   │   ├── __init__.py
│   │   │   ├── agents.py
│   │   │   ├── analytics.py
│   │   │   ├── documents.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── teams.py
│   │   │   └── workflow.py                     # Pipeline stage endpoints
│   │   └── websocket/                          # Real-time workflow stream support
│   │       ├── __init__.py
│   │       ├── connection_manager.py           # WebSocket client/session management
│   │       └── workflow_stream.py              # Streams pipeline events to frontend
│   ├── core/                                   # Shared infra: config, DB, logging, Redis
│   │   ├── __init__.py
│   │   ├── config.py                           # Environment and app settings
│   │   ├── database.py                         # SQLAlchemy engine/session setup
│   │   ├── exceptions.py
│   │   ├── logger.py                           # Centralized logging config
│   │   ├── redis.py
│   │   └── redis_client.py                     # Redis connection and helper methods
│   ├── edge_cases/                             # Recovery handlers for exceptional states
│   │   ├── __init__.py
│   │   ├── ambiguity_resolver.py
│   │   ├── deadline_recovery.py
│   │   ├── inactivity_detector.py
│   │   └── missing_data_handler.py
│   ├── glm/                                    # GLM client + reasoning orchestration
│   │   ├── __init__.py
│   │   ├── client.py                           # Z.AI API client abstraction
│   │   ├── reasoning_engine.py                 # Prompt execution + response handling
│   │   └── prompts/                            # Prompt templates per agent
│   │       ├── __init__.py
│   │       ├── base_system.txt
│   │       ├── coordination.txt
│   │       ├── instruction_analysis.txt
│   │       ├── planning.txt
│   │       ├── risk_detection.txt
│   │       └── submission_readiness.txt
│   ├── logs/
│   ├── memory/                                 # Project activity + decision memory helpers
│   │   ├── __init__.py
│   │   ├── activity_tracker.py
│   │   └── decision_log.py
│   ├── migrations/                             # Alembic migration environment
│   │   └── env.py
│   ├── models/                                 # SQLAlchemy ORM models (source of schema)
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
│   ├── orchestrator/                           # Workflow engine and routing logic
│   │   ├── __init__.py
│   │   ├── event_bus.py                        # Publishes/subscribes internal workflow events
│   │   ├── state_manager.py                    # Mutates and retrieves workflow state
│   │   ├── task_router.py                      # Routes work across pipeline stages
│   │   └── workflow_engine.py                  # Orchestrates end-to-end pipeline execution
│   ├── parsers/                                # Converts unstructured inputs to text/structure
│   │   ├── __init__.py
│   │   ├── chat_logs_parser.py
│   │   ├── document_parser.py
│   │   ├── rubric_parser.py
│   │   └── transcript_parser.py
│   ├── schemas/                                # Pydantic request/response contracts
│   │   ├── __init__.py
│   │   ├── document.py
│   │   ├── member.py
│   │   ├── project.py
│   │   ├── task.py
│   │   └── workflow.py
│   ├── scripts/
│   │   └── smoke_test_glm.py                   # Quick live connectivity test for GLM
│   └── tests/                                  # Backend test suites
│       ├── conftest.py                         # Shared pytest fixtures/setup
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
└── coordina-ai/                                # React + Vite frontend workspace
    ├── public/
    └── src/                                    # Application source
        ├── App.css
        ├── App.tsx                             # Root app shell and routing frame
        ├── index.css
        ├── main.tsx                            # Frontend bootstrap entrypoint
        ├── api/                                # Typed API clients for backend routes
        │   ├── client.ts
        │   ├── documents.ts
        │   ├── mappers.ts
        │   ├── projects.ts
        │   ├── tasks.ts
        │   ├── teams.ts
        │   ├── types.ts
        │   └── workflow.ts
        ├── assets/
        ├── components/                         # Reusable UI/layout components
        │   ├── layout/
        │   │   ├── Navbar.tsx
        │   │   └── PageLayout.tsx
        │   └── ui/
        │       ├── Badge.tsx
        │       └── Button.tsx
        ├── data/
        │   └── mockData.ts
        ├── pages/                              # Top-level product screens
        │   ├── DashboardPage.tsx               # Project health and progress overview
        │   ├── NewProjectPage.tsx              # Project creation + initial input flow
        │   └── ProjectWorkspacePage.tsx        # Core workspace: tasks, risks, readiness
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

## Contribution

Contributions are welcome.

1. Fork the repository and create a feature branch.
2. Make your changes with clear commits.
3. Run relevant backend/frontend tests before submitting.
4. Open a Pull Request with a concise summary, test notes, and screenshots (if UI changes).

Please keep changes scoped, document any new environment variables, and update README sections when behavior changes.

## License

This project is licensed under the MIT License.

See the `LICENSE` file at the repository root for the full text.



