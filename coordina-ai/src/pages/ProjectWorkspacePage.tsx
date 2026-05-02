import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { useProjects } from '../contexts/ProjectsContext';
import type { Task, RiskAlert, RubricItem, Project, ChecklistItem } from '../types';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { teamsApi } from '../api/teams';
import { workflowApi, analyticsApi } from '../api/workflow';
import { mapProject, mapTasks, mapTeamMembers, extractRubric, extractRisks, mapRubric, mapRisks } from '../api/mappers';
import SubmissionUploadDialog from './SubmissionUploadPage';
import React from 'react';

/* ─── Analysis Results Panel ─── */
function AnalysisPanel({ state }: { state: Record<string, unknown> | null; dataSource: 'glm' | 'mock' }) {
  if (!state) return null;

  const deliverables = Array.isArray(state.deliverables) ? (state.deliverables as Record<string, unknown>[]) : [];
  const goals = Array.isArray(state.structured_goals) ? (state.structured_goals as Record<string, unknown>[]) : [];
  const ambiguities = Array.isArray(state.ambiguities) ? (state.ambiguities as Record<string, unknown>[]) : [];
  const confidence = Number(state.confidence_score ?? 0);
  const priorities = Array.isArray(state.grading_priorities) ? (state.grading_priorities as Record<string, unknown>[]) : [];
  const implicit = Array.isArray(state.implicit_expectations) ? (state.implicit_expectations as string[]) : [];
  const escalation = Boolean(state.escalation_required);
  const escalationReason = String(state.escalation_reason ?? '');

  if (goals.length === 0 && ambiguities.length === 0 && priorities.length === 0 && deliverables.length === 0) {
    return null;
  }

  const card: React.CSSProperties = {
    background: '#fafaf8',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    marginBottom: 14,
  };

  const getPriorityColor = (priority: unknown) => {
    const p = String(priority ?? 'medium').toLowerCase();
    if (p === 'high') return '#ef4444';
    if (p === 'low') return '#22c55e';
    return '#f59e0b'; // medium
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--grey-900)' }}>
          Structured Goals
        </div>
      </div>

      {confidence > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>Confidence</span>
          <div style={{ flex: 1, height: 6, background: 'var(--white)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: '100%', background: confidence > 0.8 ? '#22c55e' : confidence > 0.6 ? '#f59e0b' : '#ef4444', width: `${confidence * 100}%` }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-900)' }}>{Math.round(confidence * 100)}%</span>
        </div>
      )}

      {escalation && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#991b1b', marginBottom: 2 }}>🚨 Escalation Required</p>
          <p style={{ fontSize: 9, color: '#b91c1c' }}>{escalationReason}</p>
        </div>
      )}

      {deliverables.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase' }}>Key Deliverables</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {deliverables.slice(0, 3).map((d, i) => {
              const weight = Number(d.weight_pct ?? 0);
              return (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--white)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <span style={{ fontWeight: 500, color: 'var(--grey-900)', fontSize: 11 }}>
                      {String(d.title ?? d.id ?? `Deliverable ${i + 1}`)}
                    </span>
                    {weight > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--grey-100)', padding: '2px 6px', borderRadius: 3 }}>
                        {weight}%
                      </span>
                    )}
                  </div>
                  {d.description ? (
                    <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.3 }}>
                      {String(d.description) as ReactNode}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {deliverables.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{deliverables.length - 3} more</span>}
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {goals.slice(0, 3).map((goal, i) => {
              const priority = String(goal.priority ?? 'medium').toLowerCase();
              const color = getPriorityColor(priority);
              return (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--white)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: 'var(--grey-900)', fontSize: 11, marginBottom: 2 }}>
                      {String(goal.statement ?? goal.title ?? `Goal ${i + 1}`)}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      {priority} priority
                    </span>
                  </div>
                </div>
              );
            })}
            {goals.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{goals.length - 3} more</span>}
          </div>
        </div>
      )}

      {priorities.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase' }}>Grading Criteria</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {priorities.slice(0, 4).map((p, i) => {
              const weight = Number(p.weight_pct ?? 0);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: 'var(--grey-900)', marginBottom: 1 }}>
                      {String(p.criterion ?? p.name ?? p.priority ?? `Criterion ${i + 1}`)}
                    </p>
                    {p.notes ? (
                      <p style={{ fontSize: 9, color: 'var(--text-3)' }}>
                        {String(p.notes) as ReactNode}
                      </p>
                    ) : null}
                  </div>
                  {weight > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--grey-900)', background: 'var(--grey-100)', padding: '2px 8px', borderRadius: 3, flexShrink: 0 }}>
                      {weight}%
                    </span>
                  )}
                </div>
              );
            })}
            {priorities.length > 4 && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>+{priorities.length - 4} more</span>}
          </div>
        </div>
      )}

      {implicit.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>💡 Implicit Expectations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {implicit.slice(0, 3).map((exp, i) => (
              <p key={i} style={{ fontSize: 10, color: '#15803d' }}>
                • {exp}
              </p>
            ))}
            {implicit.length > 3 && <p style={{ fontSize: 9, color: '#16a34a' }}>+{implicit.length - 3} more</p>}
          </div>
        </div>
      )}

      {ambiguities.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fdf3e3', border: '1px solid #fde68a', borderRadius: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⚠️ Ambiguities & Clarifications</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ambiguities.slice(0, 2).map((amb, i) => (
              <div key={i}>
                <p style={{ fontSize: 10, color: '#b45309', fontWeight: 500, marginBottom: 2 }}>
                  • {String(amb.issue ?? amb.description ?? amb.ambiguity ?? `Issue ${i + 1}`)}
                </p>
                {amb.suggested_clarification ? (
                  <p style={{ fontSize: 9, color: '#92400e', marginLeft: 16, fontStyle: 'italic' }}>
                    💬 {String(amb.suggested_clarification) as ReactNode}
                  </p>
                ) : null}
              </div>
            ))}
            {ambiguities.length > 2 && <p style={{ fontSize: 9, color: '#b45309' }}>+{ambiguities.length - 2} more</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
function Avatar({ initials, size = 24, color }: { initials: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color ?? 'var(--grey-900)', color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--grey-900)', marginBottom: 12 }}>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fafaf8',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
};

const statusConfig: Record<Task['status'], { color: string; label: string }> = {
  done: { color: '#274133', label: 'Done' },
  in_progress: { color: '#ce9042', label: 'In Progress' },
  pending: { color: '#6b7280', label: 'Pending' },
};

const priorityColor: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: 'var(--grey-400)',
};

/* ─── Section A: Rubric Tracker ─── */
function RubricTracker({ submissionReport }: { submissionReport?: Record<string, unknown> | null }) {
  const [showReadiness, setShowReadiness] = useState(false);
  const readinessData = (submissionReport as Record<string, unknown> | null) ?? null;
  const readinessCoverage = Array.isArray(readinessData?.rubric_coverage)
    ? (readinessData?.rubric_coverage as Record<string, unknown>[])
    : [];

  const displayRubric = readinessCoverage.length > 0
    ? readinessCoverage.map((item, index) => ({
        id: String(item.criterion_id ?? item.id ?? `rb${index + 1}`),
        criterion: String(item.criterion_name ?? item.criterion ?? item.name ?? `Criterion ${index + 1}`),
        weight: Number(item.weight_pct ?? item.weight ?? 0) > 1 ? Number(item.weight_pct ?? item.weight ?? 0) : Math.round(Number(item.weight_pct ?? item.weight ?? 0) * 100),
        status: String(item.status ?? 'partial').toLowerCase() === 'complete'
          ? 'covered'
          : (['covered', 'partial', 'missing'].includes(String(item.status ?? 'partial').toLowerCase())
            ? String(item.status ?? 'partial').toLowerCase()
            : 'partial') as RubricItem['status'],
        evidence: String(item.evidence ?? ''),
        feedback: String(item.feedback ?? item.notes ?? ''),
        score: Number(item.score ?? 0),
        maxScore: Number(item.maxScore ?? item.max_score ?? 0) || Math.max(Number(item.score ?? 0), Number(item.weight_pct ?? item.weight ?? 0) > 1 ? Number(item.weight_pct ?? item.weight ?? 0) : Math.round(Number(item.weight_pct ?? item.weight ?? 0) * 100), 10),
      }))
    : [];

  const hasReadinessCoverage = displayRubric.length > 0;
  const totalScore = hasReadinessCoverage ? displayRubric.reduce((s, r) => s + r.score, 0) : 0;
  const maxScore = hasReadinessCoverage ? displayRubric.reduce((s, r) => s + r.maxScore, 0) : 0;
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const partial = hasReadinessCoverage ? displayRubric.filter((r) => r.status === 'partial').length : 0;
  const missing = hasReadinessCoverage ? displayRubric.filter((r) => r.status === 'missing').length : 0;
  const goNogo = hasReadinessCoverage ? (missing === 0 && partial <= 1 ? 'GO' : 'NO-GO') : 'WAITING';

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionTitle>Grade Secured</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            background: goNogo === 'GO' ? '#dcfce7' : goNogo === 'WAITING' ? '#e5e7eb' : '#fee2e2',
            color: goNogo === 'GO' ? '#166534' : goNogo === 'WAITING' ? '#374151' : '#991b1b',
          }}>{goNogo}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--grey-900)' }}>
            {hasReadinessCoverage ? (
              <>
                {totalScore}<span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 400 }}>/{maxScore}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, marginLeft: 6 }}>({pct}%)</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 400 }}>Awaiting submission readiness output</span>
            )}
          </span>
          <button
            onClick={() => setShowReadiness((o) => !o)}
            title="Submission Readiness"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--grey-500)', padding: 4, borderRadius: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-900)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-500)'; }}
          >
            <svg style={{ transform: showReadiness ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>

      {hasReadinessCoverage ? (
        <>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
            {displayRubric.map((r) => {
              const segColor = r.status === 'covered' ? '#274133' : r.status === 'partial' ? '#ce9042' : '#7D2027';
              return (
                <div
                  key={r.id}
                  title={`${r.criterion} — ${r.score}/${r.maxScore}`}
                  style={{ flex: r.weight, background: segColor, cursor: 'default' }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
            {displayRubric.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 2, flexShrink: 0,
                  background: r.status === 'covered' ? '#274133' : r.status === 'partial' ? '#ce9042' : '#7D2027',
                }} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {r.criterion.split(' ').slice(0, 2).join(' ')} ({r.score}/{r.maxScore})
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 8, padding: '10px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, color: 'var(--text-3)', fontSize: 11 }}>
          No rubric coverage returned yet from the submission readiness agent.
        </div>
      )}

      {showReadiness && (
        <div style={{ marginTop: 14 }}>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Submission readiness summary from agent */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>Submission Readiness</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--grey-900)' }}>{String((submissionReport as any)?.readiness_score ?? (submissionReport as any)?.readinessScore ?? '-') } / 100</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: (String((submissionReport as any)?.recommendation ?? '') === 'ready_to_submit') ? '#dcfce7' : '#fff7ed', color: (String((submissionReport as any)?.recommendation ?? '') === 'ready_to_submit') ? '#166534' : '#92400e' }}>
                  {String((submissionReport as any)?.recommendation ?? (submissionReport as any)?.result?.recommendation ?? '') || '—'}
                </span>
              </div>
            </div>

            {displayRubric.map((r, i) => {
              const isCovered = r.status === 'covered';
              const isPartial = r.status === 'partial';
              const circleColor = isCovered ? '#22c55e' : isPartial ? '#f59e0b' : '#d1d5db';
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < displayRubric.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="9" cy="9" r="8" stroke={circleColor} strokeWidth="1.8" fill={isCovered ? circleColor : 'none'} />
                    {isCovered && <polyline points="5,9 8,12 13,6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                    {isPartial && <path d="M9 1a8 8 0 0 1 0 16" stroke={circleColor} strokeWidth="1.8" fill={circleColor} strokeLinecap="round" />}
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 1 }}>
                      {r.criterion} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({r.weight}%)</span>
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>{r.evidence}</p>
                    {r.feedback && <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>Feedback: {r.feedback}</p>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-700)', flexShrink: 0 }}>{r.score}/{r.maxScore}</span>
                </div>
              );
            })}

            {/* Missing artefacts and last-minute risks */}
            <div style={{ padding: 12, borderTop: '1px solid var(--grey-100)' }}>
              {Array.isArray((submissionReport as any)?.missing_artefacts) && (submissionReport as any).missing_artefacts.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Missing Artefacts</div>
                  <ul style={{ margin: '6px 0 0 18px', color: 'var(--text-3)', fontSize: 10 }}>
                    {((submissionReport as any).missing_artefacts as string[]).map((m, idx) => <li key={idx}>{m}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray((submissionReport as any)?.last_minute_risks) && (submissionReport as any).last_minute_risks.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Last-minute Risks</div>
                  <ul style={{ margin: '6px 0 0 18px', color: '#b45309', fontSize: 10 }}>
                    {((submissionReport as any).last_minute_risks as string[]).map((rsk, idx) => <li key={idx}>{rsk}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section B: Gantt Timeline ─── */
function GanttTimeline({ tasks, milestones }: { tasks: Task[]; milestones?: Record<string, unknown>[] }) {
  const [tooltip, setTooltip] = useState<{ task: Task; x: number; y: number } | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);

  const parseDate = (d: string) => new Date(d).getTime();
  const validTasks = tasks.filter((t) => t.startDate && t.dueDate);

  if (validTasks.length === 0) {
    return (
      <div style={card}>
        <SectionTitle>Dynamic Timeline</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No tasks with dates available.</p>
      </div>
    );
  }

  const minDate = Math.min(...validTasks.map((t) => parseDate(t.startDate)));
  const maxDate = Math.max(...validTasks.map((t) => parseDate(t.dueDate)));
  const totalMs = maxDate - minDate || 1;

  const toPercent = (d: string) => ((parseDate(d) - minDate) / totalMs) * 100;
  const widthPct = (s: string, e: string) => Math.max(((parseDate(e) - parseDate(s)) / totalMs) * 100, 1.5);

  const axisLabels: { label: string; pct: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor.getTime() <= maxDate) {
    const pct = ((cursor.getTime() - minDate) / totalMs) * 100;
    axisLabels.push({ label: cursor.toLocaleDateString('en', { month: 'short', day: 'numeric' }), pct });
    cursor.setDate(cursor.getDate() + 7);
  }

  const hasDepOn = (id: string) => validTasks.some((t) => t.dependsOn?.includes(id));

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SectionTitle>Dynamic Timeline</SectionTitle>
      </div>

      <div style={{ position: 'relative', height: 18, marginBottom: 4, marginLeft: 140 }}>
        {axisLabels.map((ax) => (
          <span key={ax.label} style={{
            position: 'absolute', left: `${ax.pct}%`,
            fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap', transform: 'translateX(-50%)',
          }}>{ax.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {validTasks.map((task) => {
          const sc = statusConfig[task.status];
          const hasDep = (task.dependsOn?.length ?? 0) > 0;
          const isBlocking = hasDepOn(task.id);
          return (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: 'var(--grey-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {task.title.split(' ').slice(0, 4).join(' ')}
                </span>
                {hasDep && <span title="Has dependencies" style={{ fontSize: 9 }}>🔗</span>}
                {isBlocking && <span title="Blocks other tasks" style={{ fontSize: 9 }}>⚡</span>}
              </div>
              <div style={{ flex: 1, height: 14, background: 'var(--grey-100)', borderRadius: 4, position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${toPercent(task.startDate)}%`,
                    width: `${widthPct(task.startDate, task.dueDate)}%`,
                    height: '100%',
                    background: sc.color,
                    borderRadius: 4,
                    opacity: 0.85,
                    transition: 'width 0.3s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => setTooltip({ task, x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTooltip(null)}
                />
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

      <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
        {milestones && milestones.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowMilestones((s) => !s)}
              title="Show milestones"
              style={{ background: 'transparent', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
            >
              {showMilestones ? 'Hide Milestones' : `Milestones (${milestones.length})`}
            </button>
          </div>
      )}
      </div>

      {showMilestones && milestones && milestones.length > 0 && (() => {
        const parseMilestones = () => {
          return (milestones ?? [])
            .map((m, i) => ({
              id: String(m.id ?? m.milestone_id ?? `ms${i}`),
              title: String(m.title ?? m.name ?? m.milestone ?? `Milestone ${i + 1}`),
              dueDate: String(m.due_date ?? m.deadline ?? m.date ?? ''),
              status: String(m.status ?? 'pending') as 'pending' | 'in_progress' | 'completed',
              description: String(m.description ?? ''),
            }))
            .filter((m) => m.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        };

        const parsed = parseMilestones();
        if (parsed.length === 0) return null;

        const statusCfg: Record<string, { color: string; label: string }> = {
          pending: { color: '#9ca3af', label: 'Pending' },
          in_progress: { color: '#ce9042', label: 'In Progress' },
          completed: { color: '#274133', label: 'Completed' },
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsed.map((milestone) => {
                const dueDate = new Date(milestone.dueDate);
                const isOverdue = dueDate < today && milestone.status !== 'completed';
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const sc = statusCfg[milestone.status];

                return (
                  <div
                    key={milestone.id}
                    style={{ padding: '8px 12px', background: 'var(--white)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}
                  >
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: sc.color, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', marginBottom: 2 }}>{milestone.title}</p>
                      {milestone.description && (
                        <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, lineHeight: 1.3 }}>{milestone.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}> {milestone.dueDate}</span>
                        {isOverdue && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>🔴 OVERDUE</span>}
                        {daysUntil > 0 && daysUntil <= 7 && !isOverdue && (
                          <span style={{ fontSize: 10, color: '#ce9042', fontWeight: 600 }}> {daysUntil}d left</span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 4,
                        background: isOverdue ? '#fee2e2' : milestone.status === 'completed' ? '#dcfce7' : '#fef3c7',
                        color: isOverdue ? '#991b1b' : milestone.status === 'completed' ? '#166534' : '#92400e',
                        flexShrink: 0,
                      }}
                    >
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 4, top: tooltip.y + 4,
          zIndex: 9999, pointerEvents: 'none',
          background: 'var(--white)', color: 'var(--grey-900)',
          borderRadius: 8, padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          border: '1px solid var(--border)', maxWidth: 260,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{tooltip.task.title}</p>
          <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{tooltip.task.startDate} → {tooltip.task.dueDate}</p>
          <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{statusConfig[tooltip.task.status].label} · {tooltip.task.priority} priority</p>
        </div>
      )}
    </div>
  );
}

/* ─── Section C: Accountability + Task List ─── */
const TAB_LIST: { key: Task['status']; label: string; color: string }[] = [
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'pending', label: 'Pending', color: '#6b7280' },
  { key: 'done', label: 'Done', color: '#22c55e' },
];

function AccountabilityAndTasks({ project }: { project: Project }) {
  const { tasks, teamMembers: members } = project;
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const [activeTab, setActiveTab] = useState<Task['status']>('in_progress');
  const visibleTasks = tasks.filter((t) => t.status === activeTab);

  const memberProgress = members.map((member) => {
    const assignedTasks = tasks.filter((task) => task.assigneeId === member.id);
    const completedTasks = assignedTasks.filter((task) => task.status === 'done').length;
    const completionPct = assignedTasks.length > 0
      ? Math.round((completedTasks / assignedTasks.length) * 100)
      : member.contributionScore;

    return {
      ...member,
      assignedTasks: assignedTasks.length,
      completedTasks,
      completionPct,
    };
  });

  const total = memberProgress.reduce((s, m) => s + m.completionPct, 0) || 1;
  const colors = ['#542916', '#b79858', '#a13a1e', '#88b8ce', '#f1c166'];
  let cumulative = 0;
  const slices = memberProgress.map((m, i) => {
    const pct = m.completionPct / total;
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
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <SectionTitle>Accountability Matrix</SectionTitle>
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
                {members.length > 0 ? Math.round(members.reduce((s, m) => s + m.contributionScore, 0) / members.length) : 0}%
              </text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {slices.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar initials={s.initials} size={24} color={s.color} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-900)', flex: 1 }}>
                    {s.name.split(' ')[0]} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· {s.role}</span>
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

      <div style={{ padding: '12px 18px 16px' }}>
        {(() => {
          const currentIndex = TAB_LIST.findIndex((t) => t.key === activeTab);
          const currentTab = TAB_LIST[currentIndex];
          const count = tasks.filter((t) => t.status === activeTab).length;
          const prev = () => setActiveTab(TAB_LIST[(currentIndex - 1 + TAB_LIST.length) % TAB_LIST.length].key);
          const next = () => setActiveTab(TAB_LIST[(currentIndex + 1) % TAB_LIST.length].key);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, color: 'var(--grey-500)', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-900)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-500)')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>{currentTab.label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#7D2027', color: '#fff' }}>{count}</span>
              <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, color: 'var(--grey-500)', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-900)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-500)')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          );
        })()}

        <div style={{ background: 'var(--white)', borderRadius: 8, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 72, border: '1px solid var(--border)' }}>
          {visibleTasks.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>No tasks in this stage</p>
          )}
          {visibleTasks.map((task) => {
            const m = task.assigneeId ? memberMap[task.assigneeId] : undefined;
            const conf = task.aiConfidence ?? 0;
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--grey-100)', cursor: 'default' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{task.title}</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {task.tags.slice(0, 2).map((tag) => (
                      <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--grey-100)', borderRadius: 4, padding: '1px 5px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div title={`AI Confidence: ${conf}%`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, width: 52, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>AI {conf}%</span>
                  <div style={{ width: '100%', height: 3, background: 'var(--grey-150)', borderRadius: 2 }}>
                    <div style={{ width: `${conf}%`, height: '100%', background: conf > 80 ? '#7D2027' : conf > 60 ? '#ce9042' : '#274133', borderRadius: 2 }} />
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

/* ─── Section D: Submission Checklist ─── */
function ArtifactsCard({ checklist, onUploadClick }: { checklist: ChecklistItem[]; onUploadClick?: (itemName: string) => void }) {
  const items = checklist;
  const completeCount = items.filter((c) => c.status === 'complete').length;
  const [uploadedItems, setUploadedItems] = React.useState<Set<string>>(new Set());

  const handleUploadClick = (itemName: string) => {
    setUploadedItems(prev => new Set(prev).add(itemName));
    onUploadClick?.(itemName);
  };

  return (
    <div style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>Submission Checklist</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>{completeCount}/{items.length} complete</span>
        </div>
      </div>
      <div style={{ background: 'var(--white)', margin: '0 12px 12px', borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid var(--border)' }}>
        {items.map((c, i) => {
          const isComplete = c.status === 'complete';
          const isInProgress = c.status === 'in_progress';
          const color = isComplete ? '#274133' : isInProgress ? '#ce9042' : '#9ca3af';
          const isUploaded = uploadedItems.has(c.item);

          return (
            <div key={c.item} style={{ display: 'flex', gap: 12, padding: '10px 14px', alignItems: 'center', borderBottom: i < items.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.8" fill={isComplete ? color : 'none'} />
                {isComplete && <polyline points="5,9 8,12 13,6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                {isInProgress && <path d="M9 1a8 8 0 0 1 0 16" stroke={color} strokeWidth="1.8" fill={color} strokeLinecap="round" />}
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: isComplete ? 'var(--grey-900)' : 'var(--grey-700)', marginBottom: 1 }}>{c.item}</p>
                {c.priority && (
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.priority} priority</p>
                )}
              </div>
              {onUploadClick && (
                <button
                  onClick={() => handleUploadClick(c.item)}
                  title={isUploaded ? 'Reupload submission' : 'Upload submission'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isUploaded ? 'var(--white)' : 'var(--grey-900)',
                    border: isUploaded ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    color: isUploaded ? 'var(--grey-900)' : 'var(--white)',
                    padding: '6px 10px',
                    borderRadius: 5,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    if (isUploaded) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                    } else {
                      (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isUploaded) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)';
                    } else {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-900)';
                    }
                  }}
                >
                  {/* Google Material Icon: attach_file_add */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="13" x2="12" y2="19" />
                    <line x1="9" y1="16" x2="15" y2="16" />
                  </svg>
                  {isUploaded ? 'Reupload' : 'Upload'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Section E: Team Tasks ─── */
type TaskState = 'none' | 'in_progress' | 'done';

function MyTasksCard({ 
  tasks, 
  members,
  onTaskStatusChange,
}: { 
  tasks: Task[]; 
  members: import('../types').TeamMember[];
  onTaskStatusChange?: (taskId: string, newStatus: Task['status']) => Promise<void>;
}) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const [updating, setUpdating] = useState<string | null>(null);

  const [states, setStates] = useState<Map<string, TaskState>>(() => {
    const m = new Map<string, TaskState>();
    tasks.forEach((t) => { m.set(t.id, t.status === 'done' ? 'done' : 'none'); });
    return m;
  });

  useEffect(() => {
    setStates((prev) => {
      const next = new Map<string, TaskState>();
      tasks.forEach((task) => {
        next.set(task.id, task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'in_progress' : 'none');
      });
      return next.size > 0 ? next : prev;
    });
  }, [tasks]);

  const cycle = async (id: string) => {
    setStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? 'none';
      next.set(id, cur === 'none' ? 'in_progress' : cur === 'in_progress' ? 'done' : 'none');
      return next;
    });

    // Update backend if callback provided
    if (onTaskStatusChange) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        const newStatus: Task['status'] = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'done';
        setUpdating(id);
        try {
          await onTaskStatusChange(id, newStatus);
        } catch (err) {
          console.error('Failed to update task:', err);
          // Revert on error
          setStates((prev) => {
            const next = new Map(prev);
            next.set(id, task.status === 'done' ? 'done' : 'none');
            return next;
          });
        } finally {
          setUpdating(null);
        }
      }
    }
  };

  const doneCount = [...states.values()].filter((s) => s === 'done').length;
  const total = tasks.length;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <SectionTitle>Team Tasks</SectionTitle>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12 }}>{doneCount}/{total} complete</span>
      </div>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {tasks.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>No tasks assigned yet.</p>
        )}
        {tasks.map((task, i) => {
          const state = states.get(task.id) ?? 'none';
          const isDone = state === 'done';
          const isProgress = state === 'in_progress';
          const pColor = priorityColor[task.priority];
          const assignedMember = task.assigneeId ? memberMap[task.assigneeId] : undefined;
          const isUpdating = updating === task.id;
          return (
            <div
              key={task.id}
              onClick={() => cycle(task.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i < tasks.length - 1 ? '1px solid var(--grey-100)' : 'none',
                cursor: isUpdating ? 'wait' : 'pointer', 
                transition: 'background 0.12s', 
                background: 'transparent',
                opacity: isUpdating ? 0.6 : 1,
              }}
              onMouseEnter={(e) => !isUpdating && ((e.currentTarget as HTMLDivElement).style.background = 'var(--grey-50)')}
              onMouseLeave={(e) => !isUpdating && ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, transition: 'all 0.15s', opacity: isUpdating ? 0.5 : 1 }}>
                <circle cx="9" cy="9" r="8"
                  stroke={isDone ? '#274133' : isProgress ? '#ce9042' : 'var(--grey-300)'}
                  strokeWidth="1.8" fill={isDone ? '#274133' : 'none'}
                />
                {isProgress && <path d="M9 1a8 8 0 0 1 0 16" stroke="#ce9042" strokeWidth="1.8" fill="#ce9042" strokeLinecap="round" />}
                {isDone && <polyline points="5,9 8,12 13,6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: isDone ? 'var(--text-3)' : 'var(--grey-900)', textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.15s' }}>{task.title}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {task.tags.slice(0, 2).map((tag) => (
                    <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--grey-100)', borderRadius: 4, padding: '1px 5px' }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {assignedMember && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Avatar initials={assignedMember.initials} size={18} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{assignedMember.name.split(' ')[0]}</span>
                  </div>
                )}
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{task.dueDate.slice(5)}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: pColor }} title={task.priority} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Notification Bell ─── */
const severityColor: Record<string, string> = { high: '#7d2027', medium: '#ce9042', low: '#274133' };
const severityBg: Record<string, string> = { high: '#f9e8e9', medium: '#fdf3e3', low: '#e6efeb' };
const typeIcon: Record<string, string> = {
  inactivity: '👤',
  deadline_risk: '⏰',
  dependency_blocker: '🔗',
  ambiguity: '❓',
  missing_artifact: '📄',
};
type AlertAction = { label: string; variant: 'primary' | 'ghost' };
const actionsByRecommendedType: Record<string, AlertAction[]> = {
  member_engagement: [{ label: 'Send Reminder', variant: 'primary' }, { label: 'Reassign Task', variant: 'ghost' }],
  deadline_risk: [{ label: 'Adjust Timeline', variant: 'primary' }, { label: 'Escalate', variant: 'ghost' }],
  scope_issue: [{ label: 'Request Clarification', variant: 'primary' }, { label: 'Flag for Review', variant: 'ghost' }],
  dependency_blocker: [{ label: 'Resolve Dependency', variant: 'primary' }, { label: 'Replan Tasks', variant: 'ghost' }],
  ambiguity: [{ label: 'Request Clarification', variant: 'primary' }, { label: 'Flag for Review', variant: 'ghost' }],
};

function NotificationBell({ notifications }: { notifications: RiskAlert[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleAction(label: string) {
    setToast(`"${label}" triggered`);
    setTimeout(() => setToast(null), 2500);
  }

  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', transition: 'opacity .15s', background: 'none' };
  const btnPrimary: React.CSSProperties = { ...btnBase, background: 'var(--grey-900)', color: 'var(--white)', borderColor: 'var(--grey-900)' };
  const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: 'var(--grey-700)', borderColor: 'var(--border)' };
  const hasAlerts = notifications.length > 0;

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: 'var(--grey-900)', color: 'var(--white)', padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,.18)', pointerEvents: 'none' }}>{toast}</div>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'var(--grey-100)' : 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
          title="Risk alerts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--grey-700)" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {hasAlerts && (
            <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 99, background: 'var(--grey-900)', color: 'var(--white)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--white)' }}>{notifications.length}</span>
          )}
        </button>
        {open && (
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 460, overflowY: 'auto', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>Intervention &amp; Risk</span>
              {hasAlerts && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--grey-150)', color: 'var(--grey-800)' }}>{notifications.length} active</span>}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: 13, color: 'var(--text-3)' }}>No active alerts</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map((risk, i) => (
                  <div key={risk.id} style={{ padding: '12px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--grey-100)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{typeIcon[risk.type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>{risk.message}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, flexShrink: 0, background: severityBg[risk.severity], color: severityColor[risk.severity] }}>{risk.severity}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--grey-600)', lineHeight: 1.4, marginBottom: 7 }}>{risk.detail}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                          {(actionsByRecommendedType[risk.recommended_action_type ?? ''] ?? actionsByRecommendedType.scope_issue).map((btn) => (
                            <button
                              key={btn.label}
                              style={{ ...(btn.variant === 'primary' ? btnPrimary : btnGhost), justifyContent: 'center', width: '100%' }}
                              onClick={() => handleAction(btn.label)}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.75')}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                            >{btn.label}</button>
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{risk.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* MilestonesTimeline moved into GanttTimeline (dropdown) */

/* ─── Loading skeleton ─── */
function WorkspaceSkeleton() {
  const shimmer: React.CSSProperties = { background: 'var(--grey-150)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' };
  return (
    <PageLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 36, width: '50%', ...shimmer }} />
        <div style={{ height: 14, width: '30%', ...shimmer }} />
        <div style={{ height: 120, ...shimmer }} />
        <div style={{ height: 200, ...shimmer }} />
      </div>
    </PageLayout>
  );
}

/* ─── Main Page ─── */
export default function ProjectWorkspacePage() {
  const { id: urlId } = useParams<{ id: string }>();
  const projectId = urlId ?? 'proj-001';
  const isMockId = projectId === 'proj-001';
  const navigate = useNavigate();
  const { refreshProjects } = useProjects();

  const [project, setProject] = useState<Project | null>(null);
  const [rubric, setRubric] = useState<RubricItem[]>([]);
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [submissionChecklist, setSubmissionChecklist] = useState<ChecklistItem[]>([]);
  const [submissionReport, setSubmissionReport] = useState<Record<string, unknown> | null>(null);
  const [milestones, setMilestones] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(!isMockId);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [workflowState, setWorkflowState] = useState<Record<string, unknown> | null>(null);
  const [dataSource, setDataSource] = useState<'glm' | 'mock'>('mock');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadDialogItem, setUploadDialogItem] = useState<string | null>(null);

  // Handle task status changes and update backend + local state
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    if (!project) return;

    // Update backend
    await tasksApi.update(taskId, { status: newStatus });

    // Update local state to reflect change
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      };
    });
  };

  const handleMarkComplete = async () => {
    if (!project || isMockId) return;
    try {
      await projectsApi.update(projectId, { status: 'completed' });
      navigate('/');
    } catch (err) {
      console.error('Failed to mark project as complete:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || isMockId) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectId);
      setShowDeleteModal(false);
      await refreshProjects();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isMockId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      try {
        const [backendProject, backendTasks, backendMembers, workflowState, analytics] =
          await Promise.all([
            projectsApi.get(projectId),
            tasksApi.listByProject(projectId),
            teamsApi.listByProject(projectId),
            workflowApi.getState(projectId).catch(() => null),
            analyticsApi.projectOverview(projectId).catch(() => null),
          ]);

        if (cancelled) return;

        const completionPct = analytics?.completion_pct ?? 0;
        const riskScore =
          analytics?.health_score != null
            ? Math.round(analytics.health_score)
            : 0;

        if (workflowState) {
          // Store workflow state as-is (already typed as WorkflowState)
          setWorkflowState(workflowState as unknown as Record<string, unknown>);
          setDataSource('glm');
          
          // Use GLM planning tasks if available, fall back to DB tasks
          const glmTasks = Array.isArray(workflowState.tasks) && workflowState.tasks.length > 0
            ? mapTasks(workflowState.tasks as Record<string, unknown>[])
            : backendTasks.map((t) => ({
                id: t.id, title: t.title, status: t.status,
                assigneeId: t.assignee_id ?? undefined,
                assignedTo: t.assignee_id ? [t.assignee_id] : [],
                startDate: t.created_at?.slice(0, 10) ?? '',
                dueDate: t.due_date?.slice(0, 10) ?? '',
                priority: t.priority, tags: [], description: t.description ?? '',
              } as import('../types').Task));

          const backendTaskByKey = new Map(
            backendTasks.map((task) => [task.task_id ?? task.id, task]),
          );
          const syncedTasks = glmTasks.map((task) => {
            const backendTask = backendTaskByKey.get(task.id);
            if (!backendTask) return task;
            return {
              ...task,
              id: backendTask.id,  // ← Use backend UUID as frontend task ID for updates
              status: backendTask.status,
              assigneeId: backendTask.assignee_id ?? task.assigneeId,
              assignedTo: backendTask.assignee_id ? [backendTask.assignee_id] : task.assignedTo,
              dueDate: backendTask.due_date?.slice(0, 10) ?? task.dueDate,
            };
          });

          // Use GLM coordination members if available, fall back to DB members
          const roleAssignments = (workflowState.role_assignments ?? []) as Record<string, unknown>[];
          const contributionBalance = (workflowState.contribution_balance ?? []) as Record<string, unknown>[];
          const glmMembers = roleAssignments.length > 0
            ? mapTeamMembers(roleAssignments, contributionBalance)
            : backendMembers.map((m) => ({
                id: m.id, name: m.name, role: m.skills[0] ?? 'Member',
                initials: m.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
                contributionScore: Math.round(m.contribution_score),
                lastActive: 'Recently', taskCount: 0,
              }));

          const mapped = mapProject(backendProject, backendTasks, backendMembers, completionPct, riskScore);
          setProject({ ...mapped, tasks: syncedTasks, teamMembers: glmMembers });

          // Submission readiness: prefer workflow state, but fall back to live validation
          const existingSubmission = workflowState.submission_report as Record<string, unknown>;
          let submissionResult: Record<string, unknown> = existingSubmission;
          const hasCoverage = Array.isArray(existingSubmission?.rubric_coverage) && existingSubmission.rubric_coverage.length > 0;

          if (!hasCoverage) {
            try {
              const submissionResponse = await workflowApi.runSubmissionCheck(projectId, []);
              submissionResult = (submissionResponse as { result?: Record<string, unknown> })?.result ?? (submissionResponse as Record<string, unknown>);
            } catch {
              submissionResult = existingSubmission;
            }
          }

          const mappedRubric = mapRubric(submissionResult);
          if (mappedRubric.length > 0) setRubric(mappedRubric);
          else {
            const fallback = extractRubric(submissionResult);
            if (fallback) setRubric(fallback);
          }

          // keep raw submission report for UI panels
          setSubmissionReport(submissionResult);

          const rawChecklist = submissionResult?.submission_checklist;
          if (Array.isArray(rawChecklist) && rawChecklist.length > 0) {
            setSubmissionChecklist(rawChecklist as ChecklistItem[]);
          }

          // Risk detection
          const riskResult = workflowState.last_risk_report as Record<string, unknown>;
          const executedAt = String((workflowState.last_risk_report as Record<string, unknown>)?.executed_at ?? '');
          const mappedRisks = mapRisks(riskResult, executedAt);
          if (mappedRisks.length > 0) setRisks(mappedRisks);
          else {
            const fallback = extractRisks(riskResult);
            if (fallback) setRisks(fallback);
          }

          // Milestones extraction
          const rawMilestones = Array.isArray(workflowState.milestones)
            ? (workflowState.milestones as Record<string, unknown>[])
            : [];
          if (rawMilestones.length > 0) {
            setMilestones(rawMilestones);
          }
        } else {
          setDataSource('mock');
          const mapped = mapProject(backendProject, backendTasks, backendMembers, completionPct, riskScore);
          setProject(mapped);
        }

        setApiAvailable(true);
      } catch {
        if (!cancelled) {
          setApiAvailable(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  }, [projectId, isMockId]);

  if (loading) return <WorkspaceSkeleton />;
  if (!project) return <PageLayout><p style={{ fontSize: 14, color: 'var(--text-3)' }}>Project not found or failed to load.</p></PageLayout>;

  const p = project;
  const missing = rubric.filter((r) => r.status === 'missing').length;
  const partial = rubric.filter((r) => r.status === 'partial').length;
  const goNogo = missing === 0 && partial <= 1 ? 'GO' : 'NO-GO';
  const allTasksCompleted = p.tasks.length > 0 && p.tasks.every((t) => t.status === 'done');

  return (
    <>
      <PageLayout>
        {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 28, fontWeight: 400, color: 'var(--grey-900)', lineHeight: 1.2 }}>{p.name}</h1>
            {!apiAvailable && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '3px 8px', background: 'var(--grey-100)', borderRadius: 6 }}>
                Demo mode
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {p.deadline ? `Due ${p.deadline} · ` : ''}{p.teamMembers.length} members · Risk {p.riskScore}%
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {goNogo === 'GO' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#dcfce7', border: '1px solid #86efac' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Ready for submission</span>
            </div>
          )}
          {!isMockId && (
            <>
              {allTasksCompleted && (
                <button
                  onClick={handleMarkComplete}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: '#f5f5f5', color: 'var(--grey-900)', border: '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#ebebeb')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5')}
                >
                  ✓ Mark Complete
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-100)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                title="Delete project"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </>
          )}
          <NotificationBell notifications={risks} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnalysisPanel state={workflowState} dataSource={dataSource} />
        <RubricTracker submissionReport={submissionReport} />
        <GanttTimeline tasks={p.tasks} milestones={milestones} />
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr', gap: 14, alignItems: 'start' }}>
          <AccountabilityAndTasks project={p} />
          <MyTasksCard tasks={p.tasks} members={p.teamMembers} onTaskStatusChange={handleTaskStatusChange} />
          <ArtifactsCard checklist={submissionChecklist} onUploadClick={(itemName) => setUploadDialogItem(itemName)} />
        </div>
      </div>
    </PageLayout>

    {/* Upload Dialog Modal */}
    {uploadDialogItem && (
      <>
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
        }} onClick={() => setUploadDialogItem(null)} />
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: 24,
          zIndex: 1000,
        }}>
          <SubmissionUploadDialog
            itemName={uploadDialogItem}
            projectId={projectId}
            onClose={() => setUploadDialogItem(null)}
          />
        </div>
      </>
    )}

    {/* Delete Confirmation Modal */}
    {showDeleteModal && (
      <>
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
        }} onClick={() => !isDeleting && setShowDeleteModal(false)} />
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: 24,
          zIndex: 1000,
        }}>
          <div role="dialog" aria-modal="true" aria-label="Delete project" style={{
            background: 'var(--white)',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid var(--border)',
            maxWidth: 420,
            width: '100%',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--grey-900)' }}>Delete Project</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  style={{
                    background: 'transparent', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
                    color: 'var(--grey-400)', fontSize: 20, padding: 0, opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                This action cannot be undone. The project "{p.name}" and all associated data will be permanently deleted from the system.
              </p>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'var(--grey-100)', color: 'var(--grey-900)', border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => !isDeleting && ((e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb')}
                onMouseLeave={(e) => !isDeleting && ((e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6')}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: '#dc2626', color: 'var(--white)', border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => !isDeleting && ((e.currentTarget as HTMLButtonElement).style.background = '#b91c1c')}
                onMouseLeave={(e) => !isDeleting && ((e.currentTarget as HTMLButtonElement).style.background = '#dc2626')}
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}
