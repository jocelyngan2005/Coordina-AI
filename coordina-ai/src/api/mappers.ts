/**
 * Converts backend snake_case responses to the camelCase frontend types
 * defined in src/types/index.ts.  Missing fields get sensible defaults so
 * the UI never crashes when the backend omits optional data.
 */

import type { Task, TeamMember, Project, RiskAlert, RubricItem } from '../types';
import type { BackendTask, BackendMember, BackendProject } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

// ── Individual mappers ────────────────────────────────────────────────────────

export function mapTask(t: BackendTask): Task {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    assigneeId: t.assignee_id ?? '',
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
    initials: getInitials(m.name),
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

// ── GLM output extractors (workflow state → frontend types) ───────────────────

/**
 * Try to extract RubricItem[] from the Submission Readiness Agent output.
 * Returns null when the structure is not recognised (caller falls back to mock).
 */
export function extractRubric(
  submissionReport: Record<string, unknown>,
): RubricItem[] | null {
  const raw = submissionReport?.rubric_coverage ?? submissionReport?.criteria;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  return (raw as Record<string, unknown>[]).map((item, i) => ({
    id: String(item.id ?? `rb${i + 1}`),
    criterion: String(item.criterion ?? item.name ?? `Criterion ${i + 1}`),
    weight: Number(item.weight ?? 10),
    status: (['covered', 'partial', 'missing'].includes(String(item.status))
      ? item.status
      : 'partial') as RubricItem['status'],
    evidence: String(item.evidence ?? ''),
    score: Number(item.score ?? 0),
    maxScore: Number(item.max_score ?? item.maxScore ?? 10),
  }));
}

/**
 * Try to extract RiskAlert[] from the Risk Detection Agent output.
 * Returns null when the structure is not recognised.
 */
export function extractRisks(
  riskReport: Record<string, unknown>,
): RiskAlert[] | null {
  const raw = riskReport?.alerts ?? riskReport?.risks;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const validTypes = ['inactivity', 'deadline', 'ambiguity', 'missing_artifact'];
  const validSeverities = ['low', 'medium', 'high'];

  return (raw as Record<string, unknown>[]).map((item, i) => ({
    id: String(item.id ?? `r${i + 1}`),
    type: (validTypes.includes(String(item.type))
      ? item.type
      : 'deadline') as RiskAlert['type'],
    severity: (validSeverities.includes(String(item.severity))
      ? item.severity
      : 'medium') as RiskAlert['severity'],
    message: String(item.message ?? ''),
    detail: String(item.detail ?? item.description ?? ''),
    timestamp: String(item.timestamp ?? 'Recently'),
    memberId: item.member_id ? String(item.member_id) : undefined,
  }));
}
