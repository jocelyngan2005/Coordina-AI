/**
 * Converts backend snake_case responses to the camelCase frontend types
 * defined in src/types/index.ts.  Missing fields get sensible defaults so
 * the UI never crashes when the backend omits optional data.
 */

import type { Task, TeamMember, Project, RiskAlert, RubricItem, ChecklistItem } from '../types';
import type { BackendTask, BackendMember, BackendProject } from './types';
import { deriveInitials } from '../utils/text';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function calculateTimestamp(executedAt: string | null | undefined): string {
  if (!executedAt) return 'Recently';
  const executed = new Date(executedAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - executed.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return executed.toLocaleDateString();
}

// ── DB row mappers (used for REST task/member endpoints) ──────────────────────

export function mapTask(t: BackendTask): Task {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    assigneeId: t.assignee_id ?? undefined,
    assignedTo: t.assignee_id ? [t.assignee_id] : [],
    startDate: isoToDate(t.created_at),
    dueDate: isoToDate(t.due_date) || isoToDate(t.created_at),
    priority: t.priority,
    tags: [],
    description: t.description ?? '',
    aiConfidence: t.completion_pct,
  };
}

export function mapMember(m: BackendMember, tasks: BackendTask[]): TeamMember {
  return {
    id: m.id,
    name: m.name,
    role: m.skills[0] ?? 'Member',
    initials: deriveInitials(m.name),
    contributionScore: Math.round(m.contribution_score),
    lastActive: relativeTime(m.last_activity_at),
    taskCount: tasks.filter((t) => t.assignee_id === m.id).length,
  };
}

export function mapProject(
  project: BackendProject,
  tasks: BackendTask[],
  members: BackendMember[],
  completionPct = 0,
  riskScore = 0,
): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    deadline: isoToDate(project.deadline_date),
    status: project.status as Project['status'],
    progress: completionPct,
    teamMembers: members.map((m) => mapMember(m, tasks)),
    tasks: tasks.map(mapTask),
    riskScore,
    createdAt: isoToDate(project.created_at),
  };
}

// ── GLM output mappers (workflow state → frontend types) ──────────────────────

/**
 * Map GLM planning agent tasks to frontend Task[].
 * GLM tasks use snake_case and arrays for assigned_to.
 */
export function mapTasks(glmTasks: Record<string, unknown>[]): Task[] {
  const validStatuses = ['pending', 'backlog', 'in_progress', 'done'] as const;
  const validPhases = ['setup', 'design', 'implementation', 'testing', 'documentation'] as const;

  return glmTasks.map((t, i) => {
    const rawStatus = String(t.status ?? 'pending');
    const status = (validStatuses.includes(rawStatus as Task['status']) ? rawStatus : 'pending') as Task['status'];

    const rawPhase = String(t.phase ?? '');
    const phase = (validPhases.includes(rawPhase as Task['phase']) ? rawPhase : undefined) as Task['phase'] | undefined;

    const assignedTo = Array.isArray(t.assigned_to)
      ? (t.assigned_to as unknown[]).map(String)
      : t.assigned_to
      ? [String(t.assigned_to)]
      : [];

    return {
      id: String(t.id ?? t.task_id ?? `t${i + 1}`),
      title: String(t.title ?? ''),
      description: String(t.description ?? ''),
      status,
      priority: (['high', 'medium', 'low'].includes(String(t.priority)) ? t.priority : 'medium') as Task['priority'],
      estimated_hours: Number(t.estimated_hours ?? 0),
      phase,
      startDate: isoToDate(String(t.startDate ?? t.start_date ?? '')),
      dueDate: isoToDate(String(t.endDate ?? t.end_date ?? t.dueDate ?? '')),
      dependencies: Array.isArray(t.dependencies) ? (t.dependencies as unknown[]).map(String) : [],
      assigneeId: assignedTo[0],
      assignedTo,
      tags: phase ? [phase] : [],
      percentage_utilized: Number(t.percentage_utilized ?? 0),
    };
  });
}

/**
 * Map GLM submission readiness rubric_coverage to frontend RubricItem[].
 */
export function mapRubric(submissionResult: Record<string, unknown>): RubricItem[] {
  const raw = submissionResult?.rubric_coverage;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return (raw as Record<string, unknown>[]).map((item, i) => ({
    id: String(item.criterion_id ?? item.id ?? `rb${i + 1}`),
    criterion: String(item.criterion_name ?? item.criterion ?? item.name ?? `Criterion ${i + 1}`),
    weight: Number(item.weight ?? (Number(item.weight_pct ?? 10) / 100)),
    status: (['covered', 'partial', 'missing'].includes(String(item.status))
      ? item.status
      : 'partial') as RubricItem['status'],
    evidence: Array.isArray(item.evidence)
      ? (item.evidence as string[]).join('; ')
      : String(item.evidence ?? ''),
    feedback: String(item.feedback ?? item.notes ?? ''),
    score: Number(item.score ?? 0),
    maxScore: Number(item.maxScore ?? item.max_score ?? item.maxScore ?? 10),
  }));
}

/**
 * Map GLM risk detection identified_risks to frontend RiskAlert[].
 */
export function mapRisks(
  riskResult: Record<string, unknown>,
  executedAt?: string,
): RiskAlert[] {
  const raw = riskResult?.identified_risks ?? riskResult?.risks ?? riskResult?.alerts;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const validTypes = ['inactivity', 'deadline_risk', 'dependency_blocker', 'ambiguity', 'missing_artifact'];
  const validSeverities = ['low', 'medium', 'high'];
  const validActionTypes = ['member_engagement', 'deadline_risk', 'scope_issue', 'dependency_blocker', 'ambiguity'];

  return (raw as Record<string, unknown>[]).map((item, i) => ({
    id: String(item.id ?? item.risk_id ?? `r${i + 1}`),
    type: (validTypes.includes(String(item.type))
      ? item.type
      : 'deadline_risk') as RiskAlert['type'],
    severity: (validSeverities.includes(String(item.severity))
      ? item.severity
      : 'medium') as RiskAlert['severity'],
    message: String(item.description ?? item.message ?? ''),
    detail: String(item.impact ?? item.detail ?? ''),
    timestamp: calculateTimestamp(executedAt),
    recommended_action: item.recommended_action ? String(item.recommended_action) : undefined,
    recommended_action_type: (validActionTypes.includes(String(item.recommended_action_type))
      ? item.recommended_action_type
      : undefined) as RiskAlert['recommended_action_type'],
  }));
}

/**
 * Map GLM coordination role_assignments + contribution_balance to frontend TeamMember[].
 */
export function mapTeamMembers(
  roleAssignments: Record<string, unknown>[],
  contributionBalance: Record<string, unknown>[],
): TeamMember[] {
  return roleAssignments.map((assignment) => {
    const contribution = contributionBalance.find(
      (c) => c.member_id === assignment.member_id,
    );

    const name = String(assignment.name ?? assignment.member_name ?? '');
    const contributionScore = contribution
      ? Math.round(Number(contribution.contribution_score ?? 0) * 100)
      : 0;

    return {
      id: String(assignment.member_id ?? ''),
      name,
      role: String(assignment.role ?? assignment.assigned_role ?? 'Member'),
      initials: deriveInitials(name),
      contributionScore,
      lastActive: 'Recently',
      taskCount: Array.isArray(assignment.assigned_tasks)
        ? (assignment.assigned_tasks as unknown[]).length
        : 0,
      workloadScore: contribution ? Number(contribution.workload_score ?? 0) : undefined,
      balance_status: contribution?.balance_status as TeamMember['balance_status'],
    };
  });
}

// ── Legacy GLM output extractors (workflow state → frontend types) ─────────────

/**
 * Try to extract RubricItem[] from the Submission Readiness Agent output.
 * Returns null when the structure is not recognised (caller falls back to mock).
 */
export function extractRubric(
  submissionReport: Record<string, unknown>,
): RubricItem[] | null {
  const result = (submissionReport?.result ?? submissionReport) as Record<string, unknown>;
  const mapped = mapRubric(result);
  return mapped.length > 0 ? mapped : null;
}

/**
 * Try to extract RiskAlert[] from the Risk Detection Agent output.
 * Returns null when the structure is not recognised.
 */
export function extractRisks(
  riskReport: Record<string, unknown>,
): RiskAlert[] | null {
  const result = (riskReport?.result ?? riskReport) as Record<string, unknown>;
  const executedAt = String(riskReport?.executed_at ?? '');
  const mapped = mapRisks(result, executedAt);
  return mapped.length > 0 ? mapped : null;
}
