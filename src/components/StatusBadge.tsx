import { Status } from "@/types/database";

const STATUS_STYLES: Record<Status, string> = {
  Verified: "bg-[#C6EFCE] text-[#1f4d1f]",
  Likely: "bg-[#FFEB9C] text-[#5e4a00]",
  "Needs Proof": "bg-[#FFCCCC] text-[#7a1f1f]",
  Conflict: "bg-[#F4CCFF] text-[#5c2b66]",
  "Probably Wrong": "bg-[#FF9999] text-[#5b1111]",
  "Done for Now": "bg-[#DDEBF7] text-[#1f3864]",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>;
}
