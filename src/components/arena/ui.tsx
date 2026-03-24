import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-[var(--teal)] text-black font-bold shadow-[0_0_24px_rgba(0,212,170,0.30)]"
          : "pill text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--cyan)]">
        {eyebrow}
      </div>
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass-panel rounded-[1.4rem] p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("glass-panel rounded-[1.6rem] p-6", className)}>{children}</div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

export function StatusPill({ status }: { status: "live" | "open" | "settled" }) {
  const map = {
    live: "status-live",
    open: "status-open",
    settled: "status-settled",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
        map[status],
      )}
    >
      {status}
    </span>
  );
}
