import { STATUS_COLORS } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-slate-200 text-slate-800"}`}>
      {status}
    </span>
  );
}
