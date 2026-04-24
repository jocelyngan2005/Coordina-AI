import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { RiskAlert } from '../../types';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  notifications?: RiskAlert[];
  readyForSubmission?: boolean;
}

const severityColor: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const typeIcon: Record<string, string> = {
  inactivity: '👤', deadline: '⏰', ambiguity: '❓', missing_artifact: '📄',
};

export default function TopBar({ title, subtitle, actions, notifications = [], readyForSubmission = false }: TopBarProps) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasAlerts = notifications.length > 0;

  return (
    <div style={{
      height: 'var(--topbar-h)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--white)',
      flexShrink: 0,
    }}>
      {/* Left — title + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{subtitle}</span>
        )}
      </div>

      {/* Right — ready badge + bell + extra actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Submission readiness badge */}
        {readyForSubmission && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: '#dcfce7', border: '1px solid #86efac',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Ready for submission</span>
          </div>
        )}

        {/* Notification bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setBellOpen(o => !o)}
            style={{
              position: 'relative',
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: bellOpen ? 'var(--grey-100)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            title="Risk alerts"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--grey-700)" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasAlerts && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
                border: '2px solid var(--white)',
              }}>{notifications.length}</span>
            )}
          </button>

          {/* Dropdown panel */}
          {bellOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 340, maxHeight: 420, overflowY: 'auto',
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 1000,
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-900)' }}>
                  Intervention &amp; Risk
                </span>
                {hasAlerts && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: '#fef2f2', color: '#b91c1c',
                  }}>{notifications.length} active</span>
                )}
              </div>

              {/* Alerts */}
              {notifications.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>✅ No active alerts</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {notifications.map((risk, i) => (
                    <div key={risk.id} style={{
                      padding: '12px 16px',
                      borderBottom: i < notifications.length - 1 ? '1px solid var(--grey-100)' : 'none',
                    }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{typeIcon[risk.type]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey-900)' }}>{risk.message}</p>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                              background: risk.severity === 'high' ? '#fef2f2' : risk.severity === 'medium' ? '#fffbeb' : '#f0fdf4',
                              color: severityColor[risk.severity],
                            }}>{risk.severity}</span>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--grey-600)', lineHeight: 1.4, marginBottom: 3 }}>{risk.detail}</p>
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

        {/* Extra page-level actions */}
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
