import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnProps = { variant?: "primary" | "ghost" | "soft" | "gold"; size?: "sm" | "md" | "lg"; className?: string };

const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
const variants = {
  primary: "bg-ink text-ivory hover:bg-ink-2",
  ghost: "text-ink hover:bg-surface",
  soft: "bg-surface text-ink hover:bg-surface-2",
  gold: "bg-gold text-white hover:brightness-110",
};
const sizes = { sm: "h-9 px-4 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-[15px] py-3.5" };

export function btn({ variant = "primary", size = "md", className = "" }: BtnProps = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

export function Button({ variant, size, className, ...props }: BtnProps & ComponentProps<"button">) {
  return <button className={btn({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, href, children, ...rest }: BtnProps & { href: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={btn({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] font-medium text-ink-2 mb-1.5">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-mute mt-1.5">{hint}</span> : null}
    </label>
  );
}

const inputCls = "w-full rounded-2xl bg-surface px-4 h-12 text-[15px] text-ink placeholder:text-mute/70 outline-none focus:ring-2 focus:ring-gold/40 transition";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${inputCls} h-auto py-3 min-h-24 ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputCls} appearance-none truncate pr-9 bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23857b70%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat ${props.className ?? ""}`} />;
}

const tones: Record<string, string> = {
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/12 text-warn",
  bad: "bg-bad/10 text-bad",
  info: "bg-gold/12 text-gold",
  mute: "bg-surface-2 text-mute",
};

export function Badge({ tone = "mute", children }: { tone?: keyof typeof tones | string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[11.5px] font-medium ${tones[tone] ?? tones.mute}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, string> = {
  succeeded: "ok", live: "ok", active: "ok",
  running: "info", queued: "info", trialing: "info",
  review: "warn", draft: "warn", past_due: "warn",
  failed: "bad", paused: "mute", canceled: "mute",
};

export const STATUS_LABEL: Record<string, string> = {
  succeeded: "Ready", running: "Making", queued: "Queued", review: "Needs review", failed: "Stopped",
  live: "Live", draft: "Setting up", paused: "Paused", active: "Active", trialing: "Trial", past_due: "Past due", canceled: "Canceled",
};

export function Status({ value }: { value: string }) {
  return (
    <Badge tone={STATUS_TONE[value] ?? "mute"}>
      <i className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[value] ?? value}
    </Badge>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-5">
      <div className="text-[12.5px] text-mute">{label}</div>
      <div className="mt-2 text-[28px] leading-none font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-2 text-xs text-mute">{sub}</div> : null}
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
      <div>
        {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
        <h1 className="font-display text-[40px] leading-[1.05]">{title}</h1>
        {sub ? <p className="mt-3 text-[15px] text-mute max-w-xl">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface px-8 py-14 text-center">
      <div className="font-display text-2xl">{title}</div>
      {sub ? <p className="mt-2 text-sm text-mute max-w-sm mx-auto">{sub}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-12 first:mt-0">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-gold-soft/60 text-[13px] text-ink-2 px-4 py-3">{children}</div>;
}
