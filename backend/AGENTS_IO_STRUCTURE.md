# Coordina-AI Agent I/O Structure Guide

**Last Updated:** 2026-05-02

This document reflects the **actual** input and output contracts implemented in `backend/agents/*.py` and the direct routing in `backend/orchestrator/task_router.py`.

## Common Envelope (All Agents)

All agents are invoked through:

- Request: `POST /api/agents/run`
- Body:

```json
{
  "task_type": "...",
  "context": {}
}
```

All agent responses use the base envelope produced by `BaseAgent.execute`:

```json
{
  "agent": "instruction_analysis|planning|coordination|risk_detection|submission_readiness",
  "status": "success|error",
  "result": {},
  "executed_at": "ISO-8601 datetime",
  "duration_seconds": 1.23
}
```

On error:

```json
{
  "agent": "...",
  "status": "error",
  "error": "...",
  "executed_at": "ISO-8601 datetime"
}
```

---

## Direct Task Types (`/api/agents/run`)

From `AGENT_MAP` in `orchestrator/task_router.py`:

- `analyse_document` -> `InstructionAnalysisAgent`
- `generate_plan` -> `PlanningAgent`
- `coordinate_team` -> `CoordinationAgent`
- `detect_risks` -> `RiskDetectionAgent`
- `check_submission` -> `SubmissionReadinessAgent`

---

## Agent 1: Instruction Analysis

- Agent name: `instruction_analysis`
- Task type: `analyse_document`
- Prompt template: `instruction_analysis`

### Input (`context`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | `string` | Yes | Project identifier |
| `document_text` | `string` | Yes | Parsed/cleaned document text |
| `document_type` | `string` | Yes | Supported: `brief`, `rubric`, `meeting_transcript`, `chat_logs` |

### Output (`result`)

Core model output is passed through, with one post-process rule:

- If `confidence_score < 0.6`:
  - `escalation_required = true`
  - `escalation_reason = "Low confidence in requirement extraction. Manual review or clarification recommended."`
- Else:
  - `escalation_required = false`

Expected keys (model-dependent but used by workflow/frontend):

- `structured_goals: list[dict]`
- `grading_priorities: list[dict]`
- `ambiguities: list`
- `confidence_score: float`
- `escalation_required: bool` (post-processed)
- `escalation_reason: string` (only when low confidence branch runs)

---

## Agent 2: Planning

- Agent name: `planning`
- Task type: `generate_plan`
- Prompt template: `planning`

### Input (`context`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | `string` | Yes | Project identifier |
| `structured_goals` | `list[dict]` | Yes | From analysis stage |
| `team_size` | `int` | Yes | Team member count |
| `deadline_date` | `string` | Yes | ISO date |
| `project_start_date` | `string` | Yes | ISO date |
| `existing_tasks` | `list[dict]` | Yes in engine context | May be empty |
| `days_available` | `int` | Yes in engine context | Derived by workflow engine |

### Output (`result`)

Model output is normalized/post-processed:

Per task in `tasks`:

- Ensures `status` exists (default `pending`)
- Keeps `phase` only if in `{setup, design, implementation, testing, documentation}`
- Normalizes `assigned_to` to array
- Normalizes `dependencies` to array
- Ensures `startDate` exists (fallback `project_start_date`)
- Ensures `endDate` exists (fallback placeholder logic)
- Ensures `percentage_utilized` exists (default `0`)

Top-level post-processing:

- Ensures `total_estimated_hours` (computed if missing)
- Adds/overwrites `capacity_analysis`:
  - `total_estimated_hours`
  - `team_capacity_hours = team_size * days_available * 6`
  - `overloaded`
- Ensures `risk_flags` exists (array)
- Appends capacity warning when overloaded

Common output keys:

- `tasks: list[dict]`
- `milestones: list[dict]`
- `critical_path: list`
- `total_estimated_hours: number`
- `capacity_analysis: dict`
- `risk_flags: list`

---

## Agent 3: Coordination

- Agent name: `coordination`
- Task type: `coordinate_team`
- Prompt template: `coordination`

### Input (`context`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | `string` | Yes | Project identifier |
| `members` | `list[dict]` | Yes | Team member payload |
| `tasks` | `list[dict]` | Yes | Planning tasks |
| `activity_history` | `list` | Yes | Recent activity events |
| `project_phase` | `string` | Yes | Usually workflow stage |

### Output (`result`)

Model output is passed through and augmented with fairness:

- `fairness_index` computed from `role_assignments[].workload_hours` using Jain's fairness index
- If no assignments, `fairness_index = null`

Common output keys used downstream:

- `role_assignments: list[dict]`
- `contribution_balance: list[dict]`
- `meeting_agenda: list[dict]`
- `workload_balance: dict` (if model provides)
- `accountability_pairs: list[dict]` (if model provides)
- `flags: list` (if model provides)
- `fairness_index: float | null` (post-processed)

---

## Agent 4: Risk Detection

- Agent name: `risk_detection`
- Task type: `detect_risks`
- Prompt template: `risk_detection`

### Input (`context`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | `string` | Yes | Project identifier |
| `tasks` | `list[dict]` | Yes | Task list |
| `members` | `list[dict]` | Yes | Member list with activity data |
| `deadline_date` | `string` | Yes | ISO date |
| `current_date` | `string` | Yes | ISO date |
| `decision_history` | `list` | Yes in engine context | May be empty |

### Output (`result`)

Post-processing in agent:

- Reads `deadline_failure_probability`
- Sets:
  - `auto_recovery_triggered`
  - `recovery_urgency` (`immediate` / `soon` / `monitor`)
- Sets `inactivity_alert = len(inactive_members) > 0`
- Normalizes legacy key:
  - if `identified_risks` missing and `risks` exists, move `risks` -> `identified_risks`

Typical output keys:

- `project_health: string`
- `health_score: number`
- `deadline_failure_probability: number`
- `identified_risks: list[dict]` (normalized)
- `inactive_members: list[dict]`
- `inactivity_alert: bool` (post-processed)
- `auto_recovery_triggered: bool` (post-processed)
- `recovery_urgency: string` (post-processed)

---

## Agent 5: Submission Readiness

- Agent name: `submission_readiness`
- Task type: `check_submission`
- Prompt template: `submission_readiness`

### Input (`context`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | `string` | Yes | Project identifier |
| `rubric_criteria` | `list[dict]` | Yes | Usually from analysis grading priorities |
| `completed_deliverables` | `list` | Yes | Usually derived from done tasks |
| `uploaded_artefacts` | `list` | Yes | Provided by request |

### Output (`result`)

Post-processing in agent:

- Overrides `recommendation` from `readiness_score`:
  - `>= 85` -> `ready_to_submit`
  - `>= 60` -> `needs_work`
  - else -> `not_ready`
- Recomputes `coverage_summary` from `rubric_coverage` statuses:
  - counts only `covered`, `partial`, `missing`

Typical output keys:

- `readiness_score: int`
- `recommendation: string` (post-processed authoritative value)
- `rubric_coverage: list[dict]`
- `coverage_summary: dict` (post-processed authoritative value)
- `missing_artefacts: list`
- `submission_checklist: list[dict]`
- `last_minute_risks: list`

---

## Workflow State Persistence (Engine)

From `orchestrator/workflow_engine.py`, stage outputs are persisted as:

- Analysis -> `structured_goals`, `rubric_criteria`, `ambiguities`, `document_type`
- Planning -> `tasks`, `milestones`, `critical_path`
- Coordination -> `role_assignments`, `contribution_balance`, `meeting_agenda`
- Risk -> `last_risk_report`
- Submission -> `submission_report`

This is the canonical source for frontend hydration via workflow state endpoints.

---

## Notes for Frontend Integrations

- Use `submission_report.rubric_coverage` for rubric panel data.
- Do not assume `risks`; prefer `identified_risks` (agent normalizes legacy key).
- `recommendation` and `coverage_summary` in submission readiness are final post-processed values.
- `document_type` accepted values are `brief`, `rubric`, `meeting_transcript`, `chat_logs`.
