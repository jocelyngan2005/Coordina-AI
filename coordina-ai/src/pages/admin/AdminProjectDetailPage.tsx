import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { projectsApi } from '../../api/projects';
import { analyticsApi, workflowApi } from '../../api/workflow';
import { extractRisks } from '../../api/mappers';
import type { RiskAlert } from '../../types';
import { teamsApi } from '../../api/teams';
import { tasksApi } from '../../api/tasks';
import type { BackendProject, ProjectAnalytics, BackendMember, BackendTask } from '../../api/types';

const card: React.CSSProperties = {
  background: '#fafaf8',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
};

/* Mirror ProjectWorkspacePage statusConfig */
const statusConfig: Record<string, { color: string; label: string }> = {
  done:        { color: '#274133', label: 'Done' },
  in_progress: { color: '#ce9042', label: 'In Progress' },
  pending:     { color: '#6b7280', label: 'Pending' },
};

const priorityColor: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: 'var(--grey-400)',
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: '#dcfce7', color: '#166534', label: 'Active' },
    at_risk:   { bg: '#fef3c7', color: '#92400e', label: 'At Risk' },
    completed: { bg: '#ede9fe', color: '#5b21b6', label: 'Completed' },
    archived:  { bg: '#f3f4f6', color: '#6b7280', label: 'Archived' },
  };
  const s = cfg[status] ?? cfg.archived;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 28, color }: { name: string; size?: number; color?: string }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color ?? 'var(--grey-900)', color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

/* ─── Task Status Chip — matches ProjectWorkspacePage statusConfig colours ─── */
function TaskChip({ status }: { status: string }) {
  const sc = statusConfig[status] ?? statusConfig.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      background: sc.color + '22', color: sc.color,
      border: `1px solid ${sc.color}44`,
    }}>
      {sc.label}
    </span>
  );
}

/* ─── Section header ─── */
function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)' }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--grey-100)', color: 'var(--grey-600)' }}>
          {count}
        </span>
      )}
    </div>
  );
}

/* ─── Accountability Matrix — mirrors AccountabilityAndTasks in ProjectWorkspacePage ─── */
const PIE_COLORS = ['#542916', '#b79858', '#a13a1e', '#88b8ce', '#f1c166'];

function AccountabilityMatrix({ members, tasks }: { members: BackendMember[]; tasks: BackendTask[] }) {
  /* Compute per-member completion pct from task assignments — same logic as workspace */
  const memberProgress = members.map((member) => {
    const assigned = tasks.filter(t => t.assignee_id === member.id);
    const done     = assigned.filter(t => t.status === 'done').length;
    const completionPct = assigned.length > 0
      ? Math.round((done / assigned.length) * 100)
      : Math.round(member.contribution_score * (member.contribution_score <= 1 ? 100 : 1)); // fallback to backend score
    return { ...member, assigned: assigned.length, done, completionPct };
  });

  const totalCompletion = memberProgress.reduce((s, m) => s + m.completionPct, 0);
  const total = totalCompletion || members.length || 1;
  const avgScore = memberProgress.length > 0
    ? Math.round(totalCompletion / memberProgress.length)
    : 0;

  /* Build pie slices */
  let cumulative = 0;
  const slices = memberProgress.map((m, i) => {
    const pct = totalCompletion === 0 ? (1 / members.length) : (m.completionPct / total);
    const start = cumulative;
    cumulative += pct;
    return { ...m, pct, startAngle: start, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  function polar(cx: number, cy: number, r: number, pct: number) {
    const a = pct * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function slicePath(start: number, end: number) {
    const s = polar(60, 60, 48, start);
    const e = polar(60, 60, 48, end);
    const large = end - start > 0.5 ? 1 : 0;
    return `M60,60 L${s.x},${s.y} A48,48 0 ${large} 1 ${e.x},${e.y} Z`;
  }

  return (
    <div style={card}>
      <SectionHead title="Accountability Matrix" />
      {members.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No team members yet.</p>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <svg width="150" height="150" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
            {slices.map((s) => (
              <path key={s.id} d={slicePath(s.startAngle, s.startAngle + s.pct)} fill={s.color} opacity={0.9}>
                <title>{s.name}: {Math.round(s.pct * 100)}%</title>
              </path>
            ))}
            <circle cx="60" cy="60" r="26" fill="white" />
            <text x="60" y="55" textAnchor="middle" fontSize="9" fill="var(--grey-500)">Score</text>
            <text x="60" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--grey-900)">
              {avgScore}%
            </text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {slices.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={s.name} size={24} color={s.color} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-900)', flex: 1 }}>
                  {s.name.split(' ')[0]}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {s.done}/{s.assigned} tasks</span>
                </span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-900)' }}>{s.completionPct}%</p>
                  <div style={{ width: 40, height: 3, background: 'var(--grey-150)', borderRadius: 2, marginTop: 2 }}>
                    <div style={{ width: `${s.completionPct}%`, height: '100%', background: s.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Risk Panel — uses same extractRisks mapper as ProjectWorkspacePage ─── */
const severityColor: Record<string, string> = { high: '#7d2027', medium: '#ce9042', low: '#274133' };
const severityBg: Record<string, string>   = { high: '#f9e8e9', medium: '#fdf3e3', low: '#e6efeb' };
const typeIcon: Record<string, string> = {
  inactivity:          '👤',
  deadline_risk:       '⏰',
  dependency_blocker:  '🔗',
  ambiguity:           '❓',
  missing_artifact:    '📄',
};

function RiskPanel({ state }: { state: Record<string, unknown> | null }) {
  const riskReport = state?.last_risk_report as Record<string, unknown> | undefined;
  const risks: RiskAlert[] = riskReport ? (extractRisks(riskReport) ?? []) : [];

  /* Deadline failure probability from analytics */
  const deadlineProb = Number(riskReport?.deadline_failure_probability ?? 0);

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)' }}>Risk Report</span>
          {risks.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--grey-100)', color: 'var(--grey-600)' }}>
              {risks.length} active
            </span>
          )}
        </div>
        {deadlineProb > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            background: severityBg[deadlineProb > 0.6 ? 'high' : 'medium'],
            color: severityColor[deadlineProb > 0.6 ? 'high' : 'medium'],
          }}>
            {Math.round(deadlineProb * 100)}% deadline risk
          </span>
        )}
      </div>

      {/* Empty state */}
      {risks.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {state ? 'No active risks detected.' : 'Run the workflow pipeline to generate risk data.'}
        </p>
      )}

      {/* Risk cards */}
      {risks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
          {risks.map((risk, i) => (
            <div key={risk.id} style={{
              padding: '10px 0',
              borderBottom: i < risks.length - 1 ? '1px solid var(--grey-100)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{typeIcon[risk.type] ?? '⚠️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>{risk.message}</p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                      background: severityBg[risk.severity], color: severityColor[risk.severity],
                    }}>{risk.severity}</span>
                  </div>
                  {risk.detail && (
                    <p style={{ fontSize: 11, color: 'var(--grey-600)', lineHeight: 1.4, marginBottom: 4 }}>{risk.detail}</p>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{risk.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Task List ─── */
function TaskList({ tasks, members }: { tasks: BackendTask[]; members: BackendMember[] }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all'); // member id or 'all' or 'unassigned'

  /* Apply both filters */
  const filtered = tasks.filter(t => {
    const statusOk = statusFilter === 'all' || t.status === statusFilter;
    const memberOk =
      memberFilter === 'all' ? true :
      memberFilter === 'unassigned' ? !t.assignee_id :
      t.assignee_id === memberFilter;
    return statusOk && memberOk;
  });

  const statusTabs = [
    { key: 'all',         label: 'All',         count: tasks.length },
    { key: 'in_progress', label: 'In Progress',  count: tasks.filter(t => t.status === 'in_progress').length },
    { key: 'pending',     label: 'Pending',       count: tasks.filter(t => t.status === 'pending').length },
    { key: 'done',        label: 'Done',          count: tasks.filter(t => t.status === 'done').length },
  ];

  /* Build member chips — only show members who have ≥1 task */
  const membersWithTasks = members.filter(m => tasks.some(t => t.assignee_id === m.id));
  const unassignedCount  = tasks.filter(t => !t.assignee_id).length;

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    border: '1px solid', cursor: 'pointer',
    background:   active ? 'var(--grey-900)' : 'transparent',
    borderColor:  active ? 'var(--grey-900)' : 'var(--border)',
    color:        active ? 'var(--white)' : 'var(--grey-500)',
    transition: 'all var(--t-fast)',
    fontFamily: 'inherit',
  });

  return (
    <div style={card}>
      <SectionHead title="Tasks" count={tasks.length} />

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {statusTabs.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)} style={tabBtn(statusFilter === t.key)}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Member filter chips */}
      {membersWithTasks.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--grey-100)' }}>
          {/* All chip */}
          <button
            onClick={() => setMemberFilter('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
              border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
              background:  memberFilter === 'all' ? 'var(--grey-900)' : 'transparent',
              borderColor: memberFilter === 'all' ? 'var(--grey-900)' : 'var(--border)',
              color:       memberFilter === 'all' ? 'var(--white)' : 'var(--grey-500)',
              transition: 'all var(--t-fast)',
            }}
          >All members</button>

          {/* Per-member chips */}
          {membersWithTasks.map((m) => {
            const color = PIE_COLORS[members.indexOf(m) % PIE_COLORS.length];
            const active = memberFilter === m.id;
            const count = tasks.filter(t => t.assignee_id === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setMemberFilter(active ? 'all' : m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px 3px 4px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                  border: `1px solid ${active ? color : 'var(--border)'}`, cursor: 'pointer',
                  background: active ? color + '22' : 'transparent',
                  color: active ? color : 'var(--grey-600)',
                  transition: 'all var(--t-fast)', fontFamily: 'inherit',
                }}
              >
                <Avatar name={m.name} size={18} color={active ? color : 'var(--grey-300)'} />
                {m.name.split(' ')[0]}
                <span style={{ fontSize: 9, fontWeight: 700, color: active ? color : 'var(--grey-400)' }}>·{count}</span>
              </button>
            );
          })}

          {/* Unassigned chip */}
          {unassignedCount > 0 && (
            <button
              onClick={() => setMemberFilter(memberFilter === 'unassigned' ? 'all' : 'unassigned')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                background:  memberFilter === 'unassigned' ? 'var(--grey-100)' : 'transparent',
                borderColor: memberFilter === 'unassigned' ? 'var(--grey-400)' : 'var(--border)',
                color:       memberFilter === 'unassigned' ? 'var(--grey-700)' : 'var(--grey-400)',
                transition: 'all var(--t-fast)',
              }}
            >
              Unassigned · {unassignedCount}
            </button>
          )}
        </div>
      )}

      {/* Task rows */}
      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: 20, textAlign: 'center' }}>No tasks match the current filter.</p>
        ) : filtered.map((t, i) => {
          const memberIdx  = members.findIndex(m => m.id === t.assignee_id);
          const assignee   = t.assignee_id ? memberMap[t.assignee_id] : undefined;
          const avatarColor = memberIdx >= 0 ? PIE_COLORS[memberIdx % PIE_COLORS.length] : undefined;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--grey-100)' : 'none',
              background: 'var(--white)',
            }}>
              {/* Priority dot */}
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[t.priority] ?? 'var(--grey-400)', flexShrink: 0 }} />

              {/* Title + due date */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </p>
                {t.due_date && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Due {t.due_date.slice(0, 10)}</span>}
              </div>

              {/* Status chip */}
              <TaskChip status={t.status} />

              {/* Assignee: avatar + first name */}
              {assignee ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <Avatar name={assignee.name} size={20} color={avatarColor} />
                  <span style={{ fontSize: 11, color: 'var(--grey-600)', whiteSpace: 'nowrap' }}>
                    {assignee.name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--grey-300)', fontStyle: 'italic', flexShrink: 0 }}>Unassigned</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── Decision Log ─── */
function DecisionLog({ decisions }: { decisions: unknown[] }) {
  if (decisions.length === 0) return (
    <div style={card}>
      <SectionHead title="GLM Decision Log" />
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No decision logs available yet.</p>
    </div>
  );

  return (
    <div style={card}>
      <SectionHead title="GLM Decision Log" count={decisions.length} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
        {decisions.map((d, i) => {
          const dec = d as Record<string, unknown>;
          return (
            <div key={i} style={{
              padding: '10px 14px',
              borderBottom: i < decisions.length - 1 ? '1px solid var(--grey-100)' : 'none',
              background: 'var(--white)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-900)' }}>
                  {String(dec.agent_type ?? dec.decision_type ?? 'GLM Agent')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  {dec.created_at ? new Date(String(dec.created_at)).toLocaleString() : ''}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--grey-700)', lineHeight: 1.5 }}>
                {String(dec.reasoning ?? dec.summary ?? dec.content ?? JSON.stringify(d)).slice(0, 200)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<BackendProject | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [members, setMembers] = useState<BackendMember[]>([]);
  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [workflowState, setWorkflowState] = useState<Record<string, unknown> | null>(null);
  const [decisions, setDecisions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const [proj, anal, mems, tsks] = await Promise.all([
          projectsApi.get(id!),
          analyticsApi.projectOverview(id!).catch(() => null),
          teamsApi.listByProject(id!).catch(() => []),
          tasksApi.listByProject(id!).catch(() => []),
        ]);
        if (cancelled) return;
        setProject(proj);
        setAnalytics(anal);
        setMembers(mems);
        setTasks(tsks);

        // Best-effort: workflow state & decisions
        const [ws, dec] = await Promise.allSettled([
          workflowApi.getState(id!),
          workflowApi.getDecisions(id!, 30),
        ]);
        if (!cancelled) {
          if (ws.status === 'fulfilled') {
            const state = ws.value as unknown as Record<string, unknown>;
            setWorkflowState(state);

            // Sync GLM assignments to DB tasks if not persisted yet (matches workspace logic)
            if (Array.isArray(state.tasks)) {
              const glmAssignees = new Map<string, string>();
              for (const t of state.tasks) {
                const tObj = t as Record<string, unknown>;
                const assignee = Array.isArray(tObj.assigned_to) ? tObj.assigned_to[0] : tObj.assigned_to;
                if (assignee && (tObj.id || tObj.task_id)) {
                  glmAssignees.set(String(tObj.id ?? tObj.task_id), String(assignee));
                }
              }
              setTasks(tsks.map(t => ({
                ...t,
                assignee_id: t.assignee_id ?? glmAssignees.get(t.task_id ?? t.id) ?? null
              })));
            }

            // Sync GLM members so their IDs ("M1", "M2") match the tasks' assignee_id
            if (Array.isArray(state.role_assignments) && state.role_assignments.length > 0) {
              const roleAssignments = state.role_assignments as Record<string, unknown>[];
              const contributionBalance = (state.contribution_balance ?? []) as Record<string, unknown>[];
              const glmMembers: BackendMember[] = roleAssignments.map(ra => {
                const cb = contributionBalance.find(c => c.member_id === ra.member_id);
                return {
                  id: String(ra.member_id),
                  project_id: id!,
                  name: String(ra.name ?? ra.member_name ?? ''),
                  email: null,
                  skills: [String(ra.role ?? ra.assigned_role ?? 'Member')],
                  contribution_score: cb ? Number(cb.contribution_score ?? 0) * 100 : 0,
                  last_activity_at: null,
                  joined_at: new Date().toISOString(),
                };
              });
              setMembers(glmMembers);
            }
          }
          if (dec.status === 'fulfilled') setDecisions(dec.value);
        }
      } catch {
        // fallback: leave null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <PageLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...card, height: 120, animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--grey-100)' }} />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!project) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 16 }}>Project not found.</p>
          <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
            ← Back to Overview
          </button>
        </div>
      </PageLayout>
    );
  }

  const daysLeft = project.deadline_date
    ? Math.ceil((new Date(project.deadline_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <PageLayout>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/admin')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-900)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'}
        >
          ← Back to Overview
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--grey-900)' }}>{project.name}</h1>
              <StatusBadge status={project.status} />
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'var(--grey-100)', color: 'var(--grey-500)', border: '1px solid var(--border)' }}>
                Read Only
              </span>
            </div>
            {project.description && (
              <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 560 }}>{project.description}</p>
            )}
          </div>
          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {[
              { label: 'Members', value: members.length },
              { label: 'Tasks', value: tasks.length },
              { label: 'Done', value: tasks.filter(t => t.status === 'done').length },
              ...(daysLeft !== null ? [{ label: daysLeft < 0 ? 'Overdue' : 'Days left', value: Math.abs(daysLeft) }] : []),
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--grey-900)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {analytics && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Overall Progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey-700)' }}>{Math.round(analytics.completion_pct)}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--grey-150)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${analytics.completion_pct}%`, height: '100%', background: 'var(--grey-900)', borderRadius: 2, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AccountabilityMatrix members={members} tasks={tasks} />
        <RiskPanel state={workflowState} />
      </div>
      <div style={{ marginTop: 16 }}>
        <TaskList tasks={tasks} members={members} />
      </div>
      <div style={{ marginTop: 16 }}>
        <DecisionLog decisions={decisions} />
      </div>
    </PageLayout>
  );
}
