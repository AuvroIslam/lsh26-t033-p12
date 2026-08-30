/** Small shared presentational pieces. No business logic lives here. */
import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(12,31,25,0.04)] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45';
  const sizes = { sm: 'px-3 py-1.5 text-[13px]', md: 'px-4 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500',
    outline: 'border border-[var(--border)] bg-white text-ink-900 hover:bg-brand-50',
    ghost: 'text-ink-800 hover:bg-brand-50',
    danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  flag,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  flag?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-800">{label}</span>
        {flag}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{hint}</p>}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'brand';
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    good: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    bad: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand-50 text-brand-600',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A labelled figure, used across the dashboard and the forecast. */
export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'brand';
}) {
  const tones = {
    neutral: 'text-ink-900',
    good: 'text-emerald-700',
    bad: 'text-rose-700',
    brand: 'text-brand-600',
  };
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
      <p className="text-[12px] font-medium tracking-wide text-[var(--muted)] uppercase">{label}</p>
      <p className={`tabular mt-1.5 text-[22px] leading-tight font-bold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

/** Horizontal proportion bar used for the category breakdown. */
export function Meter({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'bad' }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label={`${clamped.toFixed(1)} percent`}
    >
      <div
        className={`h-full rounded-full ${tone === 'brand' ? 'bg-brand-400' : 'bg-rose-400'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
