import type { ReactNode } from 'react';

interface PageLayoutProps {
  topBar: ReactNode;
  children: ReactNode;
}

export default function PageLayout({ topBar, children }: PageLayoutProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {topBar}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-subtle)',
        padding: 24,
      }}>
        <div className="fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
