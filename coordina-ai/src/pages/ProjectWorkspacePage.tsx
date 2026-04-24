import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import { MOCK_PROJECT, MOCK_RISKS, MOCK_RUBRIC } from '../data/mockData';
import type { Task } from '../types';

/* ─── Helpers ─── */
function Avatar({ initials, size = 24 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--grey-900)', color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
};

const statusConfig: Record<Task['status'], { color: string; label: string }> = {
  done:        { color: '#22c55e', label: 'Done' },
  in_progress: { color: '#f59e0b', label: 'In Progress' },
  review:      { color: '#6366f1', label: 'Review' },
  backlog:     { color: 'var(--grey-300)', label: 'Backlog' },
};

const priorityColor: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: 'var(--grey-400)',
};

/* ─── Section A: Rubric Tracker (expandable with Submission Readiness) ─── */
function RubricTracker() {
  const [showReadiness, setShowReadiness] = useState(false);
  const rubric = MOCK_RUBRIC;
  const totalScore = rubric.reduce((s, r) => s + r.score, 0);
  const maxScore   = rubric.reduce((s, r) => s + r.maxScore, 0);
  const pct = Math.round((totalScore / maxScore) * 100);

  const covered = rubric.filter(r => r.status === 'covered').length;
  const partial  = rubric.filter(r => r.status === 'partial').length;
  const missing  = rubric.filter(r => r.status === 'missing').length;
  const goNogo = missing === 0 && partial <= 1 ? 'GO' : 'NO-GO';

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionTitle>Grade Secured</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            background: goNogo === 'GO' ? '#dcfce7' : '#fee2e2',
            color:      goNogo === 'GO' ? '#166534'  : '#991b1b',
          }}>{goNogo}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--grey-900)' }}>
            {totalScore}<span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 400 }}>/{maxScore}</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, marginLeft: 6 }}>({pct}%)</span>
          </span>
          <button
            onClick={() => setShowReadiness(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
              color: showReadiness ? 'var(--grey-900)' : 'var(--grey-600)',
              background: showReadiness ? 'var(--grey-100)' : 'transparent',
              border: '1px solid var(--border)', borderRadius: 7,
              padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Submission Readiness
            <svg style={{ transform: showReadiness ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>

      {/* Segmented bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        {rubric.map(r => {
          const segColor = r.status === 'covered' ? '#22c55e' : r.status === 'partial' ? '#f59e0b' : '#ef4444';
          return (
            <div
              key={r.id}
              title={`${r.criterion} — ${r.score}/${r.maxScore}`}
              style={{ flex: r.weight, background: segColor, cursor: 'default' }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16 }}>
        {rubric.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: 2, flexShrink: 0,
              background: r.status === 'covered' ? '#22c55e' : r.status === 'partial' ? '#f59e0b' : '#ef4444',
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              {r.criterion.split(' ').slice(0, 2).join(' ')} ({r.score}/{r.maxScore})
            </span>
          </div>
        ))}
      </div>

      {/* Expandable submission readiness details */}
      {showReadiness && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            {[
              { label: '✅ Covered', val: covered, color: '#22c55e' },
              { label: '⚠️ Partial',  val: partial,  color: '#f59e0b' },
              { label: '❌ Missing',  val: missing,  color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {rubric.map(r => {
              const icon = r.status === 'covered' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--grey-100)' }}>
                  <span style={{ fontSize: 13, lineHeight: 1.2, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 1 }}>
                      {r.criterion} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({r.weight}%)</span>
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>{r.evidence}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-700)', flexShrink: 0 }}>{r.score}/{r.maxScore}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section B: Gantt Timeline ─── */
function GanttTimeline({ members }: { members: typeof MOCK_PROJECT['teamMembers'] }) {
  const tasks = MOCK_PROJECT.tasks;
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));

  const parseDate = (d: string) => new Date(d).getTime();
  const minDate = Math.min(...tasks.map(t => parseDate(t.startDate)));
  const maxDate = Math.max(...tasks.map(t => parseDate(t.dueDate)));
  const totalMs = maxDate - minDate;

  const toPercent = (d: string) => ((parseDate(d) - minDate) / totalMs) * 100;
  const widthPct  = (s: string, e: string) => Math.max(((parseDate(e) - parseDate(s)) / totalMs) * 100, 1.5);

  const axisLabels: { label: string; pct: number }[] = [];
  const start = new Date(minDate);
  const end   = new Date(maxDate);
  const cursor = new Date(start);
  cursor.setDate(1);
  while (cursor <= end) {
    const pct = ((cursor.getTime() - minDate) / totalMs) * 100;
    axisLabels.push({ label: cursor.toLocaleDateString('en', { month: 'short', day: 'numeric' }), pct });
    cursor.setDate(cursor.getDate() + 7);
  }

  const hasDepOn = (id: string) => tasks.some(t => t.dependsOn?.includes(id));

  return (
    <div style={card}>
      <SectionTitle>Dynamic Timeline</SectionTitle>

      <div style={{ position: 'relative', height: 18, marginBottom: 4, marginLeft: 140 }}>
        {axisLabels.map(ax => (
          <span key={ax.label} style={{
            position: 'absolute', left: `${ax.pct}%`,
            fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap', transform: 'translateX(-50%)',
          }}>{ax.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {tasks.map(task => {
          const sc = statusConfig[task.status];
          const m  = memberMap[task.assigneeId];
          const hasDep  = (task.dependsOn?.length ?? 0) > 0;
          const isBlocking = hasDepOn(task.id);

          return (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                {m && <Avatar initials={m.initials} size={16} />}
                <span style={{
                  fontSize: 10, color: 'var(--grey-700)', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                }} title={task.title}>{task.title.split(' ').slice(0, 4).join(' ')}</span>
                {hasDep && <span title="Has dependencies" style={{ fontSize: 9 }}>🔗</span>}
                {isBlocking && <span title="Blocks other tasks" style={{ fontSize: 9 }}>⚡</span>}
              </div>

              <div style={{ flex: 1, height: 14, background: 'var(--grey-100)', borderRadius: 4, position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left:  `${toPercent(task.startDate)}%`,
                  width: `${widthPct(task.startDate, task.dueDate)}%`,
                  height: '100%',
                  background: sc.color,
                  borderRadius: 4,
                  opacity: task.status === 'backlog' ? 0.45 : 0.85,
                  transition: 'width 0.3s',
                }} title={`${task.startDate} → ${task.dueDate}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        {Object.entries(statusConfig).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: v.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>🔗</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Has deps</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Blocking</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Section C: Accountability Matrix + Task List (combined card) ─── */
const TAB_LIST: { key: Task['status']; label: string; color: string }[] = [
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'review',      label: 'Review',      color: '#6366f1' },
  { key: 'backlog',     label: 'Backlog',      color: 'var(--grey-400)' },
  { key: 'done',        label: 'Done',         color: '#22c55e' },
];

function AccountabilityAndTasks({ members }: { members: typeof MOCK_PROJECT['teamMembers'] }) {
  const tasks = MOCK_PROJECT.tasks;
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));
  const [activeTab, setActiveTab] = useState<Task['status']>('in_progress');
  const visibleTasks = tasks.filter(t => t.status === activeTab);

  /* ── Pie chart maths ── */
  const total = members.reduce((s, m) => s + m.contributionScore, 0);
  const colors = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
  let cumulative = 0;
  const slices = members.map((m, i) => {
    const pct = m.contributionScore / total;
    const startAngle = cumulative;
    cumulative += pct;
    return { ...m, pct, startAngle, color: colors[i % colors.length] };
  });

  function polarToCartesian(cx: number, cy: number, r: number, anglePct: number) {
    const angle = anglePct * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }
  function slicePath(startPct: number, endPct: number, r = 48, cx = 60, cy = 60) {
    const s = polarToCartesian(cx, cy, r, startPct);
    const e = polarToCartesian(cx, cy, r, endPct);
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y} Z`;
  }

  return (
    <div style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ── Top: Accountability Matrix ── */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle>Accountability Matrix</SectionTitle>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 120 120">
            {slices.map(s => (
              <path key={s.id} d={slicePath(s.startAngle, s.startAngle + s.pct)} fill={s.color} opacity={0.9}>
                <title>{s.name}: {Math.round(s.pct * 100)}%</title>
              </path>
            ))}
            <circle cx="60" cy="60" r="26" fill="var(--white)" />
            <text x="60" y="55" textAnchor="middle" fontSize="9" fill="var(--grey-500)">Score</text>
            <text x="60" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--grey-900)">
              {Math.round((members.reduce((s, m) => s + m.contributionScore, 0) / members.length))}%
            </text>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
            {slices.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <Avatar initials={s.initials} size={20} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-900)' }}>{s.name.split(' ')[0]}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.role}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-900)' }}>{s.contributionScore}%</p>
                  <div style={{ width: 40, height: 3, background: 'var(--grey-150)', borderRadius: 2, marginTop: 2 }}>
                    <div style={{ width: `${s.contributionScore}%`, height: '100%', background: s.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: Tasks with tab navigation ── */}
      <div style={{ padding: '0 18px 16px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          {TAB_LIST.map(tab => {
            const count = tasks.filter(t => t.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '10px 4px 10px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--grey-900)' : 'var(--text-3)' }}>
                  {tab.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, minWidth: 18, textAlign: 'center',
                  padding: '1px 6px', borderRadius: 99,
                  background: isActive ? tab.color : 'var(--grey-100)',
                  color: isActive ? '#fff' : 'var(--text-3)',
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Task rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 72 }}>
          {visibleTasks.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>
              No tasks in this stage
            </p>
          )}
          {visibleTasks.map(task => {
            const m = memberMap[task.assigneeId];
            const sc = statusConfig[task.status];
            const conf = task.aiConfidence ?? 0;
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0',
                  borderBottom: '1px solid var(--grey-100)',
                  cursor: 'default',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                    {task.title}
                  </p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {task.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--grey-100)', borderRadius: 4, padding: '1px 5px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div title={`AI Confidence: ${conf}%`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, width: 52, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>AI {conf}%</span>
                  <div style={{ width: '100%', height: 3, background: 'var(--grey-150)', borderRadius: 2 }}>
                    <div style={{ width: `${conf}%`, height: '100%', background: conf > 80 ? '#ef4444' : conf > 60 ? '#f59e0b' : '#22c55e', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[task.priority], flexShrink: 0 }} />
                {m && <Avatar initials={m.initials} size={20} />}
                <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0, width: 56, textAlign: 'right' }}>{task.dueDate.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Section D: Required Artifacts ─── */
const ARTIFACTS = [
  { name: 'Project Brief',             status: 'found',   file: 'project_brief.pdf' },
  { name: 'Grading Rubric',            status: 'found',   file: 'grading_rubric.docx' },
  { name: 'Meeting Transcripts',       status: 'found',   file: '3 files uploaded' },
  { name: 'Technical Documentation',   status: 'partial', file: 'architecture.md — API docs missing' },
  { name: 'Test Report',               status: 'missing', file: 'Not uploaded' },
  { name: 'Final Presentation Slides', status: 'missing', file: 'Not uploaded' },
];

const artColors = { found: '#22c55e', partial: '#f59e0b', missing: '#ef4444' };
const artIcons  = { found: '✓', partial: '◑', missing: '○' };
const artBg     = { found: '#f0fdf4', partial: '#fffbeb', missing: '#fef2f2' };

function ArtifactsCard() {
  const foundCount   = ARTIFACTS.filter(a => a.status === 'found').length;
  const missingCount = ARTIFACTS.filter(a => a.status === 'missing').length;

  return (
    <div style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>Required Artifacts</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 99, padding: '2px 8px' }}>{foundCount} found</span>
          {missingCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fee2e2', borderRadius: 99, padding: '2px 8px' }}>{missingCount} missing</span>
          )}
        </div>
      </div>

      {/* Artifact rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {ARTIFACTS.map((a, i) => {
          const color = artColors[a.status as keyof typeof artColors];
          const icon  = artIcons[a.status as keyof typeof artIcons];
          const bg    = artBg[a.status as keyof typeof artBg];
          return (
            <div
              key={a.name}
              style={{
                display: 'flex', gap: 12, padding: '12px 18px', alignItems: 'flex-start',
                borderBottom: i < ARTIFACTS.length - 1 ? '1px solid var(--grey-100)' : 'none',
                background: a.status === 'missing' ? '#fef9f9' : 'transparent',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 2 }}>{a.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.file}</p>
              </div>
              {a.status === 'missing' && (
                <button style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                  background: 'var(--grey-900)', color: 'var(--white)', border: 'none', cursor: 'pointer',
                }}>Upload</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ProjectWorkspacePage() {
  const p = MOCK_PROJECT;

  const rubric   = MOCK_RUBRIC;
  const missing  = rubric.filter(r => r.status === 'missing').length;
  const partial  = rubric.filter(r => r.status === 'partial').length;
  const goNogo   = missing === 0 && partial <= 1 ? 'GO' : 'NO-GO';

  return (
    <PageLayout
      topBar={
        <TopBar
          title={p.name}
          subtitle={`Due ${p.deadline} · ${p.teamMembers.length} members · Risk ${p.riskScore}%`}
          notifications={MOCK_RISKS}
          readyForSubmission={goNogo === 'GO'}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ROW 1 — Rubric Tracker (expandable, full width) */}
        <RubricTracker />

        {/* ROW 2 — Dynamic Timeline (full width) */}
        <GanttTimeline members={p.teamMembers} />

        {/* ROW 3 — Accountability + Tasks (left) | Artifacts (right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, alignItems: 'start' }}>
          <AccountabilityAndTasks members={p.teamMembers} />
          <ArtifactsCard />
        </div>

      </div>
    </PageLayout>
  );
}
