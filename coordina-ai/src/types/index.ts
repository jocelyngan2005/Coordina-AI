export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  contributionScore: number;
  lastActive: string;
  taskCount: number;
  workloadScore?: number;
  balance_status?: 'well-balanced' | 'needs-monitoring';
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  assigneeId?: string;
  assignedTo: string[];
  startDate: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  description: string;
  phase?: 'setup' | 'design' | 'implementation' | 'testing' | 'documentation';
  estimated_hours?: number;
  percentage_utilized?: number;
  dependsOn?: string[];
  aiConfidence?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  status: 'active' | 'at_risk' | 'completed';
  progress: number;
  teamMembers: TeamMember[];
  tasks: Task[];
  riskScore: number;
  createdAt: string;
}

export type AgentStatus = 'idle' | 'thinking' | 'active' | 'done';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'reasoning' | 'output' | 'error';
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  lastAction: string;
  actionLog: LogEntry[];
}

export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskType =
  | 'inactivity'
  | 'deadline_risk'
  | 'dependency_blocker'
  | 'ambiguity'
  | 'missing_artifact';

export type RecommendedActionType =
  | 'member_engagement'
  | 'deadline_risk'
  | 'scope_issue'
  | 'dependency_blocker'
  | 'ambiguity';

export interface RiskAlert {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  detail: string;
  timestamp: string;
  memberId?: string;
  recommended_action?: string;
  recommended_action_type?: RecommendedActionType;
}

export interface RubricItem {
  id: string;
  criterion: string;
  weight: number;
  status: 'covered' | 'partial' | 'missing';
  evidence: string;
  feedback?: string;
  score: number;
  maxScore: number;
}

export interface ChecklistItem {
  item: string;
  status: 'complete' | 'in_progress' | 'pending';
  priority?: 'high' | 'medium' | 'low';
}

export interface UploadedDoc {
  id: string;
  name: string;
  type: 'brief' | 'rubric' | 'transcript' | 'chat_log' | 'submission';
  size: string;
  uploadedAt: string;
  status: 'processing' | 'processed' | 'failed';
}
