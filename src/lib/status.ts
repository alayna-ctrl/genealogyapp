export const STATUS_COLORS: Record<string, string> = {
  Verified: "bg-[#C6EFCE] text-green-900",
  Likely: "bg-[#FFEB9C] text-yellow-900",
  "Needs Proof": "bg-[#FFCCCC] text-red-900",
  Conflict: "bg-[#F4CCFF] text-purple-900",
  "Probably Wrong": "bg-[#FF9999] text-red-950",
  "Done for Now": "bg-[#DDEBF7] text-blue-900",
};

export const STATUS_OPTIONS = [
  "Verified",
  "Likely",
  "Needs Proof",
  "Conflict",
  "Probably Wrong",
  "Done for Now",
] as const;
