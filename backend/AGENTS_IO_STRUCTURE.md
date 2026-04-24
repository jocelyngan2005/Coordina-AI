# Coordina-AI Agent I/O Structure Guide

This document defines the input and output structure for all Coordina-AI agents.

## Overview

All agents follow a standard execution pattern:
- **Input**: `AgentRunRequest` containing `task_type` and `context` dict
- **Output**: Standard response envelope with agent metadata, status, result, and timing

### Base Response Structure (All Agents)

```json
{
  "agent": "agent_name",
  "status": "success|error",
  "result": { /* agent-specific output */ },
  "executed_at": "2026-04-24T10:30:00+00:00",
  "duration_seconds": 1.23
}
```

On error:
```json
{
  "agent": "agent_name",
  "status": "error",
  "error": "error message",
  "executed_at": "2026-04-24T10:30:00+00:00"
}
```

---

## Agent 1: Instruction Analysis

**Task Type**: `analyse_document`  
**Purpose**: Parse project briefs and rubrics. Converts unstructured document text → structured goals + grading priorities.

### Input (`context` dict)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_text` | `string` | Yes | Raw text from parsed brief/rubric |
| `document_type` | `string` | Yes | One of: `"brief"`, `"rubric"`, `"combined"` |
| `project_id` | `string` | Yes | Unique project identifier |

### Output (`result` dict)

| Field | Type | Description |
|-------|------|-------------|
| `structured_goals` | `list[dict]` | Extracted and categorized project goals |
| `grading_priorities` | `list[dict]` | Rubric criteria ranked by importance |
| `ambiguities` | `list[string]` | Identified unclear requirements |
| `confidence_score` | `float` | 0.0-1.0, confidence in extraction |
| `escalation_required` | `boolean` | True if confidence < 0.6 |
| `escalation_reason` | `string` | Reason for escalation (if required) |

### Input JSON Structure

```json
{
  "task_type": "analyse_document",
  "context": {
    "document_text": "Build a web application with user authentication, database, and REST API. Requirements: Users must be able to sign up, log in, and manage their profiles. The system should support role-based access control. Timeline: 3 weeks, Team: 4 people.",
    "document_type": "brief",
    "project_id": "proj_123"
  }
}
```

### Output JSON Structure

```json
{
  "agent": "instruction_analysis",
  "status": "success",
  "result": {
    "structured_goals": [
      {
        "id": "G1",
        "title": "User Authentication System",
        "description": "Implement sign up and login functionality",
        "priority": "high",
        "category": "core_feature"
      },
      {
        "id": "G2",
        "title": "User Profile Management",
        "description": "Allow users to manage their profile information",
        "priority": "high",
        "category": "core_feature"
      },
      {
        "id": "G3",
        "title": "Role-Based Access Control",
        "description": "Implement RBAC for different user roles",
        "priority": "medium",
        "category": "security"
      },
      {
        "id": "G4",
        "title": "REST API",
        "description": "Build REST endpoints for all features",
        "priority": "high",
        "category": "infrastructure"
      },
      {
        "id": "G5",
        "title": "Database Design",
        "description": "Design and implement database schema",
        "priority": "high",
        "category": "infrastructure"
      }
    ],
    "grading_priorities": [
      {
        "criterion": "Authentication Implementation",
        "weight": 0.25,
        "description": "Completeness of sign up/login features"
      },
      {
        "criterion": "Database Design",
        "weight": 0.20,
        "description": "Proper schema and relationships"
      },
      {
        "criterion": "API Functionality",
        "weight": 0.20,
        "description": "All endpoints working correctly"
      },
      {
        "criterion": "Code Quality",
        "weight": 0.15,
        "description": "Clean, maintainable code"
      },
      {
        "criterion": "Documentation",
        "weight": 0.10,
        "description": "README and API documentation"
      },
      {
        "criterion": "Testing",
        "weight": 0.10,
        "description": "Unit and integration tests"
      }
    ],
    "ambiguities": [
      "What database system should be used?",
      "What authentication method: JWT, sessions, or OAuth?",
      "Should email verification be required?"
    ],
    "confidence_score": 0.87,
    "escalation_required": false,
    "escalation_reason": null
  },
  "executed_at": "2026-04-24T10:30:15.234Z",
  "duration_seconds": 2.15
}
```

---

## Agent 2: Planning

**Task Type**: `generate_plan`  
**Purpose**: Decompose structured goals into tasks, milestones, and dependency graphs. Dynamically replans when project state changes.

### Input (`context` dict)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `structured_goals` | `list[dict]` | Yes | Output from InstructionAnalysisAgent |
| `team_size` | `int` | Yes | Number of team members |
| `deadline_date` | `string` | Yes | ISO date string (e.g., `"2026-05-15"`) |
| `project_start_date` | `string` | Yes | ISO date string (e.g., `"2026-04-24"`) |
| `existing_tasks` | `list[dict]` | No | For replanning scenarios; can be empty |
| `days_available` | `int` | No | Days until deadline; calculated if omitted |

### Output (`result` dict)

| Field | Type | Description |
|-------|------|-------------|
| `tasks` | `list[dict]` | Task objects with `id`, `title`, `description`, `status`, `estimated_hours`, `dependencies`, `assigned_to` |
| `total_estimated_hours` | `float` | Sum of all task estimates |
| `milestones` | `list[dict]` | Key milestones with target dates |
| `dependency_graph` | `dict` | Task dependencies mapping |
| `capacity_analysis` | `dict` | See below |

### Capacity Analysis Substructure

```json
{
  "total_estimated_hours": 120,
  "team_capacity_hours": 112,  // team_size * days_available * 2 hrs/day
  "overloaded": true
}
```

### Input JSON Structure

```json
{
  "task_type": "generate_plan",
  "context": {
    "structured_goals": [
      {
        "id": "G1",
        "title": "User Authentication System",
        "description": "Implement sign up and login functionality",
        "priority": "high",
        "category": "core_feature"
      },
      {
        "id": "G2",
        "title": "Database Design",
        "description": "Design and implement database schema",
        "priority": "high",
        "category": "infrastructure"
      },
      {
        "id": "G3",
        "title": "Role-Based Access Control",
        "description": "Implement RBAC for different user roles",
        "priority": "medium",
        "category": "security"
      }
    ],
    "team_size": 4,
    "deadline_date": "2026-05-15",
    "project_start_date": "2026-04-24",
    "existing_tasks": [],
    "days_available": 21
  }
}
```

### Output JSON Structure

```json
{
  "agent": "planning",
  "status": "success",
  "result": {
    "tasks": [
      {
        "id": "T1",
        "title": "Setup project structure and dependencies",
        "description": "Initialize version control, install dependencies, setup CI/CD",
        "status": "pending",
        "estimated_hours": 4,
        "dependencies": [],
        "assigned_to": null,
        "phase": "setup",
        "priority": "high"
      },
      {
        "id": "T2",
        "title": "Design database schema",
        "description": "Create tables for users, roles, permissions",
        "status": "pending",
        "estimated_hours": 8,
        "dependencies": ["T1"],
        "assigned_to": null,
        "phase": "design",
        "priority": "high"
      },
      {
        "id": "T3",
        "title": "Implement authentication endpoints",
        "description": "Sign up, login, logout endpoints with JWT",
        "status": "pending",
        "estimated_hours": 12,
        "dependencies": ["T1", "T2"],
        "assigned_to": null,
        "phase": "implementation",
        "priority": "high"
      },
      {
        "id": "T4",
        "title": "Implement user profile endpoints",
        "description": "CRUD operations for user profiles",
        "status": "pending",
        "estimated_hours": 10,
        "dependencies": ["T3"],
        "assigned_to": null,
        "phase": "implementation",
        "priority": "high"
      },
      {
        "id": "T5",
        "title": "Implement RBAC system",
        "description": "Role assignment and permission checking",
        "status": "pending",
        "estimated_hours": 12,
        "dependencies": ["T2", "T3"],
        "assigned_to": null,
        "phase": "implementation",
        "priority": "medium"
      },
      {
        "id": "T6",
        "title": "Write unit tests",
        "description": "Test all endpoints and business logic",
        "status": "pending",
        "estimated_hours": 16,
        "dependencies": ["T3", "T4", "T5"],
        "assigned_to": null,
        "phase": "testing",
        "priority": "medium"
      },
      {
        "id": "T7",
        "title": "Write API documentation",
        "description": "Document all endpoints, request/response formats",
        "status": "pending",
        "estimated_hours": 6,
        "dependencies": ["T3", "T4", "T5"],
        "assigned_to": null,
        "phase": "documentation",
        "priority": "low"
      },
      {
        "id": "T8",
        "title": "Integration testing and bug fixes",
        "description": "End-to-end testing and bug fixes",
        "status": "pending",
        "estimated_hours": 8,
        "dependencies": ["T6"],
        "assigned_to": null,
        "phase": "testing",
        "priority": "high"
      }
    ],
    "total_estimated_hours": 76,
    "milestones": [
      {
        "id": "M1",
        "title": "Setup Complete",
        "target_date": "2026-04-26",
        "tasks": ["T1"]
      },
      {
        "id": "M2",
        "title": "Database Schema Finalized",
        "target_date": "2026-04-29",
        "tasks": ["T2"]
      },
      {
        "id": "M3",
        "title": "Core Implementation Complete",
        "target_date": "2026-05-08",
        "tasks": ["T3", "T4", "T5"]
      },
      {
        "id": "M4",
        "title": "Testing Complete",
        "target_date": "2026-05-13",
        "tasks": ["T6", "T8"]
      },
      {
        "id": "M5",
        "title": "Ready for Submission",
        "target_date": "2026-05-15",
        "tasks": ["T7"]
      }
    ],
    "dependency_graph": {
      "T1": [],
      "T2": ["T1"],
      "T3": ["T1", "T2"],
      "T4": ["T3"],
      "T5": ["T2", "T3"],
      "T6": ["T3", "T4", "T5"],
      "T7": ["T3", "T4", "T5"],
      "T8": ["T6"]
    },
    "capacity_analysis": {
      "total_estimated_hours": 76,
      "team_capacity_hours": 168,
      "overloaded": false,
      "hours_per_person": 19,
      "capacity_utilization_percent": 45.2
    }
  },
  "executed_at": "2026-04-24T10:32:45.567Z",
  "duration_seconds": 3.42
}
```

---

## Agent 3: Coordination

**Task Type**: `coordinate_team`  
**Purpose**: Assign roles, balance workload, generate meeting agendas, and track contribution fairness across team members.

### Input (`context` dict)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `members` | `list[dict]` | Yes | Team members: `{id, name, skills, contribution_score}` |
| `tasks` | `list[dict]` | Yes | Current task list from PlanningAgent |
| `activity_history` | `list[dict]` | Yes | Recent contribution events |
| `project_phase` | `string` | Yes | One of: `"kickoff"`, `"execution"`, `"review"`, `"submission"` |

### Output (`result` dict)

| Field | Type | Description |
|-------|------|-------------|
| `role_assignments` | `list[dict]` | Assignments with `member_id`, `role`, `tasks`, `workload_hours` |
| `meeting_agenda` | `dict` | Agenda items and timing for next meeting |
| `fairness_index` | `float` | Jain's fairness index (0.0-1.0) for workload distribution |
| `contribution_balance` | `list[dict]` | Per-member contribution status |
| `recommendations` | `list[string]` | Team coordination improvements |

### Input JSON Structure

```json
{
  "task_type": "coordinate_team",
  "context": {
    "members": [
      {
        "id": "M1",
        "name": "Alice",
        "skills": ["backend", "database", "devops"],
        "contribution_score": 8.5,
        "availability": "full-time",
        "experience_level": "senior"
      },
      {
        "id": "M2",
        "name": "Bob",
        "skills": ["frontend", "ui", "testing"],
        "contribution_score": 7.8,
        "availability": "full-time",
        "experience_level": "mid"
      },
      {
        "id": "M3",
        "name": "Charlie",
        "skills": ["backend", "api", "documentation"],
        "contribution_score": 6.5,
        "availability": "full-time",
        "experience_level": "junior"
      },
      {
        "id": "M4",
        "name": "Diana",
        "skills": ["frontend", "design", "testing"],
        "contribution_score": 7.2,
        "availability": "part-time",
        "experience_level": "mid"
      }
    ],
    "tasks": [
      {
        "id": "T1",
        "title": "Setup project structure",
        "estimated_hours": 4,
        "priority": "high",
        "skills_required": ["devops", "backend"]
      },
      {
        "id": "T2",
        "title": "Design database schema",
        "estimated_hours": 8,
        "priority": "high",
        "skills_required": ["database", "backend"]
      },
      {
        "id": "T3",
        "title": "Implement authentication",
        "estimated_hours": 12,
        "priority": "high",
        "skills_required": ["backend", "api"]
      }
    ],
    "activity_history": [
      {
        "member_id": "M1",
        "action": "commit",
        "timestamp": "2026-04-24T10:15:00Z"
      },
      {
        "member_id": "M2",
        "action": "pr_review",
        "timestamp": "2026-04-24T09:30:00Z"
      },
      {
        "member_id": "M3",
        "action": "commit",
        "timestamp": "2026-04-23T14:20:00Z"
      }
    ],
    "project_phase": "execution"
  }
}
```

### Output JSON Structure

```json
{
  "agent": "coordination",
  "status": "success",
  "result": {
    "role_assignments": [
      {
        "member_id": "M1",
        "name": "Alice",
        "role": "Tech Lead / Backend Lead",
        "assigned_tasks": ["T1", "T2"],
        "workload_hours": 12,
        "percentage_utilized": 35.3,
        "rationale": "Senior backend experience, excellent contribution score"
      },
      {
        "member_id": "M2",
        "name": "Bob",
        "role": "Frontend Lead",
        "assigned_tasks": ["T4", "T5"],
        "workload_hours": 14,
        "percentage_utilized": 41.2,
        "rationale": "Frontend specialist, good testing background"
      },
      {
        "member_id": "M3",
        "name": "Charlie",
        "role": "Backend Developer",
        "assigned_tasks": ["T3", "T7"],
        "workload_hours": 18,
        "percentage_utilized": 52.9,
        "rationale": "Backend skills, with mentorship from Alice"
      },
      {
        "member_id": "M4",
        "name": "Diana",
        "role": "Frontend Developer / QA",
        "assigned_tasks": ["T5", "T6"],
        "workload_hours": 12,
        "percentage_utilized": 35.3,
        "rationale": "Part-time availability, frontend + testing skills"
      }
    ],
    "meeting_agenda": {
      "next_meeting_date": "2026-04-25T10:00:00Z",
      "duration_minutes": 45,
      "items": [
        {
          "topic": "Project kickoff and roles confirmation",
          "time_minutes": 10,
          "owner": "M1"
        },
        {
          "topic": "Database schema review",
          "time_minutes": 15,
          "owner": "M1"
        },
        {
          "topic": "Frontend setup and design system",
          "time_minutes": 10,
          "owner": "M2"
        },
        {
          "topic": "Testing strategy",
          "time_minutes": 10,
          "owner": "M4"
        }
      ]
    },
    "fairness_index": 0.978,
    "contribution_balance": [
      {
        "member_id": "M1",
        "name": "Alice",
        "workload_score": 0.95,
        "contribution_score": 0.98,
        "balance_status": "well-balanced"
      },
      {
        "member_id": "M2",
        "name": "Bob",
        "workload_score": 0.88,
        "contribution_score": 0.92,
        "balance_status": "well-balanced"
      },
      {
        "member_id": "M3",
        "name": "Charlie",
        "workload_score": 0.75,
        "contribution_score": 0.78,
        "balance_status": "needs-monitoring"
      },
      {
        "member_id": "M4",
        "name": "Diana",
        "workload_score": 0.85,
        "contribution_score": 0.87,
        "balance_status": "well-balanced"
      }
    ],
    "recommendations": [
      "Pair Charlie with Alice for mentorship on backend tasks",
      "Schedule pair programming sessions between frontend and backend teams",
      "Monitor Charlie's progress closely; offer additional support if needed",
      "Plan daily standup meetings to maintain momentum"
    ]
  },
  "executed_at": "2026-04-24T10:35:20.890Z",
  "duration_seconds": 2.87
}
```

---

## Agent 4: Risk Detection

**Task Type**: `detect_risks`  
**Purpose**: Continuously monitor project state to detect inactivity, deadline risks, ambiguity, and dependency blockers. Triggers recovery workflows when thresholds are breached.

### Input (`context` dict)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | `string` | Yes | Project identifier |
| `tasks` | `list[dict]` | Yes | With `status` and `completion_pct` fields |
| `members` | `list[dict]` | Yes | With `last_activity_at` fields (ISO datetime) |
| `deadline_date` | `string` | Yes | ISO date string |
| `current_date` | `string` | Yes | ISO date string (for comparison) |
| `decision_history` | `list[dict]` | No | Past GLM decisions for this project |

### Thresholds

- **Inactivity Threshold**: 2 days
- **High Failure Probability**: ≥ 50%
- **Critical Failure Probability**: ≥ 75%

### Output (`result` dict)

| Field | Type | Description |
|-------|------|-------------|
| `project_health` | `string` | One of: `"on_track"`, `"at_risk"`, `"critical"` |
| `deadline_failure_probability` | `float` | 0.0-1.0 probability of missing deadline |
| `identified_risks` | `list[dict]` | Risk objects with `type`, `severity`, `description` |
| `inactive_members` | `list[string]` | Member IDs inactive > 2 days |
| `inactivity_alert` | `boolean` | True if any inactive members |
| `auto_recovery_triggered` | `boolean` | True if failure_prob ≥ 50% |
| `recovery_urgency` | `string` | One of: `"immediate"`, `"soon"`, `"monitor"` |
| `recommended_actions` | `list[string]` | Recovery steps if triggered |

### Input JSON Structure

```json
{
  "task_type": "detect_risks",
  "context": {
    "project_id": "proj_123",
    "tasks": [
      {
        "id": "T1",
        "title": "Setup project structure",
        "status": "completed",
        "completion_pct": 100
      },
      {
        "id": "T2",
        "title": "Design database schema",
        "status": "in_progress",
        "completion_pct": 50
      },
      {
        "id": "T3",
        "title": "Implement authentication",
        "status": "pending",
        "completion_pct": 0
      },
      {
        "id": "T4",
        "title": "Write tests",
        "status": "pending",
        "completion_pct": 0
      }
    ],
    "members": [
      {
        "id": "M1",
        "name": "Alice",
        "last_activity_at": "2026-04-24T10:00:00Z"
      },
      {
        "id": "M2",
        "name": "Bob",
        "last_activity_at": "2026-04-22T14:30:00Z"
      },
      {
        "id": "M3",
        "name": "Charlie",
        "last_activity_at": "2026-04-20T09:15:00Z"
      },
      {
        "id": "M4",
        "name": "Diana",
        "last_activity_at": "2026-04-24T08:45:00Z"
      }
    ],
    "deadline_date": "2026-05-15",
    "current_date": "2026-04-24",
    "decision_history": []
  }
}
```

### Output JSON Structure

```json
{
  "agent": "risk_detection",
  "status": "success",
  "result": {
    "project_health": "at_risk",
    "deadline_failure_probability": 0.58,
    "identified_risks": [
      {
        "id": "R1",
        "type": "inactivity",
        "severity": "high",
        "member_id": "M3",
        "member_name": "Charlie",
        "description": "No activity for 4 days (last activity: 2026-04-20)",
        "impact": "Could cause blockers if assigned to critical path tasks",
        "recommended_action": "Check in with Charlie, offer support, reassign if needed"
      },
      {
        "id": "R2",
        "type": "inactivity",
        "severity": "medium",
        "member_id": "M2",
        "member_name": "Bob",
        "description": "No activity for 2 days (last activity: 2026-04-22)",
        "impact": "Potential slowdown on assigned tasks",
        "recommended_action": "Follow up with Bob on progress"
      },
      {
        "id": "R3",
        "type": "deadline_risk",
        "severity": "high",
        "description": "Current pace suggests 58% chance of missing May 15 deadline",
        "impact": "Only 50% of tasks are on track or complete",
        "recommended_action": "Accelerate critical path tasks, consider scope reduction"
      },
      {
        "id": "R4",
        "type": "dependency_blocker",
        "severity": "medium",
        "description": "T3 and T4 depend on T2 completion (currently 50% done)",
        "impact": "Backend work cannot start until database schema finalized",
        "recommended_action": "Ensure T2 completion by 2026-04-28"
      }
    ],
    "inactive_members": [
      {
        "member_id": "M3",
        "name": "Charlie",
        "days_inactive": 4,
        "last_activity": "2026-04-20T09:15:00Z"
      },
      {
        "member_id": "M2",
        "name": "Bob",
        "days_inactive": 2,
        "last_activity": "2026-04-22T14:30:00Z"
      }
    ],
    "inactivity_alert": true,
    "auto_recovery_triggered": true,
    "recovery_urgency": "soon",
    "recommended_actions": [
      "Schedule immediate check-in with inactive members",
      "Review task assignments for blockers",
      "Consider scope reduction if deadline risk remains high",
      "Increase communication frequency (daily standups)",
      "Identify and mitigate critical path dependencies",
      "Provide additional resources or support where needed"
    ],
    "daily_completion_rate": 0.045,
    "days_remaining": 21,
    "projected_completion_rate": 0.945,
    "estimated_tasks_by_deadline": 3.8
  },
  "executed_at": "2026-04-24T10:38:15.234Z",
  "duration_seconds": 1.92
}
```

---

## Agent 5: Submission Readiness

**Task Type**: `check_submission`  
**Purpose**: Validate rubric coverage, check artifact completeness, and generate a final submission readiness score and checklist.

### Input (`context` dict)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rubric_criteria` | `list[dict]` | Yes | From InstructionAnalysisAgent |
| `completed_deliverables` | `list[string]` | Yes | Titles of completed items |
| `uploaded_artefacts` | `list[string]` | Yes | File names / document titles |
| `project_id` | `string` | Yes | Project identifier |

### Output (`result` dict)

| Field | Type | Description |
|-------|------|-------------|
| `readiness_score` | `int` | 0-100, overall readiness percentage |
| `recommendation` | `string` | One of: `"ready_to_submit"`, `"needs_work"`, `"not_ready"` |
| `rubric_coverage` | `list[dict]` | Coverage per criterion with `status` field |
| `coverage_summary` | `dict` | Counts: `complete`, `partial`, `missing`, `total` |
| `missing_items` | `list[string]` | Specific deliverables or artifacts still needed |
| `submission_checklist` | `list[dict]` | Final checklist items with completion status |

### Scoring Thresholds

- **Ready**: `readiness_score >= 85`
- **Needs Work**: `readiness_score >= 60 and < 85`
- **Not Ready**: `readiness_score < 60`

### Input JSON Structure

```json
{
  "task_type": "check_submission",
  "context": {
    "rubric_criteria": [
      {
        "id": "C1",
        "title": "Working Authentication System",
        "description": "Users can sign up, log in, and log out",
        "weight": 0.25,
        "points": 25
      },
      {
        "id": "C2",
        "title": "Database Design",
        "description": "Proper schema with users, roles, and relationships",
        "weight": 0.20,
        "points": 20
      },
      {
        "id": "C3",
        "title": "API Functionality",
        "description": "All endpoints working correctly with proper responses",
        "weight": 0.20,
        "points": 20
      },
      {
        "id": "C4",
        "title": "Code Quality",
        "description": "Clean, maintainable, well-organized code",
        "weight": 0.15,
        "points": 15
      },
      {
        "id": "C5",
        "title": "Documentation",
        "description": "README and API documentation complete",
        "weight": 0.10,
        "points": 10
      },
      {
        "id": "C6",
        "title": "Testing",
        "description": "Unit and integration tests with good coverage",
        "weight": 0.10,
        "points": 10
      }
    ],
    "completed_deliverables": [
      "Authentication System",
      "Database Schema",
      "User API Endpoints",
      "README Documentation"
    ],
    "uploaded_artefacts": [
      "src/auth/auth.py",
      "src/models/user.py",
      "src/routes/auth.py",
      "src/routes/users.py",
      "database/schema.sql",
      "README.md",
      "requirements.txt",
      "tests/test_auth.py"
    ],
    "project_id": "proj_123"
  }
}
```

### Output JSON Structure

```json
{
  "agent": "submission_readiness",
  "status": "success",
  "result": {
    "readiness_score": 82,
    "recommendation": "needs_work",
    "rubric_coverage": [
      {
        "criterion_id": "C1",
        "criterion_name": "Working Authentication System",
        "status": "complete",
        "score": 25,
        "evidence": [
          "Sign up endpoint working",
          "Login endpoint working with JWT",
          "Logout functionality implemented"
        ],
        "feedback": "Full marks: All authentication features implemented correctly"
      },
      {
        "criterion_id": "C2",
        "criterion_name": "Database Design",
        "status": "complete",
        "score": 20,
        "evidence": [
          "Users table with proper fields",
          "Roles and permissions tables",
          "Foreign key relationships defined"
        ],
        "feedback": "Full marks: Schema is well-designed and normalized"
      },
      {
        "criterion_id": "C3",
        "criterion_name": "API Functionality",
        "status": "partial",
        "score": 18,
        "evidence": [
          "User CRUD endpoints working",
          "Authentication endpoints functional",
          "Missing: profile update endpoint"
        ],
        "feedback": "Mostly complete: Missing some endpoints, but core functionality works"
      },
      {
        "criterion_id": "C4",
        "criterion_name": "Code Quality",
        "status": "partial",
        "score": 12,
        "evidence": [
          "Well-organized structure",
          "Some code duplication in validation",
          "Inconsistent naming in some areas"
        ],
        "feedback": "Good structure but some refactoring needed"
      },
      {
        "criterion_id": "C5",
        "criterion_name": "Documentation",
        "status": "partial",
        "score": 7,
        "evidence": [
          "README provided",
          "Missing: API endpoint documentation"
        ],
        "feedback": "Basic documentation present but needs API docs"
      },
      {
        "criterion_id": "C6",
        "criterion_name": "Testing",
        "status": "missing",
        "score": 0,
        "evidence": [],
        "feedback": "No test coverage found"
      }
    ],
    "coverage_summary": {
      "complete": 2,
      "partial": 3,
      "missing": 1,
      "total": 6
    },
    "missing_items": [
      "Integration tests",
      "Profile update endpoint",
      "API endpoint documentation",
      "Performance testing"
    ],
    "submission_checklist": [
      {
        "item": "All authentication features implemented",
        "status": "complete",
        "priority": "high"
      },
      {
        "item": "Database schema finalized",
        "status": "complete",
        "priority": "high"
      },
      {
        "item": "Core API endpoints functional",
        "status": "complete",
        "priority": "high"
      },
      {
        "item": "Code follows style guide",
        "status": "in_progress",
        "priority": "medium"
      },
      {
        "item": "All endpoints documented",
        "status": "pending",
        "priority": "high"
      },
      {
        "item": "Unit tests written",
        "status": "pending",
        "priority": "medium"
      },
      {
        "item": "Integration tests written",
        "status": "pending",
        "priority": "medium"
      },
      {
        "item": "README complete",
        "status": "complete",
        "priority": "low"
      }
    ],
    "areas_of_concern": [
      "No test coverage detected - high priority to add before submission",
      "Missing profile management endpoints",
      "API documentation incomplete"
    ],
    "strengths": [
      "Strong authentication implementation",
      "Well-designed database schema",
      "Good code organization",
      "Working core functionality"
    ],
    "suggested_improvements": [
      "Add comprehensive test suite (target >80% coverage)",
      "Complete API endpoint documentation",
      "Implement missing endpoints (profile management)",
      "Refactor duplicate validation code",
      "Add integration tests for workflows"
    ]
  },
  "executed_at": "2026-04-24T10:40:50.567Z",
  "duration_seconds": 2.34
}
```

---

## API Endpoint Reference

### Run Specific Agent

**Endpoint**: `POST /api/agents/run`

**Request Body**:
```json
{
  "task_type": "analyse_document|generate_plan|coordinate_team|detect_risks|check_submission",
  "context": { /* agent-specific context dict */ }
}
```

**Response**: 
- On success: Standard response envelope with `status: "success"`
- On error: Standard response envelope with `status: "error"` and `error` message

### List Available Agent Types

**Endpoint**: `GET /api/agents/types`

**Response**:
```json
{
  "available_task_types": [
    "analyse_document",
    "generate_plan",
    "coordinate_team",
    "detect_risks",
    "check_submission"
  ]
}
```

---

## Error Handling

All agents return HTTP 422 (Unprocessable Entity) with error details if:
- Invalid `task_type` is provided
- Required context fields are missing
- Agent execution fails
- Invalid input values

Example error response:
```json
{
  "agent": "instruction_analysis",
  "status": "error",
  "error": "Unknown task type: 'invalid_type'. Valid types: ['analyse_document', 'generate_plan', 'coordinate_team', 'detect_risks', 'check_submission']",
  "executed_at": "2026-04-24T10:30:00+00:00"
}
```

---

## Integration Notes

1. **Sequential Execution**: Typically agents are called in order:
   - `analyse_document` → `generate_plan` → `coordinate_team`
   - `detect_risks` → (runs continuously)
   - `check_submission` → (near end of project)

2. **Context Chaining**: Output from one agent often feeds into the next agent's input context.

3. **Async Execution**: All agents execute asynchronously; use `executed_at` and `duration_seconds` for monitoring.

4. **Logging**: All agent execution is logged with start, completion, and error details.
