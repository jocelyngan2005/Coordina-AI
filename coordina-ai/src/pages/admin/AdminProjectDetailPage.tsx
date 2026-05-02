import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { projectsApi } from '../../api/projects';
import { analyticsApi, workflowApi } from '../../api/workflow';
import { teamsApi } from '../../api/teams';
import { tasksApi } from '../../api/tasks';
import type { BackendProject, ProjectAnalytics, BackendMember, BackendTask } from '../../api/types';

const card: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 20px',
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

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

/* ─── Task Status Pill ─── */
function TaskPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    done:        { bg: '#dcfce7', color: '#166534' },
    in_progress: { bg: '#fef3c7', color: '#92400e' },
    pending:     { bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = cfg[status] ?? cfg.pending;
  const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
      {label}
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

/* ─── Contribution Pie ─── */
function ContributionPie({ members }: { members: BackendMember[] }) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const total = members.reduce((s, m) => s + m.contribution_score, 0) || 1;
  let cumulative = 0;

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
      <SectionHead title="Contribution Analytics" />
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          {members.map((m, i) => {
            const pct = m.contribution_score / total;
            const start = cumulative;
            cumulative += pct;
            return (
              <path key={m.id} d={slicePath(start, cumulative)} fill={colors[i % colors.length]} opacity={0.9}>
                <title>{m.name}: {Math.round(pct * 100)}%</title>
              </path>
            );
          })}
          <circle cx="60" cy="60" r="26" fill="white" />
          <text x="60" y="56" textAnchor="middle" fontSize="9" fill="var(--grey-500)">Avg</text>
          <text x="60" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--grey-900)">
            {members.length > 0 ? Math.round(total / members.length) : 0}%
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={m.name} size={22} />
              <span style={{ fontSize: 12, flex: 1, color: 'var(--grey-800)', fontWeight: 500 }}>
                {m.name}
              </span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors[i % colors.length] }}>
                  {m.contribution_score}%
                </span>
                <div style={{ width: 50, height: 3, background: 'var(--grey-150)', borderRadius: 2, marginTop: 2 }}>
                  <div style={{ width: `${m.contribution_score}%`, height: '100%', background: colors[i % colors.length], borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No members.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Risk Panel ─── */
function RiskPanel({ state }: { state: Record<string, unknown> | null }) {
  const risks = Array.isArray((state?.last_risk_report as Record<string, unknown>)?.risks)
    ? ((state?.last_risk_report as Record<string, unknown>)?.risks as Record<string, unknown>[])
    : [];
  const deadlineProb = Number((state?.last_risk_report as Record<string, unknown>)?.deadline_failure_probability ?? 0);

  return (
    <div style={card}>
      <SectionHead title="Risk Report" count={risks.length} />
      {deadlineProb > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: deadlineProb > 0.6 ? '#fef2f2' : '#fefce8', borderRadius: 8, border: `1px solid ${deadlineProb > 0.6 ? '#fecaca' : '#fef08a'}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: deadlineProb > 0.6 ? '#dc2626' : '#ca8a04' }}>
            Deadline failure probability:
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: deadlineProb > 0.6 ? '#dc2626' : '#ca8a04' }}>
            {Math.round(deadlineProb * 100)}%
          </span>
        </div>
      )}
      {risks.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {state ? 'No active risks detected.' : 'Run the workflow pipeline to generate risk data.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {risks.map((r, i) => {
            const severity = String(r.severity ?? 'medium').toLowerCase();
            const color = severity === 'high' ? '#dc2626' : severity === 'medium' ? '#f59e0b' : '#6b7280';
            return (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--grey-50)', borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)', marginBottom: 2 }}>
                  {String(r.type ?? r.risk_type ?? `Risk ${i + 1}`)}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                  {String(r.description ?? r.message ?? '')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Task List ─── */
function TaskList({ tasks, members }: { tasks: BackendTask[]; members: BackendMember[] }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const tabs = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
    { key: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
    { key: 'done', label: 'Done', count: tasks.filter(t => t.status === 'done').length },
  ];

  return (
    <div style={card}>
      <SectionHead title="Tasks" count={tasks.length} />
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: '1px solid', cursor: 'pointer',
              background: filter === t.key ? 'rgba(99,102,241,0.1)' : 'transparent',
              borderColor: filter === t.key ? '#a5b4fc' : 'var(--border)',
              color: filter === t.key ? '#6366f1' : 'var(--grey-500)',
              transition: 'all var(--t-fast)',
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>
      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: 20, textAlign: 'center' }}>No tasks.</p>
        ) : filtered.map((t, i) => {
          const assignee = t.assignee_id ? memberMap[t.assignee_id] : undefined;
          const priorityColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#9ca3af' };
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--grey-100)' : 'none',
              background: 'var(--white)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[t.priority] ?? '#9ca3af', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </p>
                {t.due_date && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Due {t.due_date.slice(0, 10)}</span>}
              </div>
              <TaskPill status={t.status} />
              {assignee && <Avatar name={assignee.name} size={22} />}
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
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
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
          if (ws.status === 'fulfilled') setWorkflowState(ws.value as unknown as Record<string, unknown>);
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
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'}
        >
          ← Back to Overview
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--grey-900)' }}>{project.name}</h1>
              <StatusBadge status={project.status} />
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                READ-ONLY
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
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{Math.round(analytics.completion_pct)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--grey-150)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${analytics.completion_pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 3, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ContributionPie members={members} />
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
