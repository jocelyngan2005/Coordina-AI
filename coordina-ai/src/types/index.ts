export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  contributionScore: number;
  lastActive: string;
  taskCount: number;
}

export interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  assigneeId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  description: string;
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
export type RiskType = 'inactivity' | 'deadline' | 'ambiguity' | 'missing_artifact';

export interface RiskAlert {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  detail: string;
  timestamp: string;
  memberId?: string;
}

export interface RubricItem {
  id: string;
  criterion: string;
  weight: number;
  status: 'covered' | 'partial' | 'missing';
  evidence: string;
  score: number;
  maxScore: number;
}

export interface UploadedDoc {
  id: string;
  name: string;
  type: 'brief' | 'rubric' | 'transcript' | 'chat_log' | 'submission';
  size: string;
  uploadedAt: string;
  status: 'processing' | 'processed' | 'failed';
}
