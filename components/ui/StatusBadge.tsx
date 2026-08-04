import { titleCase } from "@/lib/format";

const TONE: Record<string, string> = {
  pending: "bg-[#f4f4f4] text-[#0a0a0a]",
  payment_confirmed: "bg-[#0a0a0a] text-white",
  in_production: "bg-[#e5e5e5] text-[#0a0a0a]",
  quality_check: "bg-[#f4f4f4] text-[#0a0a0a]",
  shipped: "bg-[#e5e5e5] text-[#0a0a0a]",
  delivered: "bg-[#0a0a0a] text-white",
  cancelled: "bg-white text-[#0a0a0a] border border-[#0a0a0a]",
  refund_initiated: "bg-[#e5e5e5] text-[#0a0a0a]",
  refunded: "bg-[#f4f4f4] text-[#737373]",
  paid: "bg-[#0a0a0a] text-white",
  failed: "bg-white text-[#0a0a0a] border border-[#0a0a0a]",
  pending_review: "bg-[#f4f4f4] text-[#0a0a0a]",
  quoted: "bg-[#e5e5e5] text-[#0a0a0a]",
  accepted: "bg-[#0a0a0a] text-white",
  rejected: "bg-white text-[#0a0a0a] border border-[#0a0a0a]",
  active: "bg-[#0a0a0a] text-white",
  inactive: "bg-[#f4f4f4] text-[#737373]",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE[status] || "bg-[#f4f4f4] text-[#0a0a0a]";
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tone}`}>
      {titleCase(status)}
    </span>
  );
}
