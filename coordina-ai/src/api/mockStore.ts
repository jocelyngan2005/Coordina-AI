import {
  MOCK_PROJECT,
  WORST_CASE_PROJECT,
  BEST_CASE_PROJECT,
  NOT_STARTED_PROJECT,
  MOCK_RUBRIC,
  WORST_CASE_RUBRIC,
  BEST_CASE_RUBRIC,
  NOT_STARTED_RUBRIC,
  MOCK_RISKS,
  WORST_CASE_RISKS,
  BEST_CASE_RISKS,
  NOT_STARTED_RISKS,
  MOCK_CHECKLISTS,
} from '../data/mockData';
import type {
  BackendDocument,
  BackendMember,
  BackendProject,
  BackendTask,
  ProjectAnalytics,
  ProjectCreate,
  RunPipelineRequest,
  WorkflowState,
} from './types';

type MemberUpdate = {
  name?: string;
  email?: string;
  skills?: string[];
  contribution_score?: number;
};

type TaskUpdate = Partial<
  Pick<
    BackendTask,
    'status' | 'completion_pct' | 'assignee_id' | 'title' | 'description' | 'priority' | 'due_date'
  >
>;

type DecisionRow = {
  id: string;
  agent: string;
  summary: string;
  executed_at: string;
};

type MockDb = {
  projects: BackendProject[];
  members: BackendMember[];
  tasks: BackendTask[];
  documents: BackendDocument[];
  workflowByProject: Record<string, WorkflowState>;
  decisionsByProject: Record<string, DecisionRow[]>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function dateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sleep(ms = 90): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreToPct(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function readOrThrow<T>(value: T | undefined, errorMessage: string): T {
  if (!value) throw new Error(errorMessage);
  return value;
}

function seedDb(): MockDb {
  return {
    projects: [],
    members: [],
    tasks: [],
    documents: [],
    workflowByProject: {},
    decisionsByProject: {},
  };
}

const db: MockDb = seedDb();

// Templates used by runPipeline — NOT_STARTED_PROJECT is first so the very first
// wizard completion produces the "not started" scenario.
const PIPELINE_TEMPLATES = [NOT_STARTED_PROJECT, MOCK_PROJECT, WORST_CASE_PROJECT, BEST_CASE_PROJECT];
let templateCounter = 0;

// Per-project rubric and risk data keyed by template id
const TEMPLATE_RUBRICS: Record<string, typeof MOCK_RUBRIC> = {
  [MOCK_PROJECT.id]:         MOCK_RUBRIC,
  [WORST_CASE_PROJECT.id]:   WORST_CASE_RUBRIC,
  [BEST_CASE_PROJECT.id]:    BEST_CASE_RUBRIC,
  [NOT_STARTED_PROJECT.id]:  NOT_STARTED_RUBRIC,
};
const TEMPLATE_RISKS: Record<string, typeof MOCK_RISKS> = {
  [MOCK_PROJECT.id]:         MOCK_RISKS,
  [WORST_CASE_PROJECT.id]:   WORST_CASE_RISKS,
  [BEST_CASE_PROJECT.id]:    BEST_CASE_RISKS,
  [NOT_STARTED_PROJECT.id]:  NOT_STARTED_RISKS,
};

// ── Pre-seed db with all template projects on startup ─────────────────────────
function taskCompletionPct(status: string): number {
  if (status === 'done') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

function toBackendTaskStatus(s: string): BackendTask['status'] {
  if (s === 'done' || s === 'in_progress') return s;
  return 'backlog';
}

function seedProjectFromTemplate(template: typeof MOCK_PROJECT): void {
  const iso = nowIso();

  const backendProject: BackendProject = {
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status as BackendProject['status'],
    deadline_date: template.deadline ? dateToIso(template.deadline) : null,
    created_at: dateToIso(template.createdAt),
    updated_at: iso,
  };
  db.projects.push(backendProject);

  template.teamMembers.forEach((m) => {
    db.members.push({
      id: m.id,
      project_id: template.id,
      name: m.name,
      email: null,
      skills: [m.role],
      contribution_score: m.contributionScore,
      last_activity_at: iso,
      joined_at: iso,
    });
  });

  template.tasks.forEach((t) => {
    db.tasks.push({
      id: t.id,
      project_id: template.id,
      title: t.title,
      description: t.description ?? null,
      status: toBackendTaskStatus(t.status),
      priority: t.priority as BackendTask['priority'],
      assignee_id: t.assigneeId ?? null,
      estimated_hours: 8,
      completion_pct: taskCompletionPct(t.status),
      due_date: t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`).toISOString() : null,
      created_at: t.startDate ? new Date(`${t.startDate}T00:00:00.000Z`).toISOString() : iso,
      updated_at: iso,
    });
  });

  // Workflow state with rich member/task data so the workspace page renders correctly
  const roleAssignments = template.teamMembers.map((m) => ({
    member_id: m.id,
    member_name: m.name,
    role: m.role,
    assigned_tasks: template.tasks
      .filter((t) => t.assigneeId === m.id)
      .map((t) => t.id),
  }));

  const totalTasks = Math.max(1, template.tasks.length);
  const contributionBalance = template.teamMembers.map((m) => {
    const assigned = template.tasks.filter((t) => t.assigneeId === m.id).length;
    return {
      member_id: m.id,
      contribution_score: m.contributionScore / 100,
      workload_score: Math.round((assigned / totalTasks) * 100),
      balance_status: assigned / totalTasks > 0.4 ? 'needs-monitoring' : 'well-balanced',
    };
  });

  db.workflowByProject[template.id] = {
    project_id: template.id,
    workflow_stage: 'pipeline_complete',
    structured_goals: [
      { id: `goal-${template.id}`, goal: `Deliver ${template.name} by ${template.deadline}` },
    ],
    tasks: template.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      status: toBackendTaskStatus(t.status),
      priority: t.priority,
      assigned_to: t.assigneeId ? [t.assigneeId] : [],
      start_date: t.startDate ? new Date(`${t.startDate}T00:00:00.000Z`).toISOString() : iso,
      end_date: t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`).toISOString() : null,
      dependencies: t.dependsOn ?? [],
      estimated_hours: 8,
      percentage_utilized: taskCompletionPct(t.status),
    })),
    milestones: [
      { id: `ms1-${template.id}`, title: 'Implementation complete', due_date: new Date(`${template.deadline}T00:00:00.000Z`).toISOString() },
    ],
    members: template.teamMembers.map((m) => ({
      member_id: m.id,
      name: m.name,
      skills: [m.role],
    })),
    role_assignments: roleAssignments,
    contribution_balance: contributionBalance,
    last_risk_report: {
      executed_at: iso,
      result: {
        identified_risks: (TEMPLATE_RISKS[template.id] ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          severity: r.severity,
          description: r.message,
          impact: r.detail,
          recommended_action_type: r.recommended_action_type,
          recommended_action: r.recommended_action,
        })),
      },
    },
    submission_report: {
      rubric_coverage: (TEMPLATE_RUBRICS[template.id] ?? []).map((r) => ({
        criterion_id: r.id,
        criterion_name: r.criterion,
        weight: r.weight / 100,
        status: r.status,
        evidence: r.evidence,
        score: r.score,
        max_score: r.maxScore,
      })),
      submission_checklist: (MOCK_CHECKLISTS[template.id] ?? []).map((c) => ({
        item: c.item,
        status: c.status,
        priority: c.priority,
      })),
    },
    deadline_date: template.deadline ? dateToIso(template.deadline) : null,
    updated_at: iso,
  };
}

// Seed only the 3 existing projects on startup; NOT_STARTED_PROJECT appears only
// after the user completes the new-project wizard for the first time.
[MOCK_PROJECT, WORST_CASE_PROJECT, BEST_CASE_PROJECT].forEach(seedProjectFromTemplate);

// templateCounter tracks which template the next wizard-created project will use

function listTasksForProject(projectId: string): BackendTask[] {
  return db.tasks.filter((task) => task.project_id === projectId);
}

function completionPctForProject(projectId: string): number {
  const projectTasks = listTasksForProject(projectId);
  if (projectTasks.length === 0) return 0;
  const total = projectTasks.reduce((sum, task) => sum + task.completion_pct, 0);
  return Math.round(total / projectTasks.length);
}

function ensureWorkflow(projectId: string): WorkflowState {
  const existing = db.workflowByProject[projectId];
  if (existing) return existing;

  const project = readOrThrow(
    db.projects.find((p) => p.id === projectId),
    `Project ${projectId} not found`,
  );

  const state: WorkflowState = {
    project_id: projectId,
    workflow_stage: 'intake_complete',
    structured_goals: [],
    tasks: [],
    milestones: [],
    members: [],
    role_assignments: [],
    contribution_balance: [],
    last_risk_report: { result: { identified_risks: [] } },
    submission_report: { rubric_coverage: [] },
    deadline_date: project.deadline_date,
    updated_at: nowIso(),
  };

  db.workflowByProject[projectId] = state;
  return state;
}

function generatePipelineTasks(projectId: string, req: RunPipelineRequest): BackendTask[] {
  const now = new Date();
  const deadline = new Date(`${req.deadline_date}T00:00:00.000Z`);
  const spanDays = Math.max(7, Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS));
  const existingMembers = db.members.filter((m) => m.project_id === projectId);

  const assigneeCycle =
    existingMembers.length > 0
      ? existingMembers.map((m) => m.id)
      : ['unassigned'];

  const templates: Array<{
    title: string;
    description: string;
    status: BackendTask['status'];
    priority: BackendTask['priority'];
    offsetStart: number;
    offsetEnd: number;
    confidence: number;
  }> = [
    {
      title: 'Extract goals from uploaded documents',
      description: 'Consolidate rubric and brief requirements into scoped project goals.',
      status: 'done',
      priority: 'high',
      offsetStart: 0,
      offsetEnd: Math.max(1, Math.floor(spanDays * 0.15)),
      confidence: 100,
    },
    {
      title: 'Create implementation timeline',
      description: 'Map milestones, dependencies, and delivery windows.',
      status: 'in_progress',
      priority: 'high',
      offsetStart: 1,
      offsetEnd: Math.max(3, Math.floor(spanDays * 0.35)),
      confidence: 72,
    },
    {
      title: 'Assign role ownership',
      description: 'Distribute responsibilities across the team based on declared skills.',
      status: 'in_progress',
      priority: 'medium',
      offsetStart: 2,
      offsetEnd: Math.max(4, Math.floor(spanDays * 0.45)),
      confidence: 65,
    },
    {
      title: 'Build submission artefact checklist',
      description: 'Track mandatory files and rubric evidence coverage.',
      status: 'backlog',
      priority: 'medium',
      offsetStart: Math.max(3, Math.floor(spanDays * 0.35)),
      offsetEnd: Math.max(5, Math.floor(spanDays * 0.65)),
      confidence: 38,
    },
    {
      title: 'Run final readiness review',
      description: 'Execute final risk and rubric checks before deadline.',
      status: 'backlog',
      priority: 'high',
      offsetStart: Math.max(5, Math.floor(spanDays * 0.7)),
      offsetEnd: Math.max(7, spanDays),
      confidence: 20,
    },
  ];

  return templates.map((tpl, idx) => {
    const created = new Date(now.getTime() + tpl.offsetStart * DAY_MS).toISOString();
    const due = new Date(now.getTime() + tpl.offsetEnd * DAY_MS).toISOString();
    const assigneeId = assigneeCycle[idx % assigneeCycle.length];
    return {
      id: makeId('task'),
      project_id: projectId,
      title: tpl.title,
      description: `${tpl.description}\n\nSource summary length: ${req.document_text.length} chars`,
      status: tpl.status,
      priority: tpl.priority,
      assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
      estimated_hours: 6 + idx * 2,
      completion_pct: tpl.confidence,
      due_date: due,
      created_at: created,
      updated_at: nowIso(),
    };
  });
}

function createRoleAssignments(projectId: string): Record<string, unknown>[] {
  return db.members
    .filter((member) => member.project_id === projectId)
    .map((member) => {
      const assigned = db.tasks
        .filter((task) => task.project_id === projectId && task.assignee_id === member.id)
        .map((task) => task.id);
      return {
        member_id: member.id,
        member_name: member.name,
        role: member.skills[0] ?? 'Generalist',
        assigned_tasks: assigned,
      };
    });
}

function createContributionBalance(projectId: string): Record<string, unknown>[] {
  const members = db.members.filter((member) => member.project_id === projectId);
  const taskCount = Math.max(1, db.tasks.filter((task) => task.project_id === projectId).length);
  return members.map((member) => {
    const assignedCount = db.tasks.filter((task) => task.project_id === projectId && task.assignee_id === member.id).length;
    const normalized = assignedCount / taskCount;
    return {
      member_id: member.id,
      contribution_score: Math.min(1, Math.max(0.2, normalized + 0.25)),
      workload_score: Math.round((normalized * 100 + 35) * 100) / 100,
      balance_status: normalized > 0.45 ? 'needs-monitoring' : 'well-balanced',
    };
  });
}

async function listProjects(): Promise<BackendProject[]> {
  await sleep();
  return clone(db.projects);
}

async function getProject(id: string): Promise<BackendProject> {
  await sleep();
  return clone(readOrThrow(db.projects.find((p) => p.id === id), `Project ${id} not found`));
}

async function createProject(data: ProjectCreate): Promise<BackendProject> {
  await sleep();
  const iso = nowIso();
  const project: BackendProject = {
    id: makeId('proj'),
    name: data.name,
    description: data.description ?? null,
    status: 'active',
    deadline_date: data.deadline_date ? dateToIso(data.deadline_date) : null,
    created_at: iso,
    updated_at: iso,
  };
  db.projects.unshift(project);
  ensureWorkflow(project.id);
  return clone(project);
}

async function updateProject(id: string, data: Partial<ProjectCreate>): Promise<BackendProject> {
  await sleep();
  const project = readOrThrow(db.projects.find((p) => p.id === id), `Project ${id} not found`);
  if (data.name !== undefined) project.name = data.name;
  if (data.description !== undefined) project.description = data.description;
  if (data.deadline_date !== undefined) project.deadline_date = data.deadline_date ? dateToIso(data.deadline_date) : null;
  project.updated_at = nowIso();

  const state = ensureWorkflow(id);
  state.deadline_date = project.deadline_date;
  state.updated_at = nowIso();

  return clone(project);
}

async function deleteProject(id: string): Promise<void> {
  await sleep();
  db.projects = db.projects.filter((p) => p.id !== id);
  db.members = db.members.filter((m) => m.project_id !== id);
  db.tasks = db.tasks.filter((t) => t.project_id !== id);
  db.documents = db.documents.filter((d) => d.project_id !== id);
  delete db.workflowByProject[id];
  delete db.decisionsByProject[id];
}

async function listMembersByProject(projectId: string): Promise<BackendMember[]> {
  await sleep();
  return clone(db.members.filter((m) => m.project_id === projectId));
}

async function getMember(memberId: string): Promise<BackendMember> {
  await sleep();
  return clone(readOrThrow(db.members.find((m) => m.id === memberId), `Member ${memberId} not found`));
}

async function addMember(data: {
  project_id: string;
  name: string;
  email?: string;
  skills?: string[];
}): Promise<BackendMember> {
  await sleep();
  const member: BackendMember = {
    id: makeId('m'),
    project_id: data.project_id,
    name: data.name,
    email: data.email ?? null,
    skills: data.skills ?? [],
    contribution_score: 65,
    last_activity_at: nowIso(),
    joined_at: nowIso(),
  };
  db.members.push(member);
  ensureWorkflow(data.project_id).updated_at = nowIso();
  return clone(member);
}

async function updateMember(memberId: string, data: MemberUpdate): Promise<BackendMember> {
  await sleep();
  const member = readOrThrow(db.members.find((m) => m.id === memberId), `Member ${memberId} not found`);
  if (data.name !== undefined) member.name = data.name;
  if (data.email !== undefined) member.email = data.email;
  if (data.skills !== undefined) member.skills = data.skills;
  if (data.contribution_score !== undefined) member.contribution_score = scoreToPct(data.contribution_score);
  member.last_activity_at = nowIso();
  ensureWorkflow(member.project_id).updated_at = nowIso();
  return clone(member);
}

async function removeMember(memberId: string): Promise<void> {
  await sleep();
  const member = db.members.find((m) => m.id === memberId);
  if (!member) return;
  db.members = db.members.filter((m) => m.id !== memberId);
  db.tasks = db.tasks.map((task) => (task.assignee_id === memberId ? { ...task, assignee_id: null } : task));
  ensureWorkflow(member.project_id).updated_at = nowIso();
}

async function listTasksByProject(projectId: string): Promise<BackendTask[]> {
  await sleep();
  return clone(listTasksForProject(projectId));
}

async function getTask(taskId: string): Promise<BackendTask> {
  await sleep();
  return clone(readOrThrow(db.tasks.find((t) => t.id === taskId), `Task ${taskId} not found`));
}

async function updateTask(taskId: string, data: TaskUpdate): Promise<BackendTask> {
  await sleep();
  const task = readOrThrow(db.tasks.find((t) => t.id === taskId), `Task ${taskId} not found`);
  if (data.status !== undefined) task.status = data.status;
  if (data.completion_pct !== undefined) task.completion_pct = scoreToPct(data.completion_pct);
  if (data.assignee_id !== undefined) task.assignee_id = data.assignee_id;
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.due_date !== undefined) task.due_date = data.due_date;
  task.updated_at = nowIso();

  const project = readOrThrow(db.projects.find((p) => p.id === task.project_id), 'Project not found for task');
  project.updated_at = nowIso();
  ensureWorkflow(task.project_id).updated_at = nowIso();

  return clone(task);
}

async function deleteTask(taskId: string): Promise<void> {
  await sleep();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return;
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  ensureWorkflow(task.project_id).updated_at = nowIso();
}

async function uploadDocument(projectId: string, file: File, documentType: string): Promise<BackendDocument> {
  await sleep(140);
  const document: BackendDocument = {
    id: makeId('doc'),
    project_id: projectId,
    file_name: file.name,
    document_type: documentType,
    mime_type: file.type || 'application/octet-stream',
    extracted_text: `Mock extracted content from ${file.name}.`,
    uploaded_at: nowIso(),
  };
  db.documents.push(document);
  ensureWorkflow(projectId).updated_at = nowIso();
  return clone(document);
}

async function listDocumentsByProject(projectId: string): Promise<BackendDocument[]> {
  await sleep();
  return clone(db.documents.filter((doc) => doc.project_id === projectId));
}

async function runPipeline(projectId: string, req: RunPipelineRequest): Promise<Record<string, unknown>> {
  await sleep(220);

  const project = readOrThrow(db.projects.find((p) => p.id === projectId), `Project ${projectId} not found`);
  project.updated_at = nowIso();
  project.deadline_date = req.deadline_date ? dateToIso(req.deadline_date) : project.deadline_date;

  // Pick the next mock template (cycle round-robin)
  const template = PIPELINE_TEMPLATES[templateCounter % PIPELINE_TEMPLATES.length];
  templateCounter += 1;

  // Propagate template status onto the stored project
  project.status = template.status as BackendProject['status'];
  if (!project.description) project.description = template.description;

  // Replace any members/tasks added during the wizard with rich template data
  db.tasks = db.tasks.filter((task) => task.project_id !== projectId);
  db.members = db.members.filter((m) => m.project_id !== projectId);

  // ── Seed members ────────────────────────────────────────────────────────────
  const memberIdMap: Record<string, string> = {};
  const seededMembers: BackendMember[] = template.teamMembers.map((m) => {
    // Preserve 'me' as a stable ID so MyTasksCard can always find the current user
    const newId = m.id === 'me' ? 'me' : makeId('m');
    memberIdMap[m.id] = newId;
    return {
      id: newId,
      project_id: projectId,
      name: m.name,
      email: null,
      skills: [m.role],
      contribution_score: m.contributionScore,
      last_activity_at: nowIso(),
      joined_at: nowIso(),
    };
  });
  db.members.push(...seededMembers);

  // ── Seed tasks ──────────────────────────────────────────────────────────────
  const seededTasks: BackendTask[] = template.tasks.map((t) => {
    const assigneeId = t.assigneeId ? (memberIdMap[t.assigneeId] ?? null) : null;
    return {
      id: makeId('task'),
      project_id: projectId,
      title: t.title,
      description: t.description ?? null,
      status: toBackendTaskStatus(t.status),
      priority: (t.priority as BackendTask['priority']) ?? 'medium',
      assignee_id: assigneeId,
      estimated_hours: 8,
      completion_pct: taskCompletionPct(t.status),
      due_date: t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`).toISOString() : project.deadline_date,
      created_at: t.startDate ? new Date(`${t.startDate}T00:00:00.000Z`).toISOString() : nowIso(),
      updated_at: nowIso(),
    };
  });
  db.tasks.push(...seededTasks);

  const generatedTasks = seededTasks;
  const roleAssignments = createRoleAssignments(projectId);
  const contributionBalance = createContributionBalance(projectId);

  const rubricCoverage = (TEMPLATE_RUBRICS[template.id] ?? []).map((r) => ({
    criterion_id: r.id,
    criterion_name: r.criterion,
    weight: r.weight / 100,
    status: r.status,
    evidence: r.evidence,
    score: r.score,
    max_score: r.maxScore,
  }));

  const identifiedRisks = (TEMPLATE_RISKS[template.id] ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    description: r.message,
    impact: r.detail,
    recommended_action_type: r.recommended_action_type,
    recommended_action: r.recommended_action,
  }));

  const workflowState: WorkflowState = {
    project_id: projectId,
    workflow_stage: 'pipeline_complete',
    structured_goals: [
      {
        id: makeId('goal'),
        goal: req.project_name
          ? `Deliver ${req.project_name} by ${req.deadline_date}`
          : `Deliver project by ${req.deadline_date}`,
      },
    ],
    tasks: generatedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assignee_id ? [task.assignee_id] : [],
      start_date: task.created_at,
      end_date: task.due_date,
      dependencies: [],
      estimated_hours: task.estimated_hours,
      percentage_utilized: task.completion_pct,
    })),
    milestones: [
      { id: makeId('ms'), title: 'Planning completed', due_date: new Date(Date.now() + 7 * DAY_MS).toISOString() },
      { id: makeId('ms'), title: 'Submission review', due_date: new Date(Date.now() + 20 * DAY_MS).toISOString() },
    ],
    members: db.members
      .filter((member) => member.project_id === projectId)
      .map((member) => ({
        member_id: member.id,
        name: member.name,
        skills: member.skills,
      })),
    role_assignments: roleAssignments,
    contribution_balance: contributionBalance,
    last_risk_report: {
      executed_at: nowIso(),
      result: { identified_risks: identifiedRisks },
    },
    submission_report: {
      rubric_coverage: rubricCoverage,
      submission_checklist: (MOCK_CHECKLISTS[template.id] ?? []).map((c) => ({
        item: c.item,
        status: c.status,
        priority: c.priority,
      })),
    },
    deadline_date: project.deadline_date,
    updated_at: nowIso(),
  };

  db.workflowByProject[projectId] = workflowState;
  db.decisionsByProject[projectId] = [
    {
      id: makeId('dec'),
      agent: 'instruction_analysis_agent',
      summary: 'Parsed project context and generated actionable goals.',
      executed_at: nowIso(),
    },
    {
      id: makeId('dec'),
      agent: 'planning_agent',
      summary: 'Produced baseline tasks and timeline.',
      executed_at: nowIso(),
    },
  ];

  return {
    project_id: projectId,
    workflow_stage: workflowState.workflow_stage,
    tasks_generated: generatedTasks.length,
    status: 'ok',
  };
}

async function getWorkflowState(projectId: string): Promise<WorkflowState> {
  await sleep();
  return clone(ensureWorkflow(projectId));
}

async function getDecisions(projectId: string, limit = 20): Promise<DecisionRow[]> {
  await sleep();
  const rows = db.decisionsByProject[projectId] ?? [];
  return clone(rows.slice(0, Math.max(1, limit)));
}

async function runRiskCheck(projectId: string): Promise<Record<string, unknown>> {
  await sleep();
  const state = ensureWorkflow(projectId);
  return clone(state.last_risk_report as Record<string, unknown>);
}

async function runSubmissionCheck(
  projectId: string,
  uploadedArtefacts: string[] = [],
): Promise<Record<string, unknown>> {
  await sleep();
  const state = ensureWorkflow(projectId);
  const report = clone(state.submission_report as Record<string, unknown>);

  if (uploadedArtefacts.length > 0) {
    const checklist = Array.isArray(report.submission_checklist)
      ? (report.submission_checklist as Record<string, unknown>[])
      : [];
    report.submission_checklist = checklist.map((item, idx) => ({
      ...item,
      status: idx < uploadedArtefacts.length ? 'complete' : item.status,
    }));
  }

  return report;
}

function streamPipeline(
  projectId: string,
  params: RunPipelineRequest,
  onStage: (data: unknown) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const stages = [
    { stage: 'instruction_analysis', message: 'Analysing instructions and constraints' },
    { stage: 'planning', message: 'Generating tasks and dependencies' },
    { stage: 'coordination', message: 'Balancing workload across team members' },
    { stage: 'risk_detection', message: 'Checking timeline and risk signals' },
  ];

  let index = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;

    if (index < stages.length) {
      onStage({
        project_id: projectId,
        ...stages[index],
        progress: Math.round(((index + 1) / stages.length) * 100),
      });
      index += 1;
      setTimeout(tick, 220);
      return;
    }

    runPipeline(projectId, params)
      .then(() => onDone())
      .catch((err: unknown) => onError(err instanceof Error ? err : new Error('Pipeline stream failed')));
  };

  setTimeout(tick, 120);

  return () => {
    cancelled = true;
  };
}

async function projectOverview(projectId: string): Promise<ProjectAnalytics> {
  await sleep();
  readOrThrow(db.projects.find((p) => p.id === projectId), `Project ${projectId} not found`);
  const tasks = listTasksForProject(projectId);
  const taskStats = {
    backlog: tasks.filter((task) => task.status === 'backlog').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  };

  const completionPct = completionPctForProject(projectId);
  const healthScore = Math.max(10, Math.min(100, completionPct + 18 - taskStats.backlog * 4));

  const contributionCounts = Object.fromEntries(
    db.members
      .filter((member) => member.project_id === projectId)
      .map((member) => [
        member.name,
        tasks.filter((task) => task.assignee_id === member.id).length,
      ]),
  );

  const state = ensureWorkflow(projectId);

  return {
    project_id: projectId,
    task_stats: taskStats,
    total_tasks: tasks.length,
    completion_pct: completionPct,
    contribution_counts: contributionCounts,
    project_health: healthScore > 70 ? 'healthy' : healthScore > 45 ? 'watch' : 'at_risk',
    health_score: healthScore,
    deadline_failure_probability: Math.max(0.05, Math.min(0.95, (100 - healthScore) / 100)),
    workflow_stage: state.workflow_stage,
    submission_readiness: completionPct,
  };
}

export const mockStore = {
  projects: {
    list: listProjects,
    get: getProject,
    create: createProject,
    update: updateProject,
    delete: deleteProject,
  },
  members: {
    listByProject: listMembersByProject,
    get: getMember,
    add: addMember,
    update: updateMember,
    remove: removeMember,
  },
  tasks: {
    listByProject: listTasksByProject,
    get: getTask,
    update: updateTask,
    delete: deleteTask,
  },
  documents: {
    upload: uploadDocument,
    listByProject: listDocumentsByProject,
  },
  workflow: {
    getState: getWorkflowState,
    getDecisions,
    runPipeline,
    runRiskCheck,
    runSubmissionCheck,
    streamPipeline,
  },
  analytics: {
    projectOverview,
  },
};
