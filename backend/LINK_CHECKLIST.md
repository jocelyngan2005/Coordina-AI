# Backend-to-Frontend Alignment Checklist

A comprehensive checklist for ensuring backend agent outputs and frontend components are fully aligned and utilizing each other's inputs/outputs correctly.

**Last Updated:** 2026-04-25  
**Status:** In Progress

---

## BACKEND MODIFICATIONS

### 1. Submission Readiness Agent
**File:** `backend/agents/submission_readiness.py` (or equivalent)  
**Priority:** HIGH | **Status:** ⬜ Pending

- [ ] Add `maxScore` field to each rubric coverage item
  - Calculate from: `criterion.points` or derive from rubric metadata
  - Output format: `{ criterion_id, criterion_name, maxScore, score, weight, status, evidence, feedback }`

- [ ] Update system prompt to include scoring rules
  ```
  For each rubric criterion, provide:
  - maxScore: total possible points (e.g., 25)
  - score: points earned so far (e.g., 18)
  - weight: decimal percentage of total grade (e.g., 0.25)
  - status: "covered" | "partial" | "missing"
  ```

**Verification:** Output includes `maxScore` for each rubric item

---

### 2. Planning Agent
**File:** `backend/agents/planning.py` (or equivalent)  
**Priority:** HIGH | **Status:** ⬜ Pending

- [ ] Add `startDate` field to each task
  - Calculate based on: project start date + dependency resolution + capacity planning
  - Format: ISO date string (e.g., "2026-04-24")

- [ ] Add `endDate` (or `dueDate`) field to each task
  - Calculate as: `startDate + (estimated_hours / hours_per_day)`
  - Format: ISO date string

- [ ] Change `assigned_to` from single value to array
  - Old: `"assigned_to": "M1"`
  - New: `"assigned_to": ["M1", "M2"]` (list of member IDs)

- [ ] Ensure `phase` field always present (used as tags)
  - Valid values: `"setup"`, `"design"`, `"implementation"`, `"testing"`, `"documentation"`

- [ ] Update task output structure:
  ```json
  {
    "id": "T1",
    "title": "...",
    "description": "...",
    "status": "pending|in_progress|done",
    "estimated_hours": 4,
    "phase": "setup",
    "priority": "high|medium|low",
    "dependencies": [],
    "assigned_to": ["M1"],
    "startDate": "2026-04-24",
    "endDate": "2026-04-26",
    "percentage_utilized": 0
  }
  ```

**Verification:** Tasks include startDate, endDate, and assigned_to as array

---

### 3. Risk Detection Agent
**File:** `backend/agents/risk_detection.py` (or equivalent)  
**Priority:** HIGH | **Status:** ⬜ Pending

- [ ] Add `recommended_action_type` enum field to each identified risk
  - Valid values: `"member_engagement"` | `"deadline_risk"` | `"scope_issue"` | `"dependency_blocker"` | `"ambiguity"`

- [ ] Update risk output structure:
  ```json
  {
    "id": "R1",
    "type": "inactivity|deadline_risk|dependency_blocker|ambiguity|missing_artifact",
    "severity": "high|medium|low",
    "description": "...",
    "impact": "...",
    "recommended_action_type": "member_engagement",
    "recommended_action": "..."
  }
  ```

- [ ] Update system prompt to include rule:
  ```
  BUTTON ROUTING RULE:
  - recommended_action_type: "member_engagement" → buttons: ["Send Reminder", "Reassign Task"]
  - recommended_action_type: "deadline_risk" → buttons: ["Adjust Timeline", "Escalate"]
  - recommended_action_type: "scope_issue" → buttons: ["Request Clarification", "Flag for Review"]
  - recommended_action_type: "dependency_blocker" → buttons: ["Resolve Dependency", "Replan Tasks"]
  
  Select the type that best fits the recommended_action description.
  ```

**Verification:** Risk alerts include recommended_action_type for button routing

---

### 4. Coordination Agent
**File:** `backend/agents/coordination.py` (or equivalent)  
**Priority:** MEDIUM | **Status:** ⬜ Pending

- [ ] Ensure `contribution_balance` is always included in output
  - Used to populate team member contribution scores on frontend

- [ ] Keep `role_assignments` as-is (contains all needed member data)

- [ ] Verify output includes:
  ```json
  {
    "role_assignments": [{
      "member_id": "M1",
      "name": "Alice",
      "role": "Tech Lead",
      "assigned_tasks": ["T1", "T2"],
      "workload_hours": 12,
      "percentage_utilized": 35.3
    }],
    "contribution_balance": [{
      "member_id": "M1",
      "name": "Alice",
      "workload_score": 0.95,
      "contribution_score": 0.98,
      "balance_status": "well-balanced"
    }]
  }
  ```

**Verification:** Both role_assignments and contribution_balance present in output

---

### 5. Instruction Analysis Agent
**File:** `backend/agents/instruction_analysis.py` (or equivalent)  
**Priority:** LOW | **Status:** ⬜ Pending (Future feature - not displayed yet)

- [ ] Ensure complete output already includes:
  ```json
  {
    "structured_goals": [{ id, title, description, priority, category }],
    "grading_priorities": [{ criterion, weight, description }],
    "ambiguities": ["..."],
    "confidence_score": 0.87,
    "escalation_required": false
  }
  ```
  ✅ This is already well-structured; no changes needed now

**Note:** These outputs are not displayed on frontend yet but should be preserved for future features

---

## FRONTEND MODIFICATIONS

### 6. Update TypeScript Types
**File:** `coordina-ai/src/types/index.ts` or `coordina-ai/src/types.ts`  
**Priority:** HIGH | **Status:** ⬜ Pending

- [ ] Update `Task` interface:
  ```typescript
  interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'done' | 'backlog';
    priority: 'high' | 'medium' | 'low';
    estimated_hours?: number;
    phase?: 'setup' | 'design' | 'implementation' | 'testing' | 'documentation';
    startDate: string;           // NEW - ISO date
    dueDate: string;             // NEW - ISO date (was endDate)
    dependencies: string[];
    assigneeId?: string;         // KEEP - for single selection UI
    assignedTo: string[];        // NEW - array from backend
    tags: string[];
    aiConfidence?: number;       // OPTIONAL - ignore for now
    percentage_utilized?: number;
  }
  ```

- [ ] Update `RubricItem` interface:
  ```typescript
  interface RubricItem {
    id: string;
    criterion: string;
    description?: string;
    status: 'covered' | 'partial' | 'missing';
    score: number;
    maxScore: number;            // NEW
    weight: number;              // NEW - as decimal (0.25)
    evidence?: string;
    feedback?: string;
  }
  ```

- [ ] Update `RiskAlert` interface:
  ```typescript
  interface RiskAlert {
    id: string;
    type: 'inactivity' | 'deadline_risk' | 'dependency_blocker' | 'ambiguity' | 'missing_artifact';
    severity: 'high' | 'medium' | 'low';
    message: string;             // RENAME from description
    detail: string;              // RENAME from impact
    timestamp: string;           // NEW - calculated from executed_at
    recommended_action?: string;
    recommended_action_type?: 'member_engagement' | 'deadline_risk' | 'scope_issue' | 'dependency_blocker' | 'ambiguity';
  }
  ```

- [ ] Update `TeamMember` interface:
  ```typescript
  interface TeamMember {
    id: string;
    name: string;
    role: string;
    skills?: string[];
    initials: string;            // NEW - derived from name
    contributionScore: number;   // 0-100
    workloadScore?: number;      // from contribution_balance
    balance_status?: 'well-balanced' | 'needs-monitoring';
    color?: string;              // for pie chart
  }
  ```

- [ ] Update `Project` interface:
  ```typescript
  interface Project {
    id: string;
    name: string;
    description?: string;
    deadline?: string;           // ISO date
    teamMembers: TeamMember[];
    tasks: Task[];
    completionPct?: number;
    riskScore?: number;          // 0-100
  }
  ```

**Verification:** All interfaces match backend output structure and frontend component needs

---

### 7. Update API Mappers
**File:** `coordina-ai/src/api/mappers.ts`  
**Priority:** HIGH | **Status:** ⬜ Pending

- [ ] Create `mapTasks()` function:
  ```typescript
  function mapTasks(backendTasks: any[]): Task[] {
    return backendTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimated_hours: t.estimated_hours,
      phase: t.phase,
      startDate: t.startDate,
      dueDate: t.endDate || t.dueDate,
      dependencies: t.dependencies,
      assigneeId: t.assigned_to?.[0],
      assignedTo: t.assigned_to || [],
      tags: [t.phase],
    }));
  }
  ```

- [ ] Create `mapRubric()` function:
  ```typescript
  function mapRubric(submissionReport: any): RubricItem[] {
    if (!submissionReport?.result?.rubric_coverage) return [];
    return submissionReport.result.rubric_coverage.map(r => ({
      id: r.criterion_id,
      criterion: r.criterion_name,
      description: r.feedback,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore || 0,
      weight: r.weight,
      evidence: r.evidence?.join('; ') || r.evidence,
      feedback: r.feedback,
    }));
  }
  ```

- [ ] Create `mapRisks()` function:
  ```typescript
  function mapRisks(riskReport: any): RiskAlert[] {
    if (!riskReport?.result?.identified_risks) return [];
    return riskReport.result.identified_risks.map(r => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      message: r.description,
      detail: r.impact,
      timestamp: calculateTimestamp(riskReport.executed_at),
      recommended_action: r.recommended_action,
      recommended_action_type: r.recommended_action_type,
    }));
  }
  
  function calculateTimestamp(executedAt: string): string {
    const executed = new Date(executedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - executed.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return executed.toLocaleDateString();
  }
  ```

- [ ] Create `mapTeamMembers()` function:
  ```typescript
  function mapTeamMembers(
    roleAssignments: any[],
    contributionBalance: any[]
  ): TeamMember[] {
    return roleAssignments.map(assignment => {
      const contribution = contributionBalance.find(
        c => c.member_id === assignment.member_id
      );
      
      return {
        id: assignment.member_id,
        name: assignment.name,
        role: assignment.role,
        initials: deriveInitials(assignment.name),
        contributionScore: contribution?.contribution_score || 0,
        workloadScore: contribution?.workload_score,
        balance_status: contribution?.balance_status,
      };
    });
  }
  
  function deriveInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  ```

- [ ] Update existing `mapProject()` function to use new mappers:
  ```typescript
  function mapProject(
    backendProject: any,
    backendTasks: any[],
    backendMembers: any[],
    completionPct: number,
    riskScore: number
  ): Project {
    return {
      id: backendProject.id,
      name: backendProject.name,
      description: backendProject.description,
      deadline: backendProject.deadline_date,
      teamMembers: mapTeamMembers(backendMembers, []),
      tasks: mapTasks(backendTasks),
      completionPct,
      riskScore,
    };
  }
  ```

- [ ] Update `extractRubric()` to use new `mapRubric()`
- [ ] Update `extractRisks()` to use new `mapRisks()`

**Verification:** All mappers handle edge cases and null values gracefully

---

### 8. Update RubricTracker Component
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** HIGH | **Status:** ⬜ Pending

In `RubricTracker({ rubric })`:

- [ ] Update score display to use `maxScore`:
  ```typescript
  const totalScore = rubric.reduce((s, r) => s + r.score, 0);
  const maxScore = rubric.reduce((s, r) => s + r.maxScore, 0);
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  ```

- [ ] Update progress bar flex basis to use `weight`:
  ```typescript
  {rubric.map((r) => (
    <div
      key={r.id}
      style={{ 
        flex: r.weight,
        background: segColor
      }}
    />
  ))}
  ```

- [ ] Update readiness checklist to show weight as percentage:
  ```typescript
  <p style={...}>
    {r.criterion} <span style={...}>({Math.round(r.weight * 100)}%)</span>
  </p>
  ```

**Verification:** Rubric displays correct score/maxScore ratio and weight percentages

---

### 9. Update NotificationBell Component
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** HIGH | **Status:** ⬜ Pending

In `NotificationBell({ notifications })`:

- [ ] Update risk display to use `message` and `detail`:
  ```typescript
  <p style={{...}}>{risk.message}</p>
  <p style={{...}}>{risk.detail}</p>
  ```

- [ ] Update button routing to use `recommended_action_type`:
  ```typescript
  const actionsByType: Record<string, AlertAction[]> = {
    member_engagement: [
      { label: 'Send Reminder', variant: 'primary' },
      { label: 'Reassign Task', variant: 'ghost' }
    ],
    deadline_risk: [
      { label: 'Adjust Timeline', variant: 'primary' },
      { label: 'Escalate', variant: 'ghost' }
    ],
    scope_issue: [
      { label: 'Request Clarification', variant: 'primary' },
      { label: 'Flag for Review', variant: 'ghost' }
    ],
    dependency_blocker: [
      { label: 'Resolve Dependency', variant: 'primary' },
      { label: 'Replan Tasks', variant: 'ghost' }
    ],
    ambiguity: [
      { label: 'Request Clarification', variant: 'primary' },
      { label: 'Flag for Review', variant: 'ghost' }
    ],
  };
  
  const actions = actionsByType[risk.recommended_action_type] || 
                  actionsByType.scope_issue;
  
  {actions.map((btn) => (
    <button key={btn.label} style={...} onClick={() => handleAction(btn.label)}>
      {btn.label}
    </button>
  ))}
  ```

- [ ] Update timestamp display:
  ```typescript
  <span style={{...}}>{risk.timestamp}</span>
  ```

**Verification:** Risk alerts show correct message/detail and appropriate action buttons

---

### 10. Update GanttTimeline Component
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** HIGH | **Status:** ⬜ Pending

In `GanttTimeline({ tasks })`:

- [ ] Update date parsing to use `startDate` and `dueDate`:
  ```typescript
  const parseDate = (d: string) => new Date(d).getTime();
  const validTasks = tasks.filter((t) => t.startDate && t.dueDate);
  
  const minDate = Math.min(...validTasks.map((t) => parseDate(t.startDate)));
  const maxDate = Math.max(...validTasks.map((t) => parseDate(t.dueDate)));
  
  const toPercent = (d: string) => ((parseDate(d) - minDate) / totalMs) * 100;
  const widthPct = (s: string, e: string) => 
    Math.max(((parseDate(e) - parseDate(s)) / totalMs) * 100, 1.5);
  
  <div
    style={{
      position: 'absolute',
      left: `${toPercent(task.startDate)}%`,
      width: `${widthPct(task.startDate, task.dueDate)}%`,
      ...
    }}
  />
  ```

- [ ] Remove hardcoded tooltip date range, use actual values:
  ```typescript
  <p style={{...}}>
    {tooltip.task.startDate} → {tooltip.task.dueDate}
  </p>
  ```

**Verification:** Gantt timeline shows accurate task dates and respects dependencies

---

### 11. Update AccountabilityAndTasks Component
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** MEDIUM | **Status:** ⬜ Pending

In `AccountabilityAndTasks({ project })`:

- [ ] Update contribution score calculation to use `contributionScore` from TeamMember:
  ```typescript
  const total = members.reduce(
    (s, m) => s + (m.contributionScore || 0), 
    0
  ) || 1;
  
  const slices = members.map((m, i) => {
    const pct = (m.contributionScore || 0) / total;
    // ... rest of slice calculation
  });
  ```

- [ ] Update member list to display correct data:
  ```typescript
  {slices.map((s) => (
    <div key={s.id} style={{...}}>
      <Avatar initials={s.initials} size={24} color={s.color} />
      <span>
        {s.name.split(' ')[0]} 
        <span>· {s.role}</span>
      </span>
      <p>{s.contributionScore}%</p>
    </div>
  ))}
  ```

- [ ] Update task assignment display to handle `assignedTo` array:
  ```typescript
  const m = memberMap[task.assigneeId];
  // Show all assignees in tooltip (future enhancement)
  ```

**Verification:** Team members display with correct contribution scores and pie chart

---

### 12. Update MyTasksCard Component
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** MEDIUM | **Status:** ⬜ Pending

In `MyTasksCard({ tasks })`:

- [ ] Replace hardcoded `MY_MEMBER_ID` with actual user context:
  ```typescript
  const myMemberId = useContext(UserContext)?.memberId || 'm1';
  const myTasks = tasks.filter((t) => t.assignedTo.includes(myMemberId));
  ```

- [ ] Update tags to use `phase` field:
  ```typescript
  {task.tags.map((tag) => (
    <span key={tag} style={{...}}>
      {tag}
    </span>
  ))}
  ```

- [ ] Update due date display:
  ```typescript
  <span style={{...}}>
    {task.dueDate.slice(5)}
  </span>
  ```

**Verification:** Tasks show phase as tags and correct due dates

---

### 13. Replace ArtifactsCard with Submission Checklist
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** HIGH | **Status:** ⬜ Pending

Replace the static `ARTIFACTS` array:

- [ ] Remove hardcoded artifacts:
  ```typescript
  // DELETE:
  const ARTIFACTS = [
    { name: 'Project Brief', status: 'found', file: 'project_brief.pdf' },
    // ...
  ];
  ```

- [ ] Create new data structure from backend submission checklist:
  ```typescript
  interface ChecklistItem {
    item: string;
    status: 'complete' | 'in_progress' | 'pending';
    priority?: 'high' | 'medium' | 'low';
  }
  ```

- [ ] Update `ArtifactsCard()` to use checklist data:
  ```typescript
  function ArtifactsCard({ checklist }: { checklist: ChecklistItem[] }) {
    const completeCount = checklist.filter(c => c.status === 'complete').length;
    
    return (
      <div style={card}>
        <div style={{...}}>
          <SectionTitle>Submission Checklist</SectionTitle>
          <span>{completeCount}/{checklist.length} complete</span>
        </div>
        <div style={{...}}>
          {checklist.map((item) => {
            const isComplete = item.status === 'complete';
            const color = isComplete ? '#274133' : item.status === 'in_progress' ? '#ce9042' : '#9ca3af';
            return (
              <div key={item.item} style={{...}}>
                <svg>
                  <circle stroke={color} fill={isComplete ? color : 'none'} />
                  {isComplete && <polyline points="5,9 8,12 13,6" />}
                  {item.status === 'in_progress' && <path d="..." />}
                </svg>
                <p>{item.item}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  ```

- [ ] Pass checklist to component:
  ```typescript
  <ArtifactsCard checklist={submissionChecklist} />
  ```

**Verification:** Submission checklist displays actual progress from backend

---

### 14. Update ProjectWorkspacePage Data Fetching
**File:** `coordina-ai/src/pages/ProjectWorkspacePage.tsx`  
**Priority:** HIGH | **Status:** ⬜ Pending

In `useEffect(() => { fetchAll() })`:

- [ ] Extract all workflow state data:
  ```typescript
  const workflowState = await workflowApi.getState(projectId);
  
  if (workflowState) {
    const instructionReport = workflowState.instruction_report?.result;
    const planningReport = workflowState.planning_report?.result;
    const mappedTasks = mapTasks(planningReport?.tasks || []);
    
    const coordinationReport = workflowState.coordination_report?.result;
    const mappedMembers = mapTeamMembers(
      coordinationReport?.role_assignments || [],
      coordinationReport?.contribution_balance || []
    );
    
    const submissionReport = workflowState.submission_report?.result;
    const mappedRubric = mapRubric(submissionReport);
    const submissionChecklist = submissionReport?.submission_checklist || [];
    
    const riskReport = workflowState.last_risk_report?.result;
    const mappedRisks = mapRisks(riskReport);
  }
  ```

- [ ] Pass data to state setters:
  ```typescript
  setProject(mapProject(backendProject, mappedTasks, mappedMembers, ...));
  setRubric(mappedRubric);
  setRisks(mappedRisks);
  setSubmissionChecklist(submissionChecklist);
  ```

**Verification:** All workflow state data extracted and properly mapped

---

### 15. Create Initials Utility Function
**File:** `coordina-ai/src/utils/text.ts` (create if not exists)  
**Priority:** MEDIUM | **Status:** ⬜ Pending

- [ ] Create utility file:
  ```typescript
  export function deriveInitials(name: string, maxChars = 2): string {
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, maxChars);
  }
  
  // Usage:
  // deriveInitials("Alex Chen") → "AC"
  // deriveInitials("Priya Sharma") → "PS"
  // deriveInitials("Jordan") → "J"
  ```

- [ ] Import and use in mappers:
  ```typescript
  import { deriveInitials } from '../utils/text';
  
  function mapTeamMembers(...) {
    return roleAssignments.map(a => ({
      // ...
      initials: deriveInitials(a.name),
    }));
  }
  ```

**Verification:** Utility function correctly derives initials from all name formats

---

## FUTURE FEATURES (Roadmap)

**Priority:** LOW | **Status:** 📋 Documented

These agent outputs are already being generated but not displayed on frontend yet:

### Instruction Analysis → Future Display
- [ ] `structured_goals` — "Project Goals Board"
- [ ] `ambiguities` — "Clarification Requests Panel"
- [ ] `confidence_score` — "AI Confidence Meter"

### Planning → Future Display
- [ ] `milestones` — "Milestone Timeline View"
- [ ] `dependency_graph` — "Network Diagram"
- [ ] `capacity_analysis` — "Team Capacity Report"

### Coordination → Future Display
- [ ] `meeting_agenda` — "Next Meeting Details"
- [ ] `fairness_index` — "Workload Fairness Score"
- [ ] `recommendations` — "Team Recommendations Panel"

### Risk Detection → Future Display
- [ ] `daily_completion_rate` — "Velocity Metric"
- [ ] `projected_completion_rate` — "Completion Projection Chart"

**Action:** See `FUTURE_FEATURES.md` for next phase roadmap

---

## TESTING CHECKLIST

Before marking items as complete, verify:

- [ ] Rubric displays with correct score/maxScore ratio
- [ ] Weight percentages add up to 100%
- [ ] Gantt timeline shows accurate task dates
- [ ] Task dependencies are respected in date calculations
- [ ] Risk alerts show correct message/detail text
- [ ] Risk alert action buttons match recommended_action_type
- [ ] Team members display with derived initials
- [ ] Contribution scores reflect backend data
- [ ] Tasks show phase as tags (not aiConfidence)
- [ ] Submission checklist shows actual progress (not static data)
- [ ] All timestamps calculated correctly from backend times
- [ ] No console errors for missing fields
- [ ] UI responsive with new data structure
- [ ] Mock data fallback still works when backend unavailable

---

## SUMMARY TABLE

| Component/File | Change | Priority | Status |
|---|---|---|---|
| Backend: Submission Readiness | Add `maxScore` to rubric | HIGH | ⬜ |
| Backend: Planning | Add dates, array assigned_to | HIGH | ⬜ |
| Backend: Risk Detection | Add `recommended_action_type` | HIGH | ⬜ |
| Frontend: Types | Update all interfaces | HIGH | ⬜ |
| Frontend: Mappers | Create map functions | HIGH | ⬜ |
| Frontend: RubricTracker | Use maxScore & weight | HIGH | ⬜ |
| Frontend: NotificationBell | Use message/detail & action routing | HIGH | ⬜ |
| Frontend: GanttTimeline | Use backend dates | HIGH | ⬜ |
| Frontend: AccountabilityAndTasks | Use contribution scores | MEDIUM | ⬜ |
| Frontend: MyTasksCard | Use phase as tags | MEDIUM | ⬜ |
| Frontend: ArtifactsCard → Checklist | Replace with submission data | HIGH | ⬜ |
| Frontend: Data fetching | Extract all workflow outputs | HIGH | ⬜ |
| Frontend: Utilities | Create deriveInitials() | MEDIUM | ⬜ |

---

## How to Use This Checklist

1. **Mark Progress:** Update checkbox status as items are completed
2. **Track Priority:** Focus on HIGH priority items first
3. **Test Thoroughly:** Run through Testing Checklist after each component
4. **Update Status:** Change status indicator at top of section
   - ⬜ = Pending
   - 🔵 = In Progress
   - ✅ = Complete
5. **Review:** Before deployment, verify all HIGH priority items are complete

---

## Notes

- All file paths are relative to project root
- JSON examples show expected backend output format
- TypeScript examples are pseudo-code; adjust for actual project style
- Ensure backward compatibility with mock data during transition
