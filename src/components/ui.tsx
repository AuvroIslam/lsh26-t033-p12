/** Small shared presentational pieces. No business logic lives here. */
import type { ReactNode } from 'react';

/**
 * The pastel accents, in the order they are handed out.
 *
 * Cards and stats rotate through these by position rather than resolving to a
 * single brand colour — that rotation is what makes the surface read as
 * friendly rather than corporate.
 */
export const PASTELS = ['mint', 'peach', 'lilac', 'butter', 'blush', 'sky'] as const;
export type Pastel = (typeof PASTELS)[number];

export const pastelFill: Record<Pastel, string> = {
  mint: 'bg-mint',
  peach: 'bg-peach',
  lilac: 'bg-lilac',
  butter: 'bg-butter',
  blush: 'bg-blush',
  sky: 'bg-sky',
};

export const pastelInk: Record<Pastel, string> = {
  mint: 'text-mint-ink',
  peach: 'text-peach-ink',
  lilac: 'text-lilac-ink',
  butter: 'text-butter-ink',
  blush: 'text-blush-ink',
  sky: 'text-sky-ink',
};

/** Pick a pastel by index, wrapping — used to colour lists consistently. */
export const pastelAt = (i: number): Pastel => PASTELS[i % PASTELS.length];

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  accent,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Tints the header strip, so a page of cards is not a page of white boxes. */
  accent?: Pastel;
}) {
  return (
    <section className={`nb overflow-hidden rounded-2xl bg-[var(--card)] ${className}`}>
      {(title || action) && (
        <header
          className={`flex items-start justify-between gap-4 border-b-2 border-[var(--edge)] px-5 py-3.5 ${
            accent ? pastelFill[accent] : 'bg-[var(--card-sunk)]'
          }`}
        >
          <div>
            {title && (
              <h2 className="text-[15px] font-extrabold tracking-tight text-[var(--text)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] font-medium text-[var(--text)]/70">{subtitle}</p>
            )}
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
    'nb-sm nb-press inline-flex items-center justify-center gap-2 rounded-full font-bold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:transform-none';
  const sizes = { sm: 'px-3.5 py-1.5 text-[13px]', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-butter hover:bg-[#ffdb7d]',
    outline: 'bg-[var(--card)] hover:bg-lav-50',
    ghost: 'border-transparent bg-transparent shadow-none hover:bg-white/60',
    danger: 'bg-blush hover:bg-[#ffb3c8]',
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
        <span className="text-[12.5px] font-bold text-[var(--text)]">{label}</span>
        {flag}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{hint}</p>}
    </label>
  );
}

const inputCls =
  'nb-sm w-full rounded-xl bg-[var(--card)] px-3 py-2.5 text-sm font-medium text-[var(--text)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--muted-dim)] focus:bg-lav-50';

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
  // Solid pastel pills with the same dark edge as everything else.
  const tones = {
    neutral: 'bg-lav-100 text-[var(--text)]',
    good: 'bg-mint text-mint-ink',
    warn: 'bg-peach text-peach-ink',
    bad: 'bg-blush text-blush-ink',
    brand: 'bg-lilac text-lilac-ink',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-[1.5px] border-[var(--edge)] px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
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
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'brand';
  accent?: Pastel;
}) {
  // The figure itself stays near-black whatever the card is tinted, because a
  // ledger where every number is coloured is a ledger nobody can scan.
  const tones = {
    neutral: 'text-[var(--text)]',
    good: 'text-mint-ink',
    bad: 'text-blush-ink',
    brand: 'text-lilac-ink',
  };
  return (
    <div className={`nb rounded-2xl px-4 py-4 ${accent ? pastelFill[accent] : 'bg-[var(--card)]'}`}>
      <p className="text-[11px] font-extrabold tracking-[0.06em] text-[var(--text)]/60 uppercase">
        {label}
      </p>
      <p className={`tabular mt-2 text-[25px] leading-none font-extrabold tracking-tight ${tones[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-2 text-[12px] leading-relaxed font-medium text-[var(--text)]/65">{sub}</p>}
    </div>
  );
}

/** Horizontal proportion bar used for the category breakdown. */
export function Meter({
  value,
  tone = 'brand',
  color,
}: {
  value: number;
  tone?: 'brand' | 'bad';
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full border-[1.5px] border-[var(--edge)] bg-[var(--card-sunk)]"
      role="img"
      aria-label={`${clamped.toFixed(1)} percent`}
    >
      <div
        className={`h-full transition-[width] duration-500 ${
          color ? '' : tone === 'brand' ? 'bg-lilac' : 'bg-blush'
        }`}
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[15px] font-extrabold text-[var(--text)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed font-medium text-[var(--muted)]">
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
