import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ title, value, hint, icon: Icon, className = "" }: Props) {
  return (
    <div
      className={`card p-5 shadow-[0_4px_16px_rgba(10,10,10,0.12)] transition-[transform,box-shadow] duration-1000 ease-in-out will-change-transform hover:-translate-y-1.5 hover:shadow-[0_10px_28px_rgba(10,10,10,0.26)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {title}
          </p>
          <p className="font-display mt-2 text-[2rem] leading-none text-ink">{value}</p>
          {hint ? <p className="mt-3 text-xs text-muted">{hint}</p> : null}
        </div>
        <div className="border border-border bg-[#f4f4f4] p-2.5 text-ink">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
