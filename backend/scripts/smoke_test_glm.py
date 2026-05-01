"""
scripts/smoke_test_glm.py

Live smoke test — hits the real Z.AI GLM API and runs each agent
with a realistic sample context. No mocks.

Usage:
    python scripts/smoke_test_glm.py                  # run all agents
    python scripts/smoke_test_glm.py --agent planning  # run one agent

Requirements:
    - .env file with ZAI_API_KEY set
    - pip install -r requirements.txt
"""

import asyncio
import argparse
import json
import sys
import time
from pathlib import Path
from typing import Callable, Awaitable


# Ensure backend package imports work when running from scripts/ or elsewhere.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# ------------------------------------------------------------------ #
#  Bootstrap: load .env before importing anything from the project     #
# ------------------------------------------------------------------ #
from dotenv import load_dotenv
load_dotenv(dotenv_path=BACKEND_ROOT / ".env")

from agents.instruction_analysis_agent import InstructionAnalysisAgent
from agents.planning_agent import PlanningAgent
from agents.coordination_agent import CoordinationAgent
from agents.risk_detection_agent import RiskDetectionAgent
from agents.submission_readiness_agent import SubmissionReadinessAgent
from glm.client import glm_client


# ================================================================== #
#  Sample contexts — realistic inputs for each agent                   #
# ================================================================== #

SAMPLE_BRIEF = """
Project Brief: AI-Powered Student Workflow Manager

Objective:
Build a web-based system that uses an AI reasoning engine to help student
groups manage project workflows. The system must support document ingestion,
automated task planning, role assignment, and risk detection.

Deliverables:
1. Working web prototype (React frontend + FastAPI backend)
2. System architecture document with component diagram
3. 3000-word technical report covering design decisions
4. 10-minute demonstration video
5. QA testing document

Evaluation Criteria:
- System Architecture & Design: 30%
- Code Quality & Modularity: 25%
- AI Integration Depth: 20%
- Documentation: 15%
- Presentation: 10%

Deadline: 1 December 2025
Team size: 4 members
"""

SAMPLE_TRANSCRIPT = """
[00:00] Alice: Good morning everyone, let's discuss the project scope
[00:15] Bob: I think we should focus on the backend first
[00:45] Alice: Agreed. We need to set up the database schema and API endpoints by Thursday
[01:10] Carol: What about the frontend? Should we start React component design?
[01:30] Alice: Yes, both teams work in parallel. Frontend by Friday
[02:00] Dave: I'll handle the deployment setup on AWS. We need it ready for final demo
[02:20] Bob: The timeline is tight. Let's have daily standups at 10am
[02:45] Carol: Should we use TypeScript or JavaScript for the React app?
[03:00] Alice: TypeScript for better maintainability. Use the design system Carol created
[03:30] Dave: Infrastructure notes: use PostgreSQL, Redis for caching, Docker containers
[04:00] Alice: Great. Let's reconvene tomorrow. Everyone clear on their tasks?
[04:15] All: Yes!
"""

SAMPLE_CHAT_LOG = """
@alice: morning team! let's discuss project architecture
bob: hi! I think we should start with the database schema
alice (09:30): good call bob. We need to support users, projects, tasks, and roles
carol: also need activity tracking for the inactivity detection feature
bob: true. Let's use PostgreSQL with async queries
dave: I'll set up the Docker container and AWS infrastructure
alice: perfect. Can we have the schema ready by tomorrow?
bob: I'll draft it this morning and share by EOD
carol: I'll work on the data models in Python/SQLAlchemy
dave: infrastructure will be ready by tomorrow evening
alice: awesome. Roles clear?
bob: schema + api endpoints
carol: data models + edge case handlers
dave: devops + deployment
"""

SAMPLE_RUBRIC = """
AI Workflow Manager - Grading Rubric

1. System Architecture & Design (30%)
   - Component structure and modularity
   - Database schema design
   - API endpoint organization

2. Code Quality & Modularity (25%)
   - Clean, readable code
   - Proper error handling
   - Unit test coverage

3. AI Integration Depth (20%)
   - Quality of LLM prompts
   - Multi-agent orchestration
   - Edge case handling

4. Documentation (15%)
   - Technical report (2000+ words)
   - Component diagrams
   - Setup instructions

5. Presentation (10%)
   - Demo video clarity
   - Visual design
   - Communication
"""

SAMPLE_GOALS = [
    {"goal_id": "G1", "statement": "Build React + FastAPI web prototype", "priority": "critical"},
    {"goal_id": "G2", "statement": "Integrate Z.AI GLM as reasoning engine", "priority": "critical"},
    {"goal_id": "G3", "statement": "Write 3000-word technical report",      "priority": "high"},
    {"goal_id": "G4", "statement": "Prepare system architecture document",  "priority": "high"},
    {"goal_id": "G5", "statement": "Record 10-minute demo video",           "priority": "medium"},
]

SAMPLE_TASKS = [
    {"task_id": "T1", "title": "DB schema design",     "status": "done",        "priority": "critical", "estimated_hours": 3},
    {"task_id": "T2", "title": "REST API endpoints",   "status": "in_progress", "priority": "high",     "estimated_hours": 6},
    {"task_id": "T3", "title": "GLM agent integration","status": "pending",     "priority": "critical", "estimated_hours": 8},
    {"task_id": "T4", "title": "React dashboard UI",   "status": "pending",     "priority": "high",     "estimated_hours": 6},
    {"task_id": "T5", "title": "Write technical report","status": "pending",     "priority": "medium",   "estimated_hours": 5},
]

SAMPLE_MEMBERS = [
    {"id": "m1", "name": "Alice", "skills": ["python", "fastapi", "backend"], "contribution_score": 0.8},
    {"id": "m2", "name": "Bob",   "skills": ["react", "typescript"],          "contribution_score": 0.5},
    {"id": "m3", "name": "Carol", "skills": ["writing", "documentation"],     "contribution_score": 0.3},
    {"id": "m4", "name": "Dave",  "skills": ["design", "figma", "ux"],        "contribution_score": 0.4},
]

SAMPLE_RUBRIC_CRITERIA = [
    {"criterion": "System Architecture & Design", "weight_pct": 30},
    {"criterion": "Code Quality & Modularity",    "weight_pct": 25},
    {"criterion": "AI Integration Depth",         "weight_pct": 20},
    {"criterion": "Documentation",                "weight_pct": 15},
    {"criterion": "Presentation",                 "weight_pct": 10},
]


# ================================================================== #
#  Display helpers                                                     #
# ================================================================== #

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
WARN = "\033[93m⚠ WARN\033[0m"
BOLD = "\033[1m"
RESET = "\033[0m"


def section(title: str):
    print(f"\n{'='*60}")
    print(f"{BOLD}  {title}{RESET}")
    print(f"{'='*60}")


def check(label: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    print(f"  {status}  {label}")
    if detail:
        print(f"         {detail}")
    return condition


def pretty(data: dict, indent: int = 4) -> str:
    return json.dumps(data, indent=indent, ensure_ascii=False)


# ================================================================== #
#  Step 0: GLM connectivity check                                      #
# ================================================================== #

async def test_glm_connectivity():
    section("STEP 0 — GLM Connectivity Check")
    print("  Sending a minimal test message to verify API key and endpoint...\n")

    try:
        t0 = time.time()
        response = await glm_client.chat(
            messages=[{"role": "user", "content": "This is a connectivity test. Reply with exactly one word: CONNECTED"}],
            temperature=0.0,
            max_tokens=256,
        )
        elapsed = time.time() - t0

        normalized = (response or "").strip().upper()
        ok = "CONNECTED" in normalized
        check("GLM API responds",          True,  f"Response: '{response.strip()}'")
        if ok:
            check("Response contains keyword", True, f"Elapsed: {elapsed:.2f}s")
        else:
            print(f"  {WARN}  Connectivity probe output was unexpected.")
            print(f"         Elapsed: {elapsed:.2f}s")
            print("         Proceeding because API connectivity is confirmed.")

        if not ok:
            print(f"\n  {WARN}  GLM responded but output was unexpected.")
            print(f"         Raw: {response!r}")

        return True

    except Exception as e:
        check("GLM API responds", False, f"Error: {e}")
        print(f"\n  {FAIL}  Cannot reach GLM. Check ZAI_API_KEY and ZAI_API_BASE_URL in .env")
        return False


# ================================================================== #
#  Agent smoke tests                                                   #
# ================================================================== #

async def test_instruction_analysis_agent():
    section("AGENT 1 — InstructionAnalysisAgent (All 4 Document Types)")
    
    # Test all 4 supported document types
    test_cases = [
        ("brief", SAMPLE_BRIEF, "project brief"),
        ("rubric", SAMPLE_RUBRIC, "grading rubric"),
        ("meeting_transcript", SAMPLE_TRANSCRIPT, "meeting transcript"),
        ("chat_logs", SAMPLE_CHAT_LOG, "chat log"),
    ]
    
    all_passed = True
    for doc_type, doc_text, desc in test_cases:
        print(f"\n  Testing: {doc_type} ({desc})")
        agent = InstructionAnalysisAgent()
        context = {
            "project_id": "smoke-test-001",
            "document_text": doc_text,
            "document_type": doc_type,
        }

        t0 = time.time()
        output = await agent.execute(context)
        elapsed = time.time() - t0

        passed = check(
            f"  {doc_type} → success",
            output["status"] == "success",
            f"({elapsed:.1f}s)"
        )
        
        if not passed:
            print(f"    Error: {output.get('error')}")
            all_passed = False
            continue

        result = output["result"]
        
        # Validate output structure
        checks = [
            check("    structured_goals",     bool(result.get("structured_goals")),
                  f"{len(result.get('structured_goals', []))} goals"),
            check("    grading_priorities",   bool(result.get("grading_priorities")),
                  f"{len(result.get('grading_priorities', []))} criteria"),
            check("    confidence_score",     "confidence_score" in result,
                  f"{result.get('confidence_score', 'N/A')}"),
            check("    ambiguities",          "ambiguities" in result,
                  f"{len(result.get('ambiguities', []))} found"),
        ]
        
        all_passed = all_passed and all(checks)

    return all_passed


async def test_planning_agent():
    section("AGENT 2 — PlanningAgent")
    print("  Input: 5 structured goals, team of 4, 14-day deadline\n")

    agent = PlanningAgent()
    context = {
        "project_id": "smoke-test-001",
        "structured_goals": SAMPLE_GOALS,
        "team_size": 4,
        "deadline_date": "2025-12-01",
        "project_start_date": "2025-11-17",
        "existing_tasks": [],
        "days_available": 14,
    }

    t0 = time.time()
    output = await agent.execute(context)
    elapsed = time.time() - t0

    passed = check("Agent returned success", output["status"] == "success")
    if not passed:
        print(f"  Error: {output.get('error')}")
        return False

    result = output["result"]
    print(f"\n  GLM Output ({elapsed:.1f}s):")

    checks = [
        check("tasks present",            bool(result.get("tasks")),
              f"Count: {len(result.get('tasks', []))}"),
        check("milestones present",       bool(result.get("milestones")),
              f"Count: {len(result.get('milestones', []))}"),
        check("critical_path present",    bool(result.get("critical_path")),
              f"Path: {result.get('critical_path')}"),
        check("all tasks have status",    all("status" in t for t in result.get("tasks", [])),
              "status field auto-injected"),
        check("capacity_analysis added",  "capacity_analysis" in result,
              f"Overloaded: {result.get('capacity_analysis', {}).get('overloaded')}"),
        check("total_hours reasonable",   result.get("total_estimated_hours", 0) > 0,
              f"Total: {result.get('total_estimated_hours')}h"),
    ]

    print(f"\n  First task: {result.get('tasks', [{}])[0]}")
    print(f"  Critical path: {result.get('critical_path')}")

    return all(checks)


async def test_coordination_agent():
    section("AGENT 3 — CoordinationAgent")
    print("  Input: 4 members with skills, 5 tasks\n")

    agent = CoordinationAgent()
    context = {
        "project_id": "smoke-test-001",
        "members": SAMPLE_MEMBERS,
        "tasks": SAMPLE_TASKS,
        "activity_history": [],
        "project_phase": "execution",
    }

    t0 = time.time()
    output = await agent.execute(context)
    elapsed = time.time() - t0

    passed = check("Agent returned success", output["status"] == "success")
    if not passed:
        print(f"  Error: {output.get('error')}")
        return False

    result = output["result"]
    print(f"\n  GLM Output ({elapsed:.1f}s):")

    checks = [
        check("role_assignments present",   bool(result.get("role_assignments")),
              f"Count: {len(result.get('role_assignments', []))}"),
        check("meeting_agenda present",     bool(result.get("meeting_agenda")),
              f"Items: {len(result.get('meeting_agenda', []))}"),
        check("fairness_index computed",    result.get("fairness_index") is not None,
              f"Index: {result.get('fairness_index')} (1.0 = perfectly equal)"),
        check("workload_balance present",   bool(result.get("workload_balance")),
              f"Status: {result.get('workload_balance', {}).get('status')}"),
    ]

    print(f"\n  Assignments:")
    for a in result.get("role_assignments", []):
        print(f"    {a.get('member_name', '?'):<10} → {a.get('assigned_role', '?'):<20} "
              f"({a.get('workload_hours', 0)}h)")

    return all(checks)


async def test_risk_detection_agent():
    section("AGENT 4 — RiskDetectionAgent")
    print("  Input: mixed task statuses, 2 members, tight deadline\n")

    agent = RiskDetectionAgent()
    context = {
        "project_id": "smoke-test-001",
        "tasks": SAMPLE_TASKS,
        "members": [
            {**SAMPLE_MEMBERS[0], "last_activity_at": "2025-11-17T08:00:00Z"},
            {**SAMPLE_MEMBERS[1], "last_activity_at": "2025-11-14T08:00:00Z"},  # 3 days ago
        ],
        "deadline_date": "2025-11-25",   # tight: only 8 days
        "current_date": "2025-11-17",
        "decision_history": [],
    }

    t0 = time.time()
    output = await agent.execute(context)
    elapsed = time.time() - t0

    passed = check("Agent returned success", output["status"] == "success")
    if not passed:
        print(f"  Error: {output.get('error')}")
        return False

    result = output["result"]
    print(f"\n  GLM Output ({elapsed:.1f}s):")

    checks = [
        check("project_health present",             "project_health" in result,
              f"Health: {result.get('project_health')}"),
        check("deadline_failure_probability present","deadline_failure_probability" in result,
              f"Probability: {result.get('deadline_failure_probability'):.0%}"),
        check("risks list present",                 "risks" in result,
              f"Risk count: {len(result.get('risks', []))}"),
        check("auto_recovery_triggered set",        "auto_recovery_triggered" in result,
              f"Triggered: {result.get('auto_recovery_triggered')}"),
        check("recovery_urgency set",               "recovery_urgency" in result,
              f"Urgency: {result.get('recovery_urgency')}"),
    ]

    if result.get("risks"):
        print(f"\n  Top risk: {result['risks'][0].get('description', '?')}")
    if result.get("inactive_members"):
        print(f"  Inactive: {[m.get('member_id') for m in result['inactive_members']]}")

    return all(checks)


async def test_submission_readiness_agent():
    section("AGENT 5 — SubmissionReadinessAgent")
    print("  Input: 5 rubric criteria, partially completed deliverables\n")

    agent = SubmissionReadinessAgent()
    context = {
        "project_id": "smoke-test-001",
        "rubric_criteria": SAMPLE_RUBRIC_CRITERIA,
        "completed_deliverables": [
            "React + FastAPI web prototype",
            "System architecture document",
        ],
        "uploaded_artefacts": [
            "prototype_demo.mp4",
            "architecture_diagram.pdf",
            "README.md",
        ],
    }

    t0 = time.time()
    output = await agent.execute(context)
    elapsed = time.time() - t0

    passed = check("Agent returned success", output["status"] == "success")
    if not passed:
        print(f"  Error: {output.get('error')}")
        return False

    result = output["result"]
    print(f"\n  GLM Output ({elapsed:.1f}s):")

    checks = [
        check("readiness_score present",   "readiness_score" in result,
              f"Score: {result.get('readiness_score')}/100"),
        check("recommendation present",    result.get("recommendation") in
              ("ready_to_submit", "needs_work", "not_ready"),
              f"Recommendation: {result.get('recommendation')}"),
        check("rubric_coverage present",   bool(result.get("rubric_coverage")),
              f"Criteria checked: {len(result.get('rubric_coverage', []))}"),
        check("coverage_summary present",  "coverage_summary" in result,
              f"Summary: {result.get('coverage_summary')}"),
        check("checklist present",         bool(result.get("submission_checklist")),
              f"Items: {len(result.get('submission_checklist', []))}"),
    ]

    print(f"\n  Coverage breakdown:")
    for c in result.get("rubric_coverage", []):
        icon = "✓" if c.get("status") == "complete" else ("~" if c.get("status") == "partial" else "✗")
        print(f"    {icon} {c.get('criterion', '?'):<40} [{c.get('status')}]")

    return all(checks)


# ================================================================== #
#  Main runner                                                         #
# ================================================================== #

AGENT_REGISTRY = {
    "analysis":    test_instruction_analysis_agent,
    "planning":    test_planning_agent,
    "coordination":test_coordination_agent,
    "risk":        test_risk_detection_agent,
    "submission":  test_submission_readiness_agent,
}


async def main(target: str = "all"):
    print(f"\n{BOLD}Coordina AI — Live GLM Smoke Test{RESET}")
    print("Verifying that Z.AI GLM produces correctly structured output for each agent.\n")

    # Always verify connectivity first
    connected = await test_glm_connectivity()
    if not connected:
        print(f"\n{FAIL}  Aborting — GLM connection failed.")
        sys.exit(1)

    results = {}

    if target == "all":
        agents_to_run = AGENT_REGISTRY
    elif target in AGENT_REGISTRY:
        agents_to_run = {target: AGENT_REGISTRY[target]}
    else:
        print(f"\n{FAIL}  Unknown agent: '{target}'")
        print(f"  Valid options: {list(AGENT_REGISTRY.keys())}")
        sys.exit(1)

    for name, test_fn in agents_to_run.items():
        try:
            results[name] = await test_fn()
        except Exception as e:
            section(f"AGENT — {name.upper()} (CRASHED)")
            print(f"  {FAIL}  Unhandled exception: {e}")
            import traceback
            traceback.print_exc()
            results[name] = False

    # ---------------------------------------------------------------- #
    #  Summary                                                          #
    # ---------------------------------------------------------------- #
    section("SUMMARY")
    total = len(results)
    passed = sum(1 for v in results.values() if v)

    for name, ok in results.items():
        status = PASS if ok else FAIL
        print(f"  {status}  {name}")

    print(f"\n  Result: {passed}/{total} agents passed\n")

    if passed < total:
        print(f"  {WARN}  Some agents failed. Check GLM prompt templates and API key.")
        sys.exit(1)
    else:
        print(f"  {BOLD}All agents verified. GLM integration is working correctly.{RESET}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Coordina AI live GLM smoke test")
    parser.add_argument(
        "--agent",
        default="all",
        help="Agent to test: all | analysis | planning | coordination | risk | submission",
    )
    args = parser.parse_args()
    asyncio.run(main(target=args.agent))