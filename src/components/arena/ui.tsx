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
        /* fluid padding + text so it scales on every screen */
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-xs font-bold transition hover:-translate-y-0.5 whitespace-nowrap sm:px-5 sm:py-3 sm:text-sm",
        variant === "primary"
          ? "bg-[var(--teal)] text-black shadow-[0_0_24px_rgba(0,212,170,0.30)]"
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
    <div className="mb-6 max-w-2xl space-y-3 sm:mb-8 sm:space-y-4">
      <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--cyan)] sm:px-3 sm:py-1 sm:text-xs">
        {eyebrow}
      </div>
      <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.04em] text-white">
        {title}
      </h2>
      <p className="text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7">
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
    <div className="glass-panel rounded-[1.25rem] p-4 sm:rounded-[1.4rem] sm:p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.24em]">
        {label}
      </div>
      <div
        className="mt-2 font-mono text-2xl font-semibold sm:mt-3 sm:text-3xl"
        style={{ color: accent }}
      >
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
    <div className={cx("glass-panel rounded-[1.4rem] p-4 sm:rounded-[1.6rem] sm:p-6", className)}>
      {children}
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5" style={{ backgroundColor: color }} />;
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
        /* smaller on xs, normal on sm+ */
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.22em]",
        map[status],
      )}
    >
      {status}
    </span>
  );
}
