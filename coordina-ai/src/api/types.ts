/** Backend response shapes (snake_case, matching FastAPI / Pydantic schemas). */

export interface BackendProject {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'at_risk' | 'completed' | 'archived';
  deadline_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendTask {
  id: string;
  project_id: string;
  task_id?: string | null;
  title: string;
  description: string | null;
  status: 'backlog' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_id: string | null;
  estimated_hours: number;
  completion_pct: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendMember {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  skills: string[];
  contribution_score: number;
  last_activity_at: string | null;
  joined_at: string;
}

export interface BackendDocument {
  id: string;
  project_id: string;
  file_name: string;
  document_type: string;
  mime_type: string;
  extracted_text: string | null;
  uploaded_at: string;
}

export interface WorkflowState {
  project_id: string;
  workflow_stage: string;
  structured_goals: unknown[];
  tasks: unknown[];
  milestones: unknown[];
  members: unknown[];
  role_assignments: unknown[];
  contribution_balance: unknown[];
  last_risk_report: Record<string, unknown>;
  submission_report: Record<string, unknown>;
  deadline_date: string | null;
  updated_at: string | null;
}

export interface ProjectAnalytics {
  project_id: string;
  task_stats: Record<string, number>;
  total_tasks: number;
  completion_pct: number;
  contribution_counts: Record<string, number>;
  project_health: string;
  health_score: number | null;
  deadline_failure_probability: number | null;
  workflow_stage: string | null;
  submission_readiness: number | null;
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface ProjectCreate {
  name: string;
  description?: string;
  deadline_date?: string;
}

export interface MemberCreate {
  project_id: string;
  name: string;
  email?: string;
  skills?: string[];
}

export interface RunPipelineRequest {
  document_text: string;
  document_type?: string;
  deadline_date: string;
  project_name?: string;
  team_size?: number;
  team_members?: Array<{ name: string; skills: string[] }>;
}
