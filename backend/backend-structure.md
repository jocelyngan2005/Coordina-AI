coordina-ai-backend/
│
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
│
├── main.py                          # FastAPI app entry point
│
├── core/                            # App-wide config & shared utilities
│   ├── __init__.py
│   ├── config.py                    # Env vars, GLM API keys, DB URLs
│   ├── database.py                  # DB connection (PostgreSQL via SQLAlchemy)
│   ├── redis_client.py              # Redis connection for stateful memory
│   ├── exceptions.py                # Custom exception classes
│   └── logger.py                    # Structured logging setup
│
├── glm/                             # GLM reasoning engine (Z.AI integration)
│   ├── __init__.py
│   ├── client.py                    # Z.AI GLM API client wrapper
│   ├── prompts/                     # All system & agent prompt templates
│   │   ├── base_system.txt
│   │   ├── instruction_analysis.txt
│   │   ├── planning.txt
│   │   ├── coordination.txt
│   │   ├── risk_detection.txt
│   │   └── submission_readiness.txt
│   └── reasoning_engine.py          # Core multi-step reasoning orchestration
│
├── agents/                          # Specialized autonomous agent modules
│   ├── __init__.py
│   ├── base_agent.py                # Abstract base class for all agents
│   ├── instruction_analysis_agent.py  # Parses briefs, rubrics, extracts goals
│   ├── planning_agent.py            # Task decomposition, milestones, timelines
│   ├── coordination_agent.py        # Role assignment, contribution tracking
│   ├── risk_detection_agent.py      # Inactivity detection, deadline prediction
│   └── submission_readiness_agent.py  # Rubric coverage, artifact validation
│
├── orchestrator/                    # Workflow orchestration engine
│   ├── __init__.py
│   ├── workflow_engine.py           # Main multi-step orchestration logic
│   ├── task_router.py               # Routes tasks to appropriate agents
│   ├── state_manager.py             # Reads/writes persistent project state
│   └── event_bus.py                 # Internal event pub/sub between agents
│
├── memory/                          # Stateful memory & context management
│   ├── __init__.py
│   ├── project_state.py             # Project state schema & lifecycle
│   ├── session_store.py             # Redis-backed session/context store
│   ├── decision_log.py              # Logs all GLM decisions with reasoning
│   └── activity_tracker.py          # Tracks member contributions over time
│
├── api/                             # FastAPI route handlers
│   ├── __init__.py
│   ├── router.py                    # Aggregates all route modules
│   ├── routes/
│   │   ├── projects.py              # CRUD for projects
│   │   ├── tasks.py                 # Task management endpoints
│   │   ├── teams.py                 # Team/member management
│   │   ├── workflow.py              # Trigger & query workflow execution
│   │   ├── agents.py                # Direct agent invocation endpoints
│   │   ├── documents.py             # File/document upload & parsing
│   │   └── analytics.py            # Contribution & progress analytics
│   └── websocket/
│       ├── connection_manager.py    # WS connection registry
│       └── workflow_stream.py       # Real-time workflow updates to frontend
│
├── services/                        # Business logic layer
│   ├── __init__.py
│   ├── project_service.py
│   ├── task_service.py
│   ├── team_service.py
│   ├── document_service.py          # Document parsing (PDF, DOCX, TXT)
│   ├── notification_service.py      # In-app & webhook notifications
│   └── analytics_service.py         # Generates contribution analytics
│
├── models/                          # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── project.py
│   ├── task.py
│   ├── member.py
│   ├── document.py
│   ├── decision_log.py
│   └── workflow_event.py
│
├── schemas/                         # Pydantic request/response schemas
│   ├── __init__.py
│   ├── project.py
│   ├── task.py
│   ├── member.py
│   ├── workflow.py
│   └── agent_output.py
│
├── parsers/                         # Unstructured input processors
│   ├── __init__.py
│   ├── document_parser.py           # PDF, DOCX, TXT → structured text
│   ├── rubric_parser.py             # Extracts grading criteria
│   ├── transcript_parser.py         # Meeting transcript processor
│   └── chat_log_parser.py           # Chat history processor
│
├── edge_cases/                      # Edge case handling logic
│   ├── __init__.py
│   ├── ambiguity_resolver.py        # Generates clarification workflows
│   ├── missing_data_handler.py      # Estimates & flags incomplete inputs
│   ├── inactivity_detector.py       # Member inactivity detection
│   └── deadline_recovery.py         # Auto-compress & replan on risk
│
├── migrations/                      # Alembic DB migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│
└── tests/
    ├── __init__.py
    ├── unit/
    │   ├── test_agents.py
    │   ├── test_orchestrator.py
    │   ├── test_parsers.py
    │   └── test_edge_cases.py
    ├── integration/
    │   ├── test_workflow_engine.py
    │   ├── test_glm_reasoning.py
    │   └── test_api_routes.py
    └── fixtures/
        ├── sample_brief.pdf
        ├── sample_rubric.txt
        └── mock_project_state.json


Request flow — The frontend hits /api/workflow/run → workflow_engine.py reads project state from Redis via state_manager.py → routes to the appropriate agent via task_router.py → each agent calls reasoning_engine.py which wraps the Z.AI GLM client → outputs are persisted to PostgreSQL and broadcast to the frontend via WebSocket.

Tech stack choices:
FastAPI — async-native, perfect for streaming GLM responses and WebSocket support
PostgreSQL — persistent storage for projects, tasks, decisions
Redis — session/state store for the stateful memory layer (fast reads during reasoning loops)
Alembic — DB migrations
Pydantic v2 — request/response validation via schemas/