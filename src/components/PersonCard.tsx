import Link from "next/link";
import { Person } from "@/types/database";
import { StatusBadge } from "@/components/StatusBadge";
import { StepProgressBar } from "@/components/StepProgressBar";

export function PersonCard({ person }: { person: Person }) {
  return (
    <Link href={`/people/${person.person_id}`} className="block rounded border bg-white p-3 hover:shadow-sm">
      <p className="font-semibold text-[#1F3864]">{person.full_name}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
        <span>Gen {person.generation_number ?? "-"}</span>
        {person.is_direct_line && <span className="rounded bg-blue-100 px-2 py-0.5">Direct line</span>}
        {person.is_fast_track && <span className="rounded bg-amber-100 px-2 py-0.5">⚡ Fast Track</span>}
      </div>
      <div className="mt-2"><StatusBadge status={person.status} /></div>
      <div className="mt-3"><StepProgressBar currentStep={person.current_step} totalSteps={7} isFastTrack={person.is_fast_track} /></div>
      <p className="mt-2 text-xs text-slate-500">Last worked: {person.last_worked_at ? new Date(person.last_worked_at).toLocaleDateString() : "Never"}</p>
    </Link>
  );
}
