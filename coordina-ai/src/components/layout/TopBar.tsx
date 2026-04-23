import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--grey-900)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--grey-500)' }}>{subtitle}</span>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
