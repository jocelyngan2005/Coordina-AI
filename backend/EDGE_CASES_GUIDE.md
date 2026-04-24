# Edge Case Handlers: Implementation & Testing Guide

## Status: COMPLETE ✅

**All 46 unit tests passing** | **Integrated with WorkflowEngine** | **4 handlers operational**

---

## Quick Summary

Your edge case handlers are **production-ready** and now **integrated into the workflow engine**:

| Handler | Purpose | Trigger | Status |
|---------|---------|---------|--------|
| **AmbiguityResolver** | Generates clarification questions when requirements are unclear | `confidence_score < 0.6` or ambiguities detected | ✅ Integrated |
| **MissingDataHandler** | Fills missing fields with safe defaults | Any missing required context | ✅ Ready |
| **InactivityDetector** | Flags inactive team members | Runs every risk check | ✅ Integrated |
| **DeadlineRecovery** | Generates recovery plans when deadline at risk | `deadline_failure_probability > 0.5` | ✅ Integrated |

---

## Integration Points in WorkflowEngine

### 1. **Analysis Stage** (`run_analysis()`)
```
InstructionAnalysisAgent → [ambiguities detected?] → AmbiguityResolver
    ↓
Store: structured_goals, rubric_criteria, ambiguities, ambiguity_resolution
Publish: analysis_complete, ambiguities_detected (if triggered)
```

### 2. **Risk Check Stage** (`run_risk_check()`)
```
RiskDetectionAgent → [check members] → InactivityDetector
               ↓
          [failure probability > 50%?] → DeadlineRecovery
               ↓
Publish: inactivity_detected, recovery_plan_generated, recovery_triggered
```

---

## How to Test Each Edge Case

### Test 1: Ambiguity Resolution

**Scenario:** Project brief with low confidence score

```python
# In your integration test or manual validation:
project_brief = """
Build an AI system using... (framework not specified)
Deliverables: TBD
Deadline: When ready
"""

# Expected flow:
# 1. InstructionAnalysisAgent returns confidence_score=0.5
# 2. AmbiguityResolver.resolve() is called
# 3. result contains ambiguity_resolution with:
#    - clarification_questions: ["Which framework?", ...]
#    - working_assumptions: [{assumption: "...", confidence: 0.x}, ...]
#    - can_proceed: True/False
# 4. Event published: ambiguities_detected
```

**Validation Command:**
```bash
pytest tests/unit/test_edge_cases.py::TestAmbiguityResolver -v
```

**Expected Result:** ✅ 9 tests passing

---

### Test 2: Inactive Member Detection

**Scenario:** Team member hasn't been active for 5+ days

```python
# Configuration (in inactivity_detector.py):
INACTIVITY_WARN_DAYS = 2      # Yellow alert
INACTIVITY_CRITICAL_DAYS = 4  # Red alert + triggers redistribution

# InactivityDetector.scan() returns:
{
    "inactive_members": [
        {
            "member_id": "m1",
            "name": "Alice",
            "days_since_activity": 5,
            "severity": "critical"  # "warn" or "critical"
        }
    ],
    "active_members": ["m2", "m3"],
    "redistribution_needed": True  # Triggers only for "critical"
}

# Event published: inactivity_detected
```

**Validation Command:**
```bash
pytest tests/unit/test_edge_cases.py::TestInactivityDetector -v
```

**Expected Result:** ✅ 12 tests passing

---

### Test 3: Deadline Recovery

**Scenario:** Risk analysis shows 80% probability of missing deadline

```python
# RiskDetectionAgent returns:
{
    "deadline_failure_probability": 0.8,  # > 50% threshold
    "auto_recovery_triggered": True
}

# DeadlineRecovery.generate_recovery_plan() returns:
{
    "tasks_to_cut": ["T4", "T5"],        # Drop low-impact tasks
    "tasks_to_compress": [
        {"task_id": "T2", "new_estimated_hours": 4}  # Reduce from 6
    ],
    "priority_order": ["T1", "T3", "T2"],  # Reorder by impact
    "recovery_message": "Cut non-critical tasks, compress others..."
}

# Events published:
# 1. recovery_plan_generated
# 2. recovery_triggered (if auto_recovery_triggered=True)
```

**Validation Command:**
```bash
pytest tests/unit/test_edge_cases.py::TestDeadlineRecovery -v
```

**Expected Result:** ✅ 10 tests passing

---

### Test 4: Missing Data Handling

**Scenario:** Project submitted without deadline, team size, or rubric

```python
# MissingDataHandler.fill_defaults() returns:
{
    "deadline_date": "14 days from today",    # Default
    "team_size": 3,                           # Default
    "document_type": "brief",                 # Default
    "rubric_criteria": [],                    # Empty default
    "members": [],                            # Empty default
    "_filled_defaults": ["deadline_date", "team_size", ...],
    "_data_completeness": 0.2  # 1 of 5 fields provided
}

# get_uncertainty_flags() returns:
[
    "No deadline specified — estimated at 14 days. Please confirm.",
    "Team size unknown — defaulting to 3 members.",
    "No rubric provided — grading priorities cannot be verified."
]
```

**Validation Command:**
```bash
pytest tests/unit/test_edge_cases.py::TestMissingDataHandler -v
```

**Expected Result:** ✅ 15 tests passing

---

## Manual End-to-End Validation

### Step 1: Test Analysis with Ambiguities

```python
from orchestrator.workflow_engine import WorkflowEngine

engine = WorkflowEngine()

# Run with ambiguous brief
result = await engine.run_analysis(
    project_id="test-001",
    document_text="Build something cool. TBD.",
    document_type="brief"
)

# Check result
print(result["result"].get("ambiguity_resolution"))
# Expected: Contains clarification_questions, working_assumptions
```

### Step 2: Test Risk Check with Inactive Members

```python
# Mock a project with inactive team member
state = {
    "project_id": "test-001",
    "members": [
        {"id": "m1", "name": "Alice"},
        {"id": "m2", "name": "Bob"},  # Inactive for 5 days
    ],
    "tasks": [...],
    "deadline_date": "2025-12-01"
}

# Save state to mock storage
await engine.state_manager.save("test-001", state)

# Run risk check
risk_output = await engine.run_risk_check("test-001")

# Check for inactivity report
inactivity_report = risk_output.get("last_risk_report", {}).get("inactivity_report")
print(inactivity_report)
# Expected: inactive_members list with severity info
```

### Step 3: Test Deadline Recovery Trigger

```python
# Run risk check that detects high deadline failure probability
risk_output = await engine.run_risk_check("test-001")

# Check for recovery plan
recovery_plan = risk_output.get("last_risk_report", {}).get("recovery_plan")
if recovery_plan:
    print("Recovery plan generated:")
    print(f"  Tasks to cut: {recovery_plan['tasks_to_cut']}")
    print(f"  Tasks to compress: {recovery_plan['tasks_to_compress']}")
    print(f"  Priority order: {recovery_plan['priority_order']}")
```

---

## Event Bus Monitoring

Edge case handlers publish events that your frontend can subscribe to:

```python
# Events published by edge case integration:

# 1. Ambiguities detected
WorkflowEvent(
    project_id="proj-001",
    event_type="ambiguities_detected",
    payload={
        "ambiguity_count": 2,
        "confidence_score": 0.5,
        "can_proceed": True,
        "clarification_questions": ["Question 1", "Question 2"]
    }
)

# 2. Inactive members detected
WorkflowEvent(
    project_id="proj-001",
    event_type="inactivity_detected",
    payload={
        "inactive_members": [...],
        "redistribution_needed": True
    }
)

# 3. Recovery plan generated
WorkflowEvent(
    project_id="proj-001",
    event_type="recovery_plan_generated",
    payload={
        "tasks_to_cut": ["T4"],
        "tasks_to_compress": [...],
        "priority_order": [...],
        "recovery_message": "..."
    }
)

# 4. Recovery triggered
WorkflowEvent(
    project_id="proj-001",
    event_type="recovery_triggered",
    payload={...}  # Full risk report
)
```

---

## Running All Edge Case Tests

```bash
# All 46 unit tests
pytest tests/unit/test_edge_cases.py -v

# By category:
pytest tests/unit/test_edge_cases.py::TestAmbiguityResolver -v       # 9 tests
pytest tests/unit/test_edge_cases.py::TestMissingDataHandler -v      # 15 tests
pytest tests/unit/test_edge_cases.py::TestInactivityDetector -v      # 12 tests
pytest tests/unit/test_edge_cases.py::TestDeadlineRecovery -v        # 10 tests
```

---

## Integration with Your Frontend

### WebSocket Events to Display

When the frontend connects to WebSocket, it receives edge case events:

```typescript
// Frontend WebSocket listener
ws.on("ambiguities_detected", (event) => {
    // Show clarification questions dialog
    showClarificationDialog(event.clarification_questions);
});

ws.on("inactivity_detected", (event) => {
    // Show inactive members alert
    showInactivityAlert(event.inactive_members);
    if (event.redistribution_needed) {
        suggestTeamRebalancing();
    }
});

ws.on("recovery_plan_generated", (event) => {
    // Show recovery recommendations
    showRecoveryPlan(event.tasks_to_cut, event.tasks_to_compress);
});

ws.on("recovery_triggered", (event) => {
    // Notify team of replanning
    notifyTeam("Project replanning in progress...");
});
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    WorkflowEngine                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  run_analysis()                    run_risk_check()    │
│  ├─ InstructionAnalysisAgent       ├─ RiskDetectionAgent
│  └─ AmbiguityResolver*             ├─ InactivityDetector*
│                                     └─ DeadlineRecovery*
│                                                          │
│  * Edge case handlers (now integrated)                  │
└─────────────────────────────────────────────────────────┘
         ↓                                    ↓
    StateManager                         EventBus
    └─ Save state                        └─ Publish events
       with edge case data                  for frontend
```

---

## Checklist for Production

- [x] All 46 unit tests passing
- [x] AmbiguityResolver integrated into run_analysis()
- [x] InactivityDetector integrated into run_risk_check()
- [x] DeadlineRecovery integrated into run_risk_check()
- [x] Events published to event bus
- [x] State persisted with edge case data
- [ ] Frontend subscribed to WebSocket edge case events
- [ ] Database schema updated (if needed by teammate)
- [ ] API endpoints for edge case data (if needed)
- [ ] Documentation shared with team

---

## Notes

- **Token Limit**: Ambiguity resolution truncates document to 2000 chars to avoid token overflow
- **Thresholds**:
  - Confidence score < 0.6 triggers ambiguity resolution
  - Inactivity > 4 days = critical (triggers redistribution)
  - Inactivity 2-4 days = warn (informational)
  - Deadline failure probability > 0.5 triggers recovery
- **Safe Defaults**: MissingDataHandler has 14-day default deadline; 3-member team; empty rubric
- **Retry Logic**: GLM client has 3-attempt exponential backoff (2-10s) for resilience

---

## Next Steps

1. **Frontend Integration**: Subscribe to WebSocket events from edge case handlers
2. **API Endpoints**: Add GET endpoints to retrieve edge case data
3. **Database**: Store edge case decisions and resolutions for audit trail
4. **Monitoring**: Add logging/dashboards for edge case frequency and resolution effectiveness
