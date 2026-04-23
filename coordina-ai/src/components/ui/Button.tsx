import type { ReactNode, CSSProperties, MouseEventHandler } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}

const variants: Record<string, CSSProperties> = {
  primary:   { background: 'var(--grey-900)', color: 'var(--white)', border: '1px solid var(--grey-900)' },
  secondary: { background: 'var(--white)', color: 'var(--grey-900)', border: '1px solid var(--border-mid)' },
  ghost:     { background: 'transparent', color: 'var(--grey-600)', border: '1px solid transparent' },
};

const sizes: Record<string, CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)' },
  md: { padding: '8px 16px', fontSize: 13, borderRadius: 'var(--radius-md)' },
};

export default function Button({
  children, onClick, variant = 'secondary', size = 'md', disabled = false, type = 'button', style,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all var(--t-fast)',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget;
          if (variant === 'primary') el.style.opacity = '0.85';
          if (variant === 'secondary') el.style.background = 'var(--grey-50)';
          if (variant === 'ghost') { el.style.background = 'var(--grey-100)'; el.style.color = 'var(--grey-900)'; }
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.opacity = '';
        el.style.background = '';
        if (variant === 'ghost') el.style.color = 'var(--grey-600)';
        if (variant === 'secondary') el.style.background = 'var(--white)';
      }}
    >
      {children}
    </button>
  );
}
