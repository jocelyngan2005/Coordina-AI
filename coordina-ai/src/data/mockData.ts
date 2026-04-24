import type { Project, Agent, RiskAlert, RubricItem } from '../types';

export const MOCK_PROJECT: Project = {
  id: 'proj-001',
  name: 'Smart Campus Navigation System',
  description: 'AI-powered indoor navigation for university campuses using BLE beacons and computer vision.',
  deadline: '2026-05-15',
  status: 'active',
  progress: 62,
  riskScore: 34,
  createdAt: '2026-04-01',
  teamMembers: [
    { id: 'm1', name: 'Alex Chen', role: 'Team Lead', initials: 'AC', contributionScore: 88, lastActive: '2 hours ago', taskCount: 6 },
    { id: 'm2', name: 'Priya Sharma', role: 'AI Engineer', initials: 'PS', contributionScore: 92, lastActive: '1 hour ago', taskCount: 5 },
    { id: 'm3', name: 'Jordan Lee', role: 'Frontend Dev', initials: 'JL', contributionScore: 71, lastActive: '5 hours ago', taskCount: 4 },
    { id: 'm4', name: 'Sam Okonkwo', role: 'Backend Dev', initials: 'SO', contributionScore: 65, lastActive: '1 day ago', taskCount: 3 },
    { id: 'm5', name: 'Mei Tanaka', role: 'UX Designer', initials: 'MT', contributionScore: 80, lastActive: '3 hours ago', taskCount: 4 },
  ],
  tasks: [
    { id: 't1', title: 'Define BLE beacon placement strategy', status: 'done', assigneeId: 'm1', startDate: '2026-04-01', dueDate: '2026-04-10', priority: 'high', tags: ['hardware', 'planning'], description: 'Map optimal beacon positions for 90% indoor coverage.', aiConfidence: 85 },
    { id: 't2', title: 'Set up computer vision pipeline', status: 'done', assigneeId: 'm2', startDate: '2026-04-03', dueDate: '2026-04-12', priority: 'high', tags: ['AI', 'core'], description: 'Implement YOLOv8 for landmark recognition.', dependsOn: ['t1'], aiConfidence: 95 },
    { id: 't3', title: 'Design user journey flows', status: 'done', assigneeId: 'm5', startDate: '2026-04-05', dueDate: '2026-04-14', priority: 'medium', tags: ['UX'], description: 'Wireframes for onboarding and navigation.', aiConfidence: 70 },
    { id: 't4', title: 'Build REST API for location data', status: 'in_progress', assigneeId: 'm4', startDate: '2026-04-15', dueDate: '2026-04-28', priority: 'high', tags: ['backend', 'API'], description: 'FastAPI endpoints for real-time location queries.', dependsOn: ['t1', 't2'], aiConfidence: 90 },
    { id: 't5', title: 'Implement navigation UI', status: 'in_progress', assigneeId: 'm3', startDate: '2026-04-18', dueDate: '2026-05-01', priority: 'high', tags: ['frontend'], description: 'AR overlay navigation view in React Native.', dependsOn: ['t3', 't4'], aiConfidence: 88 },
    { id: 't6', title: 'Train room classification model', status: 'in_progress', assigneeId: 'm2', startDate: '2026-04-14', dueDate: '2026-04-30', priority: 'high', tags: ['AI', 'ML'], description: 'Dataset curation and model training.', dependsOn: ['t2'], aiConfidence: 92 },
    { id: 't7', title: 'Write system architecture document', status: 'review', assigneeId: 'm1', startDate: '2026-04-16', dueDate: '2026-04-25', priority: 'medium', tags: ['docs'], description: 'Complete technical specification.', aiConfidence: 75 },
    { id: 't8', title: 'Conduct usability testing session', status: 'review', assigneeId: 'm5', startDate: '2026-04-20', dueDate: '2026-04-26', priority: 'medium', tags: ['UX', 'testing'], description: '3 rounds with 5 participants each.', dependsOn: ['t3'], aiConfidence: 68 },
    { id: 't9', title: 'Integration testing — full system', status: 'backlog', assigneeId: 'm4', startDate: '2026-05-02', dueDate: '2026-05-08', priority: 'high', tags: ['testing'], description: 'End-to-end test all subsystems.', dependsOn: ['t4', 't5', 't6'], aiConfidence: 94 },
    { id: 't10', title: 'Prepare final presentation slides', status: 'backlog', assigneeId: 'm1', startDate: '2026-05-09', dueDate: '2026-05-12', priority: 'medium', tags: ['deliverable'], description: '15-slide deck for project showcase.', dependsOn: ['t9'], aiConfidence: 60 },
    { id: 't11', title: 'Write rubric reflection report', status: 'backlog', assigneeId: 'm3', startDate: '2026-05-10', dueDate: '2026-05-13', priority: 'medium', tags: ['docs'], description: 'Self-assessment against grading rubric.', dependsOn: ['t9'], aiConfidence: 72 },
  ],
};

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'a1',
    name: 'Instruction Analysis Agent',
    description: 'Parses project briefs, extracts grading priorities and implicit expectations.',
    status: 'done',
    lastAction: 'Extracted 12 grading criteria from rubric document',
    actionLog: [
      { timestamp: '09:14:02', message: 'Received project brief (PDF, 8 pages)', type: 'info' },
      { timestamp: '09:14:05', message: 'Parsing document structure...', type: 'reasoning' },
      { timestamp: '09:14:11', message: 'Identified 3 implicit expectations not stated in rubric', type: 'reasoning' },
      { timestamp: '09:14:18', message: 'Extracted 12 grading criteria with weights', type: 'output' },
      { timestamp: '09:14:19', message: 'Structured goals written to project state', type: 'output' },
    ],
  },
  {
    id: 'a2',
    name: 'Planning Agent',
    description: 'Decomposes project into deliverables, generates timelines and dependency graphs.',
    status: 'done',
    lastAction: 'Generated 11-task plan with milestone markers',
    actionLog: [
      { timestamp: '09:15:00', message: 'Received structured goals from Instruction Agent', type: 'info' },
      { timestamp: '09:15:03', message: 'Reasoning over task dependencies...', type: 'reasoning' },
      { timestamp: '09:15:09', message: 'Detected 3 dependency chains', type: 'reasoning' },
      { timestamp: '09:15:15', message: 'Generated 11 tasks with milestone markers', type: 'output' },
      { timestamp: '09:15:16', message: 'Timeline written to project state', type: 'output' },
    ],
  },
  {
    id: 'a3',
    name: 'Team Coordination Agent',
    description: 'Assigns roles using skill signals, tracks contributions across platforms.',
    status: 'active',
    lastAction: 'Flagging Sam Okonkwo — 28h inactivity on assigned task',
    actionLog: [
      { timestamp: '11:00:00', message: 'Running periodic coordination check', type: 'info' },
      { timestamp: '11:00:02', message: 'Analysing contribution scores across 5 members...', type: 'reasoning' },
      { timestamp: '11:00:06', message: 'Sam Okonkwo: last commit 28h ago, task still in_progress', type: 'reasoning' },
      { timestamp: '11:00:08', message: 'Generating inactivity alert for Risk Agent', type: 'output' },
    ],
  },
  {
    id: 'a4',
    name: 'Risk Detection Agent',
    description: 'Detects inactivity patterns, predicts deadline failure probability.',
    status: 'thinking',
    lastAction: 'Recalculating deadline risk after coordination signal...',
    actionLog: [
      { timestamp: '11:00:09', message: 'Received inactivity signal from Coordination Agent', type: 'info' },
      { timestamp: '11:00:10', message: 'Querying task t4 progress state...', type: 'reasoning' },
      { timestamp: '11:00:13', message: 'Estimating deadline risk with current velocity...', type: 'reasoning' },
    ],
  },
  {
    id: 'a5',
    name: 'Submission Readiness Agent',
    description: 'Verifies rubric coverage, ensures required artifacts exist.',
    status: 'idle',
    lastAction: 'Last run: rubric 78% covered — 3 criteria partial',
    actionLog: [
      { timestamp: '08:00:00', message: 'Scheduled readiness check initiated', type: 'info' },
      { timestamp: '08:00:03', message: 'Cross-referencing 12 rubric criteria against submitted artifacts...', type: 'reasoning' },
      { timestamp: '08:00:11', message: '9 criteria fully covered, 3 partial, 0 missing', type: 'output' },
      { timestamp: '08:00:12', message: 'Readiness score: 78%. Next check in 6h.', type: 'output' },
    ],
  },
];

export const MOCK_RISKS: RiskAlert[] = [
  {
    id: 'r1',
    type: 'inactivity',
    severity: 'high',
    message: 'Sam Okonkwo — 28h inactivity',
    detail: 'Assigned task "Build REST API for location data" has had no commit or progress update in 28 hours. Deadline is April 28.',
    timestamp: '2 mins ago',
    memberId: 'm4',
  },
  {
    id: 'r2',
    type: 'deadline',
    severity: 'medium',
    message: 'API integration at risk of missing April 28 deadline',
    detail: 'Current task velocity suggests the REST API task will not be complete until May 1 at current pace. 3-day buffer consumed.',
    timestamp: '10 mins ago',
  },
  {
    id: 'r3',
    type: 'ambiguity',
    severity: 'low',
    message: 'Rubric criterion 7 is ambiguous',
    detail: '"Real-world applicability" in the rubric has no measurable definition. GLM flagged this as potentially subjective. Recommend requesting clarification from supervisor.',
    timestamp: '1 hour ago',
  },
  {
    id: 'r4',
    type: 'missing_artifact',
    severity: 'medium',
    message: 'Test report artifact not detected',
    detail: 'Rubric requires a formal test report document. No file matching this description has been uploaded or linked.',
    timestamp: '6 hours ago',
  },
];

export const MOCK_RUBRIC: RubricItem[] = [
  { id: 'rb1', criterion: 'Technical implementation quality', weight: 25, status: 'covered', evidence: 'Codebase reviewed — architecture follows best practices, CI/CD configured.', score: 22, maxScore: 25 },
  { id: 'rb2', criterion: 'AI/ML component integration', weight: 20, status: 'covered', evidence: 'YOLOv8 pipeline implemented; classification model training documented.', score: 18, maxScore: 20 },
  { id: 'rb3', criterion: 'System documentation', weight: 15, status: 'partial', evidence: 'Architecture doc in review. API docs not yet written.', score: 9, maxScore: 15 },
  { id: 'rb4', criterion: 'User experience & usability', weight: 15, status: 'covered', evidence: 'Usability testing conducted; 3 iterations of design improvements.', score: 13, maxScore: 15 },
  { id: 'rb5', criterion: 'Team collaboration & process', weight: 10, status: 'covered', evidence: 'Meeting transcripts logged, Git contribution history balanced.', score: 8, maxScore: 10 },
  { id: 'rb6', criterion: 'Testing & validation', weight: 10, status: 'partial', evidence: 'Unit tests present. Integration testing not started (backlog).', score: 5, maxScore: 10 },
  { id: 'rb7', criterion: 'Real-world applicability', weight: 5, status: 'partial', evidence: 'Ambiguous criterion flagged. Pilot deployment not yet scheduled.', score: 2, maxScore: 5 },
];
