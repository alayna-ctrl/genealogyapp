import { QualityTier } from "@/types/database";

const styles: Record<QualityTier, string> = {
  "Original Record": "bg-green-100 text-green-900",
  "Derivative Record": "bg-yellow-100 text-yellow-900",
  "Authored Work": "bg-orange-100 text-orange-900",
  "Family Tree / Other": "bg-red-100 text-red-900",
  "Find A Grave": "bg-orange-100 text-orange-900",
  Unknown: "bg-slate-100 text-slate-700",
};

export function QualityTierBadge({ tier }: { tier: QualityTier }) {
  const warning = tier === "Family Tree / Other" || tier === "Find A Grave";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[tier]}`}>{warning ? "⚠ " : ""}{tier}</span>;
}
