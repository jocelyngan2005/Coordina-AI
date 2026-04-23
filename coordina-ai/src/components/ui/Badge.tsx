interface BadgeProps {
  label: string;
  variant?: 'default' | 'muted' | 'black' | 'outline';
}

const variants: Record<string, React.CSSProperties> = {
  default: { background: 'var(--grey-100)', color: 'var(--grey-700)' },
  muted:   { background: 'var(--grey-50)',  color: 'var(--grey-500)', border: '1px solid var(--border)' },
  black:   { background: 'var(--grey-900)', color: 'var(--white)' },
  outline: { background: 'transparent', color: 'var(--grey-700)', border: '1px solid var(--border-mid)' },
};

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: '0.01em',
      ...variants[variant],
    }}>
      {label}
    </span>
  );
}
