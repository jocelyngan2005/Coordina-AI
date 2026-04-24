import type { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
      }}>
        <div className="fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
