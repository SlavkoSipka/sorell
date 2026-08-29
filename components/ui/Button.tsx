import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'filled' | 'outline' | 'ghost';

const base =
  'inline-flex items-center justify-center rounded-card font-body font-medium text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  filled: 'border border-ink bg-ink text-canvas hover:bg-canvas hover:text-ink',
  outline: 'border border-line-strong bg-canvas text-ink hover:border-ink',
  ghost: 'border border-transparent text-ink hover:border-line-strong',
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = 'filled',
  fullWidth = false,
  className = '',
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} px-6 py-3 ${className}`}
    >
      {children}
    </Link>
  );
}

export default function Button({
  children,
  variant = 'filled',
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  disabled,
}: CommonProps & {
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} px-6 py-3 ${className}`}
    >
      {children}
    </button>
  );
}
