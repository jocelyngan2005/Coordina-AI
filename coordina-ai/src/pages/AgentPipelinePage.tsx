import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import TopBar from '../components/layout/TopBar';
import { MOCK_AGENTS } from '../data/mockData';
import type { Agent, AgentStatus, LogEntry } from '../types';

const statusConfig: Record<AgentStatus, { label: string; color: string; pulse: boolean }> = {
  idle:     { label: 'Idle',     color: 'var(--grey-300)',  pulse: false },
  thinking: { label: 'Thinking', color: 'var(--grey-700)',  pulse: true },
  active:   { label: 'Active',   color: 'var(--grey-900)',  pulse: true },
  done:     { label: 'Done',     color: 'var(--grey-400)',  pulse: false },
};

const logTypeColor: Record<LogEntry['type'], string> = {
  info:      'var(--grey-400)',
  reasoning: 'var(--grey-600)',
  output:    'var(--grey-900)',
  error:     '#cc3333',
};

const logTypePrefix: Record<LogEntry['type'], string> = {
  info:      '→',
  reasoning: '⟳',
  output:    '✓',
  error:     '✗',
};

export default function AgentPipelinePage() {
  const [selected, setSelected] = useState<Agent>(MOCK_AGENTS[3]); // Risk agent (thinking) is interesting default

  const card: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  };

  return (
    <PageLayout
      topBar={
        <TopBar
          title="Agent Pipeline"
          subtitle="Live view of the agentic workflow orchestration"
        />
      }
    >
      {/* Orchestration flow diagram */}
      <div style={{ ...card, padding: 24, marginBottom: 16, overflow: 'auto' }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 20 }}>Workflow Orchestration Flow</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, overflowX: 'auto' }}>
          {/* Input → GLM → Orchestrator → Agents */}
          {[
            { label: 'Input Layer', sub: 'Briefs · Rubrics\nTranscripts · Logs', width: 110 },
            null,
            { label: 'GLM Reasoning\nCore', sub: 'Z.AI Stateful\nEngine', width: 120 },
            null,
            { label: 'Orchestrator', sub: 'Workflow Engine\nTask Router', width: 110 },
          ].map((node, i) =>
            node === null ? (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 24, height: 1, background: 'var(--grey-300)' }} />
                <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="0,0 8,4 0,8" fill="var(--grey-300)" /></svg>
              </div>
            ) : (
              <div key={i} style={{
                width: node.width, flexShrink: 0,
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', textAlign: 'center', background: 'var(--grey-50)',
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)', whiteSpace: 'pre-line', lineHeight: 1.3, marginBottom: 4 }}>{node.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{node.sub}</p>
              </div>
            )
          )}

          {/* Fan out to agents */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 16, height: 1, background: 'var(--grey-300)' }} />
            <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="0,0 8,4 0,8" fill="var(--grey-300)" /></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_AGENTS.map(agent => {
              const sc = statusConfig[agent.status];
              const isSelected = selected.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelected(agent)}
                  style={{
                    border: `1px solid ${isSelected ? 'var(--grey-900)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '7px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', background: isSelected ? 'var(--grey-900)' : 'var(--white)',
                    transition: 'all var(--t-fast)', width: 210,
                  }}
                >
                  <div
                    className={sc.pulse ? 'pulsing' : ''}
                    style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isSelected ? 'var(--white)' : sc.color }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1, color: isSelected ? 'var(--white)' : 'var(--grey-900)' }}>{agent.name}</span>
                  <span style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-3)', textTransform: 'capitalize' }}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent detail + log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Selected agent info */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              className={statusConfig[selected.status].pulse ? 'pulsing' : ''}
              style={{ width: 9, height: 9, borderRadius: '50%', background: statusConfig[selected.status].color, flexShrink: 0 }}
            />
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</h2>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
              background: 'var(--grey-100)', color: 'var(--grey-600)', textTransform: 'capitalize',
            }}>{statusConfig[selected.status].label}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Last Action</p>
            <p style={{ fontSize: 13, color: 'var(--grey-800)', fontWeight: 500 }}>{selected.lastAction}</p>
          </div>
        </div>

        {/* Reasoning log */}
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 12 }}>Reasoning Log</p>
          <div style={{
            flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7,
            background: 'var(--grey-50)', borderRadius: 'var(--radius-md)',
            padding: '12px 14px', overflowY: 'auto', maxHeight: 220,
          }}>
            {selected.actionLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{entry.timestamp}</span>
                <span style={{ color: logTypeColor[entry.type], flexShrink: 0 }}>{logTypePrefix[entry.type]}</span>
                <span style={{ color: 'var(--grey-700)' }}>{entry.message}</span>
              </div>
            ))}
            {selected.status === 'thinking' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <span style={{ color: 'var(--text-3)' }}>...</span>
                <span className="pulsing" style={{ color: 'var(--grey-600)' }}>⟳ Reasoning in progress</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
