import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { MOCK_PROJECT } from '../data/mockData';
import type { Task } from '../types';

type Column = Task['status'];
const COLUMNS: { key: Column; label: string }[] = [
  { key: 'backlog',     label: 'Backlog' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review',      label: 'Review' },
  { key: 'done',        label: 'Done' },
];

const priorityDot: Record<string, string> = { high: '#111', medium: '#888', low: '#ccc' };

function Avatar({ initials, size = 24 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--grey-900)', color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function ProjectWorkspacePage() {
  const navigate = useNavigate();
  const p = MOCK_PROJECT;
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const memberMap = Object.fromEntries(p.teamMembers.map(m => [m.id, m]));

  const card: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  };

  return (
    <PageLayout
      topBar={
        <TopBar
          title={p.name}
          subtitle={`Due ${p.deadline} · ${p.teamMembers.length} members`}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/proj-001/risks`)}>
                Risks
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/proj-001/agents`)}>
                Agents
              </Button>
              <Button size="sm" variant="primary" onClick={() => navigate(`/projects/proj-001/submission`)}>
                Submission
              </Button>
            </>
          }
        />
      }
    >
      <div style={{ display: 'flex', gap: 16, height: '100%' }}>
        {/* Kanban board */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignContent: 'start' }}>
          {COLUMNS.map(col => {
            const colTasks = p.tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>{col.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--grey-500)',
                    background: 'var(--grey-150)', borderRadius: 99, padding: '1px 7px',
                  }}>{colTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map(task => {
                    const member = memberMap[task.assigneeId];
                    return (
                      <div
                        key={task.id}
                        onClick={() => setActiveTask(task === activeTask ? null : task)}
                        style={{
                          ...card,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          borderColor: activeTask?.id === task.id ? 'var(--grey-700)' : 'var(--border)',
                          transition: 'border-color var(--t-fast)',
                        }}
                        onMouseEnter={e => { if (activeTask?.id !== task.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--grey-300)'; }}
                        onMouseLeave={e => { if (activeTask?.id !== task.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
                      >
                        {/* Priority dot */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {task.tags.slice(0, 2).map(tag => (
                              <span key={tag} style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', background: 'var(--grey-100)', padding: '1px 6px', borderRadius: 99 }}>{tag}</span>
                            ))}
                          </div>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: priorityDot[task.priority] }} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--grey-900)', lineHeight: 1.35, marginBottom: 10 }}>{task.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {member && <Avatar initials={member.initials} size={22} />}
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{task.dueDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel — Team + Task detail */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Task detail */}
          {activeTask && (
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, flex: 1 }}>{activeTask.title}</h3>
                <button onClick={() => setActiveTask(null)} style={{ color: 'var(--grey-400)', fontSize: 16, cursor: 'pointer', marginLeft: 8, border: 'none', background: 'none' }}>×</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>{activeTask.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Priority</span>
                  <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{activeTask.priority}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Due</span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{activeTask.dueDate}</span>
                </div>
                {memberMap[activeTask.assigneeId] && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Assignee</span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{memberMap[activeTask.assigneeId].name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team panel */}
          <div style={{ ...card, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Team</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {p.teamMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={m.initials} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{m.lastActive}</p>
                  </div>
                  <div style={{ width: 30, height: 30, position: 'relative', flexShrink: 0 }}>
                    <svg viewBox="0 0 30 30" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="15" cy="15" r="12" fill="none" stroke="var(--grey-150)" strokeWidth="3" />
                      <circle
                        cx="15" cy="15" r="12" fill="none"
                        stroke={m.contributionScore > 80 ? 'var(--grey-900)' : m.contributionScore > 65 ? 'var(--grey-600)' : 'var(--grey-400)'}
                        strokeWidth="3"
                        strokeDasharray={`${(m.contributionScore / 100) * 75.4} 75.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: 'var(--grey-700)' }}>{m.contributionScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent status bar */}
          <div style={{ ...card, padding: 14 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Agent Status</h3>
            {[
              { name: 'Instruction Analysis', status: 'done' },
              { name: 'Planning', status: 'done' },
              { name: 'Team Coordination', status: 'active' },
              { name: 'Risk Detection', status: 'thinking' },
              { name: 'Submission Readiness', status: 'idle' },
            ].map(a => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div
                  className={a.status === 'thinking' ? 'pulsing' : ''}
                  style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: a.status === 'done' ? 'var(--grey-400)' : a.status === 'active' ? 'var(--grey-900)' : a.status === 'thinking' ? 'var(--grey-700)' : 'var(--grey-200)',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--grey-700)', flex: 1 }}>{a.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'capitalize' }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
