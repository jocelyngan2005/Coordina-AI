import type { Project, Agent, RiskAlert, RubricItem, Task, UploadEvaluation, ChecklistItem } from '../types';

// ── NORMAL CASE: Context-Aware Student Q&A Chatbot ────────────────────────────
export const MOCK_PROJECT: Project = {
  id: 'proj-001',
  name: 'Context-Aware Student Q&A Chatbot',
  description: 'RAG-powered chatbot that answers student questions using course materials, lecture slides, and past exam papers.',
  deadline: '2026-05-20',
  status: 'active',
  progress: 62,
  riskScore: 36,
  createdAt: '2026-04-01',
  teamMembers: [
    { id: 'me', name: 'Jocelyn Gan',    role: 'Project Lead',    initials: 'JG', contributionScore: 85, lastActive: '1 hour ago',   taskCount: 5 },
    { id: 'm2', name: 'Natasha Rowan', role: 'NLP Engineer',    initials: 'NR', contributionScore: 90, lastActive: '30 min ago',   taskCount: 5 },
    { id: 'm3', name: 'Dylan Park',    role: 'Backend Dev',     initials: 'DP', contributionScore: 72, lastActive: '4 hours ago',  taskCount: 4 },
    { id: 'm4', name: 'Zara Hussain',  role: 'Frontend Dev',    initials: 'ZH', contributionScore: 61, lastActive: '1 day ago',    taskCount: 3 },
    { id: 'm5', name: 'Owen Chang',    role: 'Data Engineer',   initials: 'OC', contributionScore: 78, lastActive: '3 hours ago',  taskCount: 4 },
  ],
  tasks: [
    { id: 't1',  title: 'Define project scope and corpus collection strategy', status: 'done',        assigneeId: 'me', assignedTo: ['me'], startDate: '2026-04-01', dueDate: '2026-04-07', priority: 'high',   phase: 'setup',          tags: ['setup'],          description: 'Establish data sources: lecture slides, past papers, course guides.',   aiConfidence: 92 },
    { id: 't2',  title: 'Set up ChromaDB vector store and embedding pipeline',  status: 'done',        assigneeId: 'm5', assignedTo: ['m5'], startDate: '2026-04-03', dueDate: '2026-04-10', priority: 'high',   phase: 'setup',          tags: ['setup'],          description: 'Configure vector DB and run initial embedding batch.',                  aiConfidence: 88 },
    { id: 't3',  title: 'Implement document chunking and indexing pipeline',    status: 'done',        assigneeId: 'm2', assignedTo: ['m2'], startDate: '2026-04-05', dueDate: '2026-04-13', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Chunk PDFs and slides; index with metadata for context retrieval.',       aiConfidence: 95 },
    { id: 't4',  title: 'Build RAG retrieval and reranking module',             status: 'done',        assigneeId: 'm2', assignedTo: ['m2'], startDate: '2026-04-08', dueDate: '2026-04-16', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Semantic search with cross-encoder reranking for answer relevance.',       aiConfidence: 91 },
    { id: 't5',  title: 'Design conversational UI wireframes',                  status: 'done',        assigneeId: 'm4', assignedTo: ['m4'], startDate: '2026-04-06', dueDate: '2026-04-14', priority: 'medium', phase: 'design',         tags: ['design'],         description: 'Figma wireframes for chat interface and source citation display.',       aiConfidence: 74 },
    { id: 't6',  title: 'Develop Flask API and WebSocket chat endpoints',       status: 'in_progress', assigneeId: 'm3', assignedTo: ['m3'], startDate: '2026-04-15', dueDate: '2026-04-28', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'REST + WebSocket server for streaming LLM responses.',                   aiConfidence: 87 },
    { id: 't7',  title: 'Implement React chat frontend',                        status: 'in_progress', assigneeId: 'm4', assignedTo: ['m4'], startDate: '2026-04-16', dueDate: '2026-04-30', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Chat UI with message history, source citations, and feedback buttons.',   aiConfidence: 82 },
    { id: 't8',  title: 'Integrate LLM response generation with context',       status: 'in_progress', assigneeId: 'm2', assignedTo: ['m2'], startDate: '2026-04-14', dueDate: '2026-04-27', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Prompt engineering and GLM integration for accurate contextual answers.',  aiConfidence: 89 },
    { id: 't9',  title: 'Write system design and architecture document',        status: 'in_progress', assigneeId: 'me', assignedTo: ['me'], startDate: '2026-04-18', dueDate: '2026-04-26', priority: 'medium', phase: 'documentation',  tags: ['documentation'],  description: 'Technical specification covering RAG pipeline and deployment.',          aiConfidence: 71 },
    { id: 't10', title: 'Conduct user evaluation with 20 students',             status: 'backlog',     assigneeId: 'm5', assignedTo: ['m5'], startDate: '2026-05-01', dueDate: '2026-05-10', priority: 'high',   phase: 'testing',        tags: ['testing'],        description: 'Live evaluation sessions measuring answer accuracy and UX satisfaction.', aiConfidence: 65 },
    { id: 't11', title: 'Prepare final submission package and demo video',      status: 'backlog',     assigneeId: 'me', assignedTo: ['me'], startDate: '2026-05-11', dueDate: '2026-05-18', priority: 'high',   phase: 'documentation',  tags: ['documentation'],  description: '15-slide deck, demo recording, and rubric self-assessment report.',      aiConfidence: 58 },
  ] as Task[],
};

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'a1',
    name: 'Instruction Analysis Agent',
    description: 'Parses project briefs and rubrics, extracts grading priorities and implicit expectations.',
    status: 'done',
    lastAction: 'Extracted 10 grading criteria from course project rubric',
    actionLog: [
      { timestamp: '09:14:02', message: 'Received project brief and rubric (PDF, 6 pages)', type: 'info' },
      { timestamp: '09:14:05', message: 'Parsing document structure and section hierarchy...', type: 'reasoning' },
      { timestamp: '09:14:11', message: 'Identified 2 implicit expectations not stated in rubric', type: 'reasoning' },
      { timestamp: '09:14:18', message: 'Extracted 10 grading criteria with weightings', type: 'output' },
      { timestamp: '09:14:19', message: 'Structured goals written to project state', type: 'output' },
    ],
  },
  {
    id: 'a2',
    name: 'Planning Agent',
    description: 'Decomposes project into deliverables, generates timelines and dependency graphs.',
    status: 'done',
    lastAction: 'Generated 11-task plan with 3 milestone markers',
    actionLog: [
      { timestamp: '09:15:00', message: 'Received structured goals from Instruction Agent', type: 'info' },
      { timestamp: '09:15:03', message: 'Reasoning over RAG pipeline task dependencies...', type: 'reasoning' },
      { timestamp: '09:15:09', message: 'Detected 4 sequential dependency chains', type: 'reasoning' },
      { timestamp: '09:15:15', message: 'Generated 11 tasks with milestone markers', type: 'output' },
      { timestamp: '09:15:16', message: 'Timeline and dependency graph written to project state', type: 'output' },
    ],
  },
  {
    id: 'a3',
    name: 'Team Coordination Agent',
    description: 'Assigns roles using skill signals, tracks contributions across platforms.',
    status: 'active',
    lastAction: 'Flagging Zara Hussain — 24h inactivity on assigned frontend tasks',
    actionLog: [
      { timestamp: '11:00:00', message: 'Running periodic coordination check', type: 'info' },
      { timestamp: '11:00:02', message: 'Analysing contribution scores across 5 members...', type: 'reasoning' },
      { timestamp: '11:00:06', message: 'Zara Hussain: last commit 24h ago, two tasks still in_progress', type: 'reasoning' },
      { timestamp: '11:00:08', message: 'Generating inactivity alert for Risk Agent', type: 'output' },
    ],
  },
  {
    id: 'a4',
    name: 'Risk Detection Agent',
    description: 'Detects inactivity patterns, predicts deadline failure probability.',
    status: 'thinking',
    lastAction: 'Recalculating deadline risk after frontend inactivity signal...',
    actionLog: [
      { timestamp: '11:00:09', message: 'Received inactivity signal from Coordination Agent', type: 'info' },
      { timestamp: '11:00:10', message: 'Querying task t7 (React frontend) progress state...', type: 'reasoning' },
      { timestamp: '11:00:13', message: 'Estimating deadline risk with current velocity...', type: 'reasoning' },
    ],
  },
  {
    id: 'a5',
    name: 'Submission Readiness Agent',
    description: 'Verifies rubric coverage, ensures required artefacts exist.',
    status: 'idle',
    lastAction: 'Last run: rubric 74% covered — 3 criteria partial',
    actionLog: [
      { timestamp: '08:00:00', message: 'Scheduled readiness check initiated', type: 'info' },
      { timestamp: '08:00:03', message: 'Cross-referencing 10 rubric criteria against submitted artefacts...', type: 'reasoning' },
      { timestamp: '08:00:11', message: '7 criteria fully covered, 3 partial, 0 missing', type: 'output' },
      { timestamp: '08:00:12', message: 'Readiness score: 74%. Next check in 6h.', type: 'output' },
    ],
  },
];

// ── WORST CASE: Multimodal Homework Grader ─────────────────────────────────────
export const WORST_CASE_PROJECT: Project = {
  id: 'proj-worst',
  name: 'Multimodal Homework Grader',
  description: 'Automated grading system using computer vision and NLP to evaluate handwritten and typed student assignments at scale.',
  deadline: '2026-05-05',
  status: 'at_risk',
  progress: 22,
  riskScore: 91,
  createdAt: '2026-03-10',
  teamMembers: [
    { id: 'me', name: 'Jocelyn Gan',    role: 'Project Lead',  initials: 'JG', contributionScore: 18, lastActive: '4 days ago',  taskCount: 2 },
    { id: 'w2', name: 'Ingrid Mueller',role: 'CV Engineer',   initials: 'IM', contributionScore: 6,  lastActive: '6 days ago',  taskCount: 0 },
    { id: 'w3', name: 'Tariq Nasir',   role: 'ML Engineer',   initials: 'TN', contributionScore: 44, lastActive: '2 days ago',  taskCount: 3 },
    { id: 'w4', name: 'Chloe Benson',  role: 'Backend Dev',   initials: 'CB', contributionScore: 13, lastActive: '1 week ago',  taskCount: 1 },
    { id: 'w5', name: 'Rafael Ortiz',  role: 'Frontend Dev',  initials: 'RO', contributionScore: 0,  lastActive: '2 weeks ago', taskCount: 0 },
  ],
  tasks: [
    { id: 'wt1',  title: 'Collect and annotate grading dataset',             status: 'done',        assigneeId: 'me', assignedTo: ['me'],       startDate: '2026-03-10', dueDate: '2026-03-20', priority: 'high',   phase: 'setup',          tags: ['setup'],          description: '500 scanned homework samples annotated with grade labels.',              aiConfidence: 80 },
    { id: 'wt2',  title: 'Design CNN architecture for handwriting recognition', status: 'in_progress', assigneeId: 'w3', assignedTo: ['w3'],    startDate: '2026-03-20', dueDate: '2026-04-10', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'ResNet-based model for recognising handwritten text regions.',             aiConfidence: 72 },
    { id: 'wt3',  title: 'Build OCR and image preprocessing pipeline',       status: 'backlog',     assigneeId: 'w2', assignedTo: ['w2'],       startDate: '2026-03-25', dueDate: '2026-04-12', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Tesseract OCR with deskew, binarisation, and noise removal preprocessing.', aiConfidence: 61 },
    { id: 'wt4',  title: 'Implement NLP rubric scoring parser',              status: 'backlog',     assigneeId: 'w3', assignedTo: ['w3'],       startDate: '2026-04-05', dueDate: '2026-04-20', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Parse grading rubric criteria and match against extracted text content.',  aiConfidence: 68 },
    { id: 'wt5',  title: 'Develop REST API for assignment submission intake', status: 'backlog',     assigneeId: 'w4', assignedTo: ['w4'],       startDate: '2026-04-10', dueDate: '2026-04-22', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Upload endpoint accepting PDF/image; returns structured grading JSON.',    aiConfidence: 55 },
    { id: 'wt6',  title: 'Create grader dashboard frontend',                 status: 'backlog',     assigneeId: 'w5', assignedTo: ['w5'],       startDate: '2026-04-15', dueDate: '2026-04-25', priority: 'medium', phase: 'implementation', tags: ['frontend'],       description: 'Dashboard displaying per-student grades, confidence scores, and flags.',   aiConfidence: 40 },
    { id: 'wt7',  title: 'Run model accuracy benchmarks',                    status: 'backlog',     assigneeId: 'w3', assignedTo: ['w3'],       startDate: '2026-04-18', dueDate: '2026-04-27', priority: 'high',   phase: 'testing',        tags: ['testing'],        description: 'Compare model accuracy against human grader baseline on held-out set.',  aiConfidence: 50 },
    { id: 'wt8',  title: 'Write technical documentation',                    status: 'backlog',     assigneeId: 'me', assignedTo: ['me'],       startDate: '2026-04-22', dueDate: '2026-04-29', priority: 'medium', phase: 'documentation',  tags: ['documentation'],  description: 'Architecture spec, model cards, and API reference.',                     aiConfidence: 35 },
    { id: 'wt9',  title: 'Integrate all modules end-to-end',                 status: 'backlog',     assigneeId: 'w2', assignedTo: ['w2'],       startDate: '2026-04-20', dueDate: '2026-04-28', priority: 'high',   phase: 'testing',        tags: ['testing'],        description: 'Full pipeline: image upload → OCR → CNN → NLP → grade output.',         aiConfidence: 30 },
    { id: 'wt10', title: 'Prepare final presentation and demo',              status: 'backlog',     assigneeId: 'w5', assignedTo: ['w5'],       startDate: '2026-04-28', dueDate: '2026-05-03', priority: 'medium', phase: 'documentation',  tags: ['documentation'],  description: '20-slide deck with live grading demo on sample submissions.',            aiConfidence: 22 },
  ] as Task[],
};

// ── BEST CASE: Personalised Study Path Recommender ────────────────────────────
export const BEST_CASE_PROJECT: Project = {
  id: 'proj-best',
  name: 'Personalised Study Path Recommender',
  description: 'Collaborative-filtering and knowledge-graph system that generates adaptive study plans tailored to each student\'s performance history and learning style.',
  deadline: '2026-04-28',
  status: 'active',
  progress: 97,
  riskScore: 3,
  createdAt: '2026-02-15',
  teamMembers: [
    { id: 'me', name: 'Jocelyn Gan',    role: 'Team Lead',        initials: 'JG', contributionScore: 97, lastActive: '20 min ago',  taskCount: 6 },
    { id: 'b2', name: 'Leon Fischer',  role: 'ML Engineer',      initials: 'LF', contributionScore: 95, lastActive: '40 min ago',  taskCount: 5 },
    { id: 'b3', name: 'Aisha Kamara',  role: 'Backend Dev',      initials: 'AK', contributionScore: 93, lastActive: '1 hour ago',  taskCount: 4 },
    { id: 'b4', name: 'Kai Nakamura',  role: 'Frontend Dev',     initials: 'KN', contributionScore: 91, lastActive: '2 hours ago', taskCount: 5 },
    { id: 'b5', name: 'Sana Mirza',    role: 'Research Analyst', initials: 'SM', contributionScore: 90, lastActive: '3 hours ago', taskCount: 4 },
  ],
  tasks: [
    { id: 'bt1',  title: 'Literature review on recommender systems',          status: 'done', assigneeId: 'b5', assignedTo: ['b5'],       startDate: '2026-02-15', dueDate: '2026-02-25', priority: 'high',   phase: 'setup',          tags: ['research'],       description: 'Survey collaborative filtering, content-based, and hybrid approaches.', aiConfidence: 98 },
    { id: 'bt2',  title: 'Design knowledge graph schema for course content',  status: 'done', assigneeId: 'b5', assignedTo: ['b5'],       startDate: '2026-02-25', dueDate: '2026-03-06', priority: 'high',   phase: 'design',         tags: ['design'],         description: 'Node types: Topic, Concept, Skill, Assessment; edge types: prerequisite, covers.', aiConfidence: 96 },
    { id: 'bt3',  title: 'Implement collaborative filtering model',           status: 'done', assigneeId: 'b2', assignedTo: ['b2'],       startDate: '2026-03-01', dueDate: '2026-03-16', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Matrix factorisation with SVD++ on anonymised student performance data.', aiConfidence: 95 },
    { id: 'bt4',  title: 'Build knowledge graph with Neo4j',                  status: 'done', assigneeId: 'b3', assignedTo: ['b3'],       startDate: '2026-03-08', dueDate: '2026-03-22', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: '2,400 nodes, 8,600 edges ingested from curriculum documents.',          aiConfidence: 94 },
    { id: 'bt5',  title: 'Develop adaptive path generation algorithm',        status: 'done', assigneeId: 'b2', assignedTo: ['b2'],       startDate: '2026-03-18', dueDate: '2026-03-30', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Dijkstra-based traversal weighted by student gap analysis.',            aiConfidence: 97 },
    { id: 'bt6',  title: 'Create REST API and WebSocket layer',               status: 'done', assigneeId: 'b3', assignedTo: ['b3'],       startDate: '2026-03-25', dueDate: '2026-04-05', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'FastAPI backend with real-time study path update events.',              aiConfidence: 93 },
    { id: 'bt7',  title: 'Build student dashboard and path visualisation',    status: 'done', assigneeId: 'b4', assignedTo: ['b4'],       startDate: '2026-03-28', dueDate: '2026-04-08', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Interactive React graph showing recommended topics and progress.',       aiConfidence: 92 },
    { id: 'bt8',  title: 'Integrate performance tracking and feedback loop',  status: 'done', assigneeId: 'b4', assignedTo: ['b4'],       startDate: '2026-04-04', dueDate: '2026-04-14', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Quiz result ingestion re-ranks path recommendations in real time.',     aiConfidence: 91 },
    { id: 'bt9',  title: 'Run A/B evaluation with 50 students',               status: 'done', assigneeId: 'me', assignedTo: ['me', 'b5'], startDate: '2026-04-08', dueDate: '2026-04-18', priority: 'high',   phase: 'testing',        tags: ['testing'],        description: 'Control vs recommended-path group; 18% faster topic mastery observed.', aiConfidence: 96 },
    { id: 'bt10', title: 'Write research paper, docs, and final submission',  status: 'done', assigneeId: 'me', assignedTo: ['me'],       startDate: '2026-04-15', dueDate: '2026-04-24', priority: 'high',   phase: 'documentation',  tags: ['documentation'],  description: '6-page paper, full API docs, deployment guide, and 5-min demo video.', aiConfidence: 95 },
  ] as Task[],
};

// ── NEW / NOT STARTED: Peer Code Review Quality Assistant ─────────────────────
export const NOT_STARTED_PROJECT: Project = {
  id: 'proj-new',
  name: 'Peer Code Review Quality Assistant',
  description:
    'Lightweight tool that combines static analysis signals with an LLM to suggest constructive review comments on pull requests, aimed at teaching better review habits in a software engineering course.',
  deadline: '2026-06-30',
  status: 'active',
  progress: 0,
  riskScore: 8,
  createdAt: '2026-04-26',
  teamMembers: [
    { id: 'me', name: 'Jocelyn Gan',    role: 'Project Lead', initials: 'JG', contributionScore: 0, lastActive: 'Joined today', taskCount: 0 },
    { id: 'n2', name: 'Cheah Pui Yan',  role: 'Developer',    initials: 'CP', contributionScore: 0, lastActive: 'Joined today', taskCount: 0 },
    { id: 'n3', name: 'Tan Yin June',   role: 'Developer',    initials: 'TY', contributionScore: 0, lastActive: 'Joined today', taskCount: 0 },
  ],
  tasks: [
    { id: 'nt1',  title: 'Confirm scope with supervisor and lock rubric interpretation', status: 'backlog', assigneeId: 'me', assignedTo: ['me'],       startDate: '2026-05-05', dueDate: '2026-05-12', priority: 'high',   phase: 'setup',          tags: ['setup'],          description: 'Align on PR-only scope, languages supported, and evaluation metrics before implementation.', aiConfidence: 70 },
    { id: 'nt2',  title: 'Collect sample repositories and anonymised PR threads',      status: 'backlog', assigneeId: 'n3', assignedTo: ['n3'],       startDate: '2026-05-08', dueDate: '2026-05-20', priority: 'high',   phase: 'setup',          tags: ['setup'],          description: 'Curate 30+ PRs with reviewer comments for fine-tuning and offline evaluation.',             aiConfidence: 55 },
    { id: 'nt3',  title: 'Design static-analysis plugin interface',                      status: 'backlog', assigneeId: 'n2', assignedTo: ['n2'],       startDate: '2026-05-15', dueDate: '2026-05-28', priority: 'high',   phase: 'design',         tags: ['design'],         description: 'Define how linters and diff stats feed into the suggestion pipeline.',                      aiConfidence: 48 },
    { id: 'nt4',  title: 'Prototype LLM prompt for review-comment generation',           status: 'backlog', assigneeId: 'n3', assignedTo: ['n3'],       startDate: '2026-05-22', dueDate: '2026-06-05', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Few-shot prompts grounded in diff hunks and linter output.',                              aiConfidence: 42 },
    { id: 'nt5',  title: 'Build GitHub/GitLab webhook ingestion service',                status: 'backlog', assigneeId: 'n2', assignedTo: ['n2'],       startDate: '2026-06-01', dueDate: '2026-06-14', priority: 'high',   phase: 'implementation', tags: ['implementation'], description: 'Receive PR events, fetch patches, enqueue analysis jobs.',                                 aiConfidence: 50 },
    { id: 'nt6',  title: 'Implement reviewer dashboard (comment drafts, accept/edit)',   status: 'backlog', assigneeId: 'n2', assignedTo: ['n2'],       startDate: '2026-06-08', dueDate: '2026-06-22', priority: 'medium', phase: 'implementation', tags: ['frontend'],       description: 'Simple UI for course demo: load PR, show AI drafts, export final review.',               aiConfidence: 44 },
    { id: 'nt7',  title: 'Human evaluation protocol with two course tutors',             status: 'backlog', assigneeId: 'me', assignedTo: ['me'],       startDate: '2026-06-12', dueDate: '2026-06-24', priority: 'medium', phase: 'testing',        tags: ['testing'],        description: 'Blinded comparison of baseline vs assistant-assisted reviews.',                            aiConfidence: 38 },
    { id: 'nt8',  title: 'Write report, ethics appendix, and record demo',               status: 'backlog', assigneeId: 'me', assignedTo: ['me', 'n3'], startDate: '2026-06-18', dueDate: '2026-06-28', priority: 'high',   phase: 'documentation',  tags: ['documentation'],  description: 'Course submission pack including limitations and bias discussion.',                         aiConfidence: 40 },
  ] as Task[],
};

// ── Per-project Rubric data ────────────────────────────────────────────────────

// Normal — Q&A Chatbot (in progress, ~62%)
export const MOCK_RUBRIC: RubricItem[] = [
  { id: 'rb1', criterion: 'Technical implementation',  weight: 25, status: 'covered', evidence: 'RAG pipeline functional; ChromaDB, chunking, and reranking all working.',         score: 22, maxScore: 25 },
  { id: 'rb2', criterion: 'AI/ML integration',         weight: 20, status: 'covered', evidence: 'LLM integrated with context injection; answer relevance consistently above 80%.', score: 17, maxScore: 20 },
  { id: 'rb3', criterion: 'System documentation',      weight: 15, status: 'partial', evidence: 'Architecture doc in progress. API docs and deployment guide still pending.',       score: 8,  maxScore: 15 },
  { id: 'rb4', criterion: 'User testing',              weight: 15, status: 'partial', evidence: 'Evaluation plan drafted. Live sessions with students not yet conducted.',          score: 6,  maxScore: 15 },
  { id: 'rb5', criterion: 'Team collaboration',        weight: 10, status: 'covered', evidence: 'Meeting transcripts logged; Git contribution history reasonably balanced.',       score: 8,  maxScore: 10 },
  { id: 'rb6', criterion: 'Code quality & testing',   weight: 10, status: 'partial', evidence: 'Unit tests for RAG module present. Frontend and API tests not yet written.',      score: 5,  maxScore: 10 },
  { id: 'rb7', criterion: 'Presentation & demo',      weight:  5, status: 'partial', evidence: 'Demo environment configured. Slide deck not yet started.',                        score: 2,  maxScore:  5 },
];

// Worst case — Homework Grader (at risk, ~22%)
export const WORST_CASE_RUBRIC: RubricItem[] = [
  { id: 'rb1', criterion: 'Technical implementation',  weight: 25, status: 'partial', evidence: 'Dataset annotated and CNN architecture in progress. OCR, NLP, and API not started.', score: 8,  maxScore: 25 },
  { id: 'rb2', criterion: 'AI/ML integration',         weight: 20, status: 'missing', evidence: 'No working model integrated into the grading pipeline yet.',                         score: 0,  maxScore: 20 },
  { id: 'rb3', criterion: 'System documentation',      weight: 15, status: 'missing', evidence: 'No architecture or API documentation produced.',                                      score: 0,  maxScore: 15 },
  { id: 'rb4', criterion: 'User testing',              weight: 15, status: 'missing', evidence: 'No user evaluation sessions planned or conducted.',                                    score: 0,  maxScore: 15 },
  { id: 'rb5', criterion: 'Team collaboration',        weight: 10, status: 'partial', evidence: '2 of 5 members have been inactive for 6+ days. Coordination is breaking down.',      score: 3,  maxScore: 10 },
  { id: 'rb6', criterion: 'Code quality & testing',   weight: 10, status: 'partial', evidence: 'Minimal code written so far; no tests exist.',                                        score: 2,  maxScore: 10 },
  { id: 'rb7', criterion: 'Presentation & demo',      weight:  5, status: 'missing', evidence: 'No presentation artefacts created.',                                                  score: 0,  maxScore:  5 },
];

// Best case — Study Path Recommender (near complete, ~97%)
export const BEST_CASE_RUBRIC: RubricItem[] = [
  { id: 'rb1', criterion: 'Technical implementation',  weight: 25, status: 'covered', evidence: 'Full stack deployed: collaborative filtering, Neo4j graph, React dashboard all live.', score: 24, maxScore: 25 },
  { id: 'rb2', criterion: 'AI/ML integration',         weight: 20, status: 'covered', evidence: 'SVD++ model live; adaptive path algorithm re-ranks in real time on quiz results.',    score: 20, maxScore: 20 },
  { id: 'rb3', criterion: 'System documentation',      weight: 15, status: 'covered', evidence: 'Full API docs, deployment guide, and architecture diagram all submitted.',            score: 14, maxScore: 15 },
  { id: 'rb4', criterion: 'User testing',              weight: 15, status: 'covered', evidence: 'A/B study with 50 students completed; 18% faster topic mastery in test group.',       score: 15, maxScore: 15 },
  { id: 'rb5', criterion: 'Team collaboration',        weight: 10, status: 'covered', evidence: 'All 5 members active daily; balanced Git contributions across the full sprint.',      score: 10, maxScore: 10 },
  { id: 'rb6', criterion: 'Code quality & testing',   weight: 10, status: 'covered', evidence: '92% test coverage; CI/CD pipeline passing; linting enforced.',                       score:  9, maxScore: 10 },
  { id: 'rb7', criterion: 'Presentation & demo',      weight:  5, status: 'covered', evidence: '18-slide deck and 5-min demo video submitted; pilot results included.',              score:  5, maxScore:  5 },
];

// New project — not started (0%)
export const NOT_STARTED_RUBRIC: RubricItem[] = [
  { id: 'rb1', criterion: 'Technical implementation',  weight: 25, status: 'missing', evidence: 'No repository activity or working prototype yet.',                                    score: 0, maxScore: 25 },
  { id: 'rb2', criterion: 'AI/ML integration',         weight: 20, status: 'missing', evidence: 'LLM integration and evaluation not begun.',                                             score: 0, maxScore: 20 },
  { id: 'rb3', criterion: 'System documentation',      weight: 15, status: 'missing', evidence: 'No design or API documentation produced.',                                              score: 0, maxScore: 15 },
  { id: 'rb4', criterion: 'User testing',              weight: 15, status: 'missing', evidence: 'Evaluation protocol not scheduled.',                                                  score: 0, maxScore: 15 },
  { id: 'rb5', criterion: 'Team collaboration',        weight: 10, status: 'missing', evidence: 'Team roster finalised; no meetings or shared artefacts logged yet.',                     score: 0, maxScore: 10 },
  { id: 'rb6', criterion: 'Code quality & testing',   weight: 10, status: 'missing', evidence: 'No codebase or automated tests exist.',                                                 score: 0, maxScore: 10 },
  { id: 'rb7', criterion: 'Presentation & demo',      weight:  5, status: 'missing', evidence: 'No slides or demo recording.',                                                         score: 0, maxScore:  5 },
];

// ── Per-project Risk data ──────────────────────────────────────────────────────

// Normal — Q&A Chatbot
export const MOCK_RISKS: RiskAlert[] = [
  {
    id: 'r1',
    type: 'inactivity',
    severity: 'high',
    message: 'Zara Hussain — 24h inactivity on frontend tasks',
    detail: 'Assigned tasks "Implement React chat frontend" and UI wireframes have had no commit or progress in 24 hours. Deadline is April 30.',
    timestamp: '3 mins ago',
    memberId: 'm4',
    recommended_action_type: 'member_engagement',
    recommended_action: 'Send a check-in message to Zara and consider pairing with Dylan Park.',
  },
  {
    id: 'r2',
    type: 'deadline_risk',
    severity: 'medium',
    message: 'LLM integration at risk of missing April 27 deadline',
    detail: 'Prompt engineering iteration is taking longer than estimated. Current velocity suggests completion April 29 — 2 days over plan.',
    timestamp: '15 mins ago',
    recommended_action_type: 'deadline_risk',
    recommended_action: 'Scope down initial prompt variants; defer advanced citation formatting to a later sprint.',
  },
  {
    id: 'r3',
    type: 'ambiguity',
    severity: 'low',
    message: 'Rubric criterion 5 lacks measurable definition',
    detail: '"Conversational quality" has no defined metric or threshold. GLM flagged this as potentially subjective.',
    timestamp: '2 hours ago',
    recommended_action_type: 'scope_issue',
    recommended_action: 'Request clarification from supervisor on what constitutes a passing conversational score.',
  },
  {
    id: 'r4',
    type: 'missing_artifact',
    severity: 'medium',
    message: 'User evaluation report artefact not detected',
    detail: 'Rubric requires a formal user testing report with at least 20 participants. No document matching this description has been uploaded.',
    timestamp: '5 hours ago',
    recommended_action_type: 'scope_issue',
    recommended_action: 'Schedule evaluation sessions this week and assign Owen Chang as lead.',
  },
];

// Worst case — Homework Grader
export const WORST_CASE_RISKS: RiskAlert[] = [
  {
    id: 'wr1',
    type: 'inactivity',
    severity: 'high',
    message: 'Ingrid Mueller — 6 days inactivity on CV pipeline',
    detail: 'Assigned task "Build OCR and image preprocessing pipeline" has had zero activity for 6 days. This blocks model integration and end-to-end testing.',
    timestamp: '1 hour ago',
    memberId: 'w2',
    recommended_action_type: 'member_engagement',
    recommended_action: 'Escalate to project supervisor and redistribute OCR task to Tariq Nasir immediately.',
  },
  {
    id: 'wr2',
    type: 'inactivity',
    severity: 'high',
    message: 'Rafael Ortiz — 2 weeks inactivity, 0 contributions',
    detail: 'Assigned task "Create grader dashboard frontend" has seen no activity since joining. Contribution score is 0. Team has not flagged this.',
    timestamp: '3 hours ago',
    memberId: 'w5',
    recommended_action_type: 'member_engagement',
    recommended_action: 'Trigger workload redistribution — reassign frontend task or remove from critical path.',
  },
  {
    id: 'wr3',
    type: 'deadline_risk',
    severity: 'high',
    message: 'Project at critical risk — 8 of 10 tasks still in backlog',
    detail: 'Deadline is May 5. Only 1 task done and 1 in progress. At current velocity, fewer than 3 tasks will be complete by deadline.',
    timestamp: '30 mins ago',
    recommended_action_type: 'deadline_risk',
    recommended_action: 'Convene emergency team sync, triage critical-path tasks, and compress timeline immediately.',
  },
  {
    id: 'wr4',
    type: 'missing_artifact',
    severity: 'high',
    message: 'No AI model integration artefact detected',
    detail: 'Rubric requires a working AI grading component. No model has been trained, evaluated, or integrated into the submission pipeline.',
    timestamp: '6 hours ago',
    recommended_action_type: 'scope_issue',
    recommended_action: 'Assign ML Engineer to prioritise model training above all other tasks this week.',
  },
];

// Best case — Study Path Recommender
export const BEST_CASE_RISKS: RiskAlert[] = [
  {
    id: 'br1',
    type: 'ambiguity',
    severity: 'low',
    message: 'Minor gap in API documentation coverage',
    detail: 'GraphQL schema documentation is 95% complete. Two optional query fields lack usage examples. Unlikely to affect grading.',
    timestamp: '4 hours ago',
    recommended_action_type: 'scope_issue',
    recommended_action: 'Add example queries for the two undocumented fields before final submission.',
  },
];

// New project — Peer Code Review Assistant (not started)
export const NOT_STARTED_RISKS: RiskAlert[] = [];

// ── Submission upload grading outcomes ────────────────────────────────────────
// Maps checklist item name → rubric updates applied after a user confirms submission
export const MOCK_UPLOAD_GRADES: Record<
  string,
  { rubricId: string; newScore: number; newStatus: 'covered' | 'partial'; newEvidence: string }[]
> = {
  'Technical Documentation complete': [
    {
      rubricId: 'rb3',
      newScore: 14,
      newStatus: 'covered',
      newEvidence:
        'Technical documentation uploaded: architecture diagram, API reference, and code docs all verified. Deployment troubleshooting section absent.',
    },
  ],
  'Test Report submitted': [
    {
      rubricId: 'rb4',
      newScore: 10,
      newStatus: 'partial',
      newEvidence:
        'Test report uploaded: basic accuracy metrics present but participant count (16) is below the minimum of 20, and no baseline comparison was included.',
    },
  ],
  'Final Presentation Slides ready': [
    {
      rubricId: 'rb7',
      newScore: 4,
      newStatus: 'covered',
      newEvidence:
        'Presentation slides uploaded: 13-slide deck with demo screenshots and rubric self-assessment. Related work comparison slide missing.',
    },
  ],

  // ── Homework Grader (proj-worst) unique deliverables ─────────────────────────
  'proj-worst::Model Architecture Document': [
    { rubricId: 'rb3', newScore: 7,  newStatus: 'partial',
      newEvidence: 'Architecture document uploaded but skeletal — CNN choice noted; no formal component diagram, data flow, or inference specification.' },
  ],
  'proj-worst::Dataset Annotation Report': [
    { rubricId: 'rb2', newScore: 11, newStatus: 'partial',
      newEvidence: 'Annotation report uploaded: 500 samples and label schema present, but inter-annotator agreement and train/val/test split are undocumented.' },
  ],
  'proj-worst::System Integration Report': [
    { rubricId: 'rb1', newScore: 13, newStatus: 'partial',
      newEvidence: 'Integration report uploaded: dataset → CNN connection documented; OCR pipeline and NLP scoring module not yet integrated.' },
  ],
  'proj-worst::Final Presentation Slides ready': [
    { rubricId: 'rb7', newScore: 2,  newStatus: 'partial',
      newEvidence: 'Presentation uploaded: 8 slides present, no demo section, no evaluation results, rubric self-assessment absent.' },
  ],

  // ── Study Path Recommender (proj-best) unique deliverable ────────────────────
  'proj-best::Final Presentation Slides ready': [
    { rubricId: 'rb7', newScore: 5,  newStatus: 'covered',
      newEvidence: 'Presentation slides verified: 18-slide deck with live demo plan, A/B study results, related work comparison, and full rubric self-assessment.' },
  ],
};

// ── Per-item quality evaluations shown after upload grading ───────────────────
export const MOCK_UPLOAD_EVALUATIONS: Record<string, UploadEvaluation> = {

  // ─── Technical Documentation: strong overall, one gap in deployment docs ───
  'Technical Documentation complete': {
    overallScore: 14,
    maxScore: 15,
    pct: 93,
    grade: 'A',
    verdict: 'Excellent',
    summary:
      'Documentation package is comprehensive and well-structured. Architecture, API reference, and code docs all meet the rubric standard — one minor gap in the deployment troubleshooting section keeps this from a perfect score.',
    criteria: [
      {
        criterionId: 'rb3',
        criterion: 'System documentation',
        weight: 15,
        score: 14,
        maxScore: 15,
        status: 'covered',
        feedback:
          'Almost all required artefacts verified. The deployment section is present but lacks a troubleshooting guide, which is explicitly listed in the rubric.',
        checkpoints: [
          { text: 'Architecture diagram with full component interaction map', passed: true },
          { text: 'API reference — request/response schemas with example payloads', passed: true },
          { text: 'Inline code documentation coverage threshold (≥ 60%) met', passed: true },
          { text: 'System requirements and dependencies clearly listed', passed: true },
          { text: 'Deployment troubleshooting / FAQ section', passed: false },
        ],
      },
    ],
    strengths: [
      'Architecture diagram clearly illustrates the full RAG pipeline end-to-end — ChromaDB, reranker, LLM, and frontend data flow are all shown.',
      'API reference is detailed: each endpoint has request schema, response schema, status codes, and a worked example.',
      'Code documentation threshold is comfortably met; function-level docstrings are present throughout the retrieval module.',
    ],
    suggestions: [
      'Add a troubleshooting FAQ covering the 3–5 most common setup errors (e.g., ChromaDB connection failure, embedding model not found). This directly addresses the missing rubric checkpoint.',
      'Include API versioning notes and a changelog entry — demonstrates maintainability thinking.',
      'Consider a separate data-flow diagram for the retrieval-augmented generation step for evaluators unfamiliar with RAG internals.',
    ],
  },

  // ─── Test Report: participant shortfall and missing baseline comparison ─────
  'Test Report submitted': {
    overallScore: 10,
    maxScore: 15,
    pct: 67,
    grade: 'C+',
    verdict: 'Needs Work',
    summary:
      'The evaluation report covers the basics but falls short on two rubric requirements: participant count is below the minimum of 20, and no baseline comparison is included. These gaps meaningfully reduce the evidential quality of the findings.',
    criteria: [
      {
        criterionId: 'rb4',
        criterion: 'User testing',
        weight: 15,
        score: 10,
        maxScore: 15,
        status: 'partial',
        feedback:
          'Report is structured and readable, but the participant count and missing baseline comparison are flagged issues that reduce the score below the covered threshold.',
        checkpoints: [
          { text: 'Evaluation sessions documented with structured format', passed: true },
          { text: 'Participant count ≥ 20 (found: 16)', passed: false },
          { text: 'Accuracy metrics reported (precision and recall present)', passed: true },
          { text: 'Statistical comparison against a baseline approach', passed: false },
          { text: 'Qualitative feedback or participant quotes section', passed: false },
        ],
      },
    ],
    strengths: [
      'Session documentation is well-structured — task scenarios, participant profiles, and per-session notes are all present.',
      'Accuracy metrics (precision 0.74, recall 0.81) are clearly reported and broken down by question category.',
    ],
    suggestions: [
      'Recruit at least 4 more participants to meet the minimum of 20 required by the rubric. This is a blocking gap and will limit the score ceiling without it.',
      'Add a baseline comparison section — re-run the same question set against a simple keyword-search system and report the delta. Even a small table suffices.',
      'Include direct participant quotes or a short thematic summary of open-ended feedback to balance the quantitative analysis.',
    ],
  },

  // ─── Final Presentation: polished deck, one missing slide ─────────────────
  'Final Presentation Slides ready': {
    overallScore: 4,
    maxScore: 5,
    pct: 80,
    grade: 'B+',
    verdict: 'Good',
    summary:
      'Presentation deck is well-structured and demo-ready. Narrative, demo section, and rubric self-assessment are all strong. The main gap is the absence of a related work comparison slide, which is expected at this level.',
    criteria: [
      {
        criterionId: 'rb7',
        criterion: 'Presentation & demo',
        weight: 5,
        score: 4,
        maxScore: 5,
        status: 'covered',
        feedback:
          'Deck covers all core rubric requirements. The missing related work slide is the only item preventing a full mark.',
        checkpoints: [
          { text: '≥ 12 slides with clear problem-to-solution narrative', passed: true },
          { text: 'System demo section with annotated screenshots or live plan', passed: true },
          { text: 'Rubric self-assessment slide with evidence mapping', passed: true },
          { text: 'Related work / comparative analysis slide', passed: false },
          { text: 'Q&A preparation notes or anticipated questions', passed: true },
        ],
      },
    ],
    strengths: [
      'Narrative arc is strong: problem statement → system architecture → evaluation results → conclusion flows without gaps.',
      'Demo section includes fallback screenshots alongside the live demo plan — a sign of professional preparation.',
      'Rubric self-assessment slide directly cross-references each deliverable to its grading criterion, making evaluator verification easy.',
    ],
    suggestions: [
      'Add a related work slide that compares your chatbot to 2–3 existing Q&A or RAG-based systems. Even a 3-column comparison table would satisfy this checkpoint.',
      'The conclusion slide would benefit from a concrete "future work" direction — e.g., multi-modal document support or fine-tuned retrieval scoring.',
      'Consider a team contribution summary slide; some evaluators look for evidence of balanced workload distribution.',
    ],
  },

  // ── Homework Grader — skeletal architecture doc ──────────────────────────────
  'proj-worst::Model Architecture Document': {
    overallScore: 7,
    maxScore: 15,
    pct: 47,
    grade: 'D+',
    verdict: 'Needs Work',
    summary:
      'Document is skeletal — the CNN architecture choice is mentioned at a high level but critical sections (component diagram, training pipeline, inference spec) are entirely absent.',
    criteria: [
      {
        criterionId: 'rb3',
        criterion: 'System documentation',
        weight: 15,
        score: 7,
        maxScore: 15,
        status: 'partial',
        feedback: '3 of 5 required documentation checkpoints are missing, significantly limiting the score.',
        checkpoints: [
          { text: 'Document uploaded and parseable', passed: true },
          { text: 'Architecture choice (ResNet) justified with brief rationale', passed: true },
          { text: 'Formal component diagram or interaction map', passed: false },
          { text: 'Training pipeline and data flow documented', passed: false },
          { text: 'Inference specification (input/output schema, latency)', passed: false },
        ],
      },
    ],
    strengths: [
      'Architecture choice is justified with a brief reference to transfer learning benefits — a good starting point.',
      'Document is sectioned, making it easy to see exactly what is still missing.',
    ],
    suggestions: [
      'Add a formal component diagram showing the full pipeline: OCR → CNN → NLP scoring → grading output. This is the highest-priority gap.',
      'Document the training pipeline: dataset split ratios, augmentation strategy, loss function, and key hyperparameters.',
      'Include an inference specification: expected input format, output schema, and latency/throughput targets.',
    ],
  },

  // ── Homework Grader — annotation report missing IAA and splits ───────────────
  'proj-worst::Dataset Annotation Report': {
    overallScore: 11,
    maxScore: 20,
    pct: 55,
    grade: 'D+',
    verdict: 'Needs Work',
    summary:
      'Report documents 500 annotated samples with a defined label schema, but lacks inter-annotator agreement analysis, train/val/test split strategy, and any discussion of class imbalance.',
    criteria: [
      {
        criterionId: 'rb2',
        criterion: 'AI/ML integration',
        weight: 20,
        score: 11,
        maxScore: 20,
        status: 'partial',
        feedback: 'Dataset foundation is present but IAA metrics and split strategy are absent, leaving ML integration evidence significantly incomplete.',
        checkpoints: [
          { text: 'Sample count documented (500 samples)', passed: true },
          { text: 'Annotation label schema defined with category descriptions', passed: true },
          { text: "Inter-annotator agreement (Cohen's Kappa) reported", passed: false },
          { text: 'Train / validation / test split strategy defined', passed: false },
          { text: 'Class distribution analysis and imbalance handling', passed: false },
        ],
      },
    ],
    strengths: [
      '500 annotated samples is a reasonable dataset size for initial model training.',
      'Label schema is clearly defined with category descriptions — annotation instructions are reproducible.',
    ],
    suggestions: [
      "Compute and report inter-annotator agreement (Cohen's Kappa ≥ 0.7 is expected by the rubric).",
      'Define a train/val/test split strategy — 70/15/15 is a reasonable baseline. Document it explicitly.',
      'Include a class distribution chart and state how you will address any imbalance (oversampling, weighted loss, etc.).',
    ],
  },

  // ── Homework Grader — partial integration, key modules missing ───────────────
  'proj-worst::System Integration Report': {
    overallScore: 13,
    maxScore: 25,
    pct: 52,
    grade: 'D+',
    verdict: 'Needs Work',
    summary:
      'Integration report documents attempted module connections but only 2 of 5 pipeline stages are connected. OCR preprocessing and NLP scoring — both critical-path modules — are absent.',
    criteria: [
      {
        criterionId: 'rb1',
        criterion: 'Technical implementation',
        weight: 25,
        score: 13,
        maxScore: 25,
        status: 'partial',
        feedback: 'Dataset ingestion stage is properly documented, but over half the pipeline remains unintegrated.',
        checkpoints: [
          { text: 'Report structure present with a section per module', passed: true },
          { text: 'Dataset ingestion → CNN connection documented and tested', passed: true },
          { text: 'OCR preprocessing pipeline integrated', passed: false },
          { text: 'NLP rubric scoring module integrated', passed: false },
          { text: 'End-to-end test with a sample grading result', passed: false },
        ],
      },
    ],
    strengths: [
      'Dataset ingestion pipeline is the most complete component and is properly documented with I/O examples.',
      'Report correctly identifies the dependency chain between modules — shows architectural awareness.',
    ],
    suggestions: [
      'Prioritise OCR integration immediately — it is blocking NLP scoring and the full grading pipeline. Assign it to a single owner.',
      'Run at least one end-to-end sample through the partial pipeline (with stubs for missing modules) and document the output.',
      "Add a component readiness table: each module's status, owner, and estimated completion date.",
    ],
  },

  // ── Homework Grader — bare-bones presentation ────────────────────────────────
  'proj-worst::Final Presentation Slides ready': {
    overallScore: 2,
    maxScore: 5,
    pct: 40,
    grade: 'F',
    verdict: 'Needs Work',
    summary:
      'Uploaded deck contains 8 slides covering project motivation and dataset, but has no demo, no evaluation results, and no rubric self-assessment. Major sections required by the rubric are entirely absent.',
    criteria: [
      {
        criterionId: 'rb7',
        criterion: 'Presentation & demo',
        weight: 5,
        score: 2,
        maxScore: 5,
        status: 'partial',
        feedback: 'Only 2 of 5 rubric checkpoints are met. The deck reads as an early-stage draft with critical sections missing.',
        checkpoints: [
          { text: '≥ 12 slides with problem-to-solution narrative (found: 8)', passed: false },
          { text: 'System demo section with screenshots or live demo plan', passed: false },
          { text: 'Rubric self-assessment slide with evidence mapping', passed: false },
          { text: 'Problem statement and motivation clearly articulated', passed: true },
          { text: 'Dataset and annotation methodology described', passed: true },
        ],
      },
    ],
    strengths: [
      'Problem motivation is clearly articulated and sets up the project context well.',
      'Dataset slide describes the annotation process and sample counts — useful background for evaluators.',
    ],
    suggestions: [
      'Add slides for: system architecture, model performance results, and a live demo or recorded walkthrough. These are non-negotiable rubric requirements.',
      'Include a rubric self-assessment slide that maps each deliverable to its grading criterion.',
      'Expand the deck to at least 12 slides with a clear problem → approach → results → conclusion narrative.',
    ],
  },

  // ── Study Path Recommender — excellent final presentation ────────────────────
  'proj-best::Final Presentation Slides ready': {
    overallScore: 5,
    maxScore: 5,
    pct: 100,
    grade: 'A',
    verdict: 'Excellent',
    summary:
      'Presentation deck is polished, comprehensive, and demo-ready. All rubric requirements are met with a narrative that flows from research motivation through A/B evaluation results to concrete future directions.',
    criteria: [
      {
        criterionId: 'rb7',
        criterion: 'Presentation & demo',
        weight: 5,
        score: 5,
        maxScore: 5,
        status: 'covered',
        feedback: 'All 5 rubric checkpoints verified. Deck demonstrates a high level of preparation and domain understanding.',
        checkpoints: [
          { text: '18 slides with clear problem-to-solution-to-results narrative', passed: true },
          { text: 'Live demo plan with annotated screenshots as fallback', passed: true },
          { text: 'Rubric self-assessment slide with full evidence mapping', passed: true },
          { text: 'Related work comparison — 3 existing recommender systems', passed: true },
          { text: 'A/B evaluation results and team contribution summary', passed: true },
        ],
      },
    ],
    strengths: [
      'Narrative is compelling and well-paced across 18 slides — the A/B study results slide provides strong evidence of rigour.',
      'Related work comparison situates the project clearly within the broader recommender systems landscape.',
      'Demo section includes a recorded walkthrough as a fallback — shows professional preparation.',
    ],
    suggestions: [
      'The future work slide could be more specific: mention fine-tuned path scoring or LMS gradebook integration as concrete next steps.',
      'Consider trimming 1–2 architecture slides to leave more time for evaluation results during the live presentation.',
    ],
  },
};

// ── Per-project submission checklists ─────────────────────────────────────────
// Keyed by project ID; items in SETUP_ITEMS (ProjectWorkspacePage) never show upload buttons.
export const MOCK_CHECKLISTS: Record<string, ChecklistItem[]> = {

  // Normal — Q&A Chatbot (62% done: brief/rubric/transcripts in; docs/tests/slides pending)
  'proj-001': [
    { item: 'Project Brief uploaded',           status: 'complete', priority: 'high' },
    { item: 'Grading Rubric uploaded',          status: 'complete', priority: 'high' },
    { item: 'Meeting Transcripts submitted',    status: 'complete', priority: 'medium' },
    { item: 'Technical Documentation complete', status: 'pending',  priority: 'high' },
    { item: 'Test Report submitted',            status: 'pending',  priority: 'high' },
    { item: 'Final Presentation Slides ready',  status: 'pending',  priority: 'medium' },
  ],

  // Worst case — Homework Grader (22% done: transcripts + all deliverables still pending)
  'proj-worst': [
    { item: 'Project Brief uploaded',           status: 'complete', priority: 'high' },
    { item: 'Grading Rubric uploaded',          status: 'complete', priority: 'high' },
    { item: 'Meeting Transcripts submitted',    status: 'pending',  priority: 'medium' },
    { item: 'Model Architecture Document',      status: 'pending',  priority: 'high' },
    { item: 'Dataset Annotation Report',        status: 'pending',  priority: 'high' },
    { item: 'System Integration Report',        status: 'pending',  priority: 'high' },
    { item: 'Final Presentation Slides ready',  status: 'pending',  priority: 'medium' },
  ],

  // Best case — Study Path Recommender (97% done: only final slides remaining)
  'proj-best': [
    { item: 'Project Brief uploaded',           status: 'complete', priority: 'high' },
    { item: 'Grading Rubric uploaded',          status: 'complete', priority: 'high' },
    { item: 'Meeting Transcripts submitted',    status: 'complete', priority: 'medium' },
    { item: 'Technical Documentation complete', status: 'complete', priority: 'high' },
    { item: 'Research Paper submitted',         status: 'complete', priority: 'high' },
    { item: 'User Evaluation Report submitted', status: 'complete', priority: 'high' },
    { item: 'Final Presentation Slides ready',  status: 'pending',  priority: 'medium' },
  ],

  // New — Peer Code Review Assistant (0%: roster only, no artefacts yet)
  'proj-new': [
    { item: 'Project Brief uploaded',           status: 'pending',  priority: 'high' },
    { item: 'Grading Rubric uploaded',          status: 'pending',  priority: 'high' },
    { item: 'Team charter / roles confirmed',   status: 'pending',  priority: 'medium' },
    { item: 'Repository created and linked',    status: 'pending',  priority: 'high' },
    { item: 'Technical design note submitted', status: 'pending',  priority: 'high' },
    { item: 'Evaluation plan approved',         status: 'pending',  priority: 'medium' },
    { item: 'Final Presentation Slides ready',  status: 'pending',  priority: 'medium' },
  ],
};
