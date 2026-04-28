import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";

function daysSince(date: string | null) {
  if (!date) return 999;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: peopleData } = await supabase
    .from("people")
    .select("person_id, full_name, generation_number, current_step, status, last_worked_at, finished_at")
    .order("last_worked_at", { ascending: false, nullsFirst: false });
  const people = peopleData ?? [];

  const { data: taskData } = await supabase
    .from("next_steps")
    .select("id, priority, done")
    .eq("done", false);
  const tasks = taskData ?? [];

  const counts = {
    total: people.length,
    verified: people.filter((p) => p.status === "Verified").length,
    likely: people.filter((p) => p.status === "Likely").length,
    needsProof: people.filter((p) => p.status === "Needs Proof").length,
    conflict: people.filter((p) => p.status === "Conflict").length,
    probablyWrong: people.filter((p) => p.status === "Probably Wrong").length,
    doneForNow: people.filter((p) => p.status === "Done for Now").length,
    highPriorityTasks: tasks.filter((t) => t.priority === "High").length,
  };

  const prioritized = [...people].sort((a, b) => {
    const aCritical = a.status === "Conflict" || a.status === "Probably Wrong";
    const bCritical = b.status === "Conflict" || b.status === "Probably Wrong";
    if (aCritical !== bCritical) return aCritical ? -1 : 1;

    const aStale = daysSince(a.last_worked_at) >= 30 && a.status !== "Done for Now";
    const bStale = daysSince(b.last_worked_at) >= 30 && b.status !== "Done for Now";
    if (aStale !== bStale) return aStale ? -1 : 1;

    const aMid = a.current_step >= 1 && a.current_step <= 6 && a.status !== "Done for Now";
    const bMid = b.current_step >= 1 && b.current_step <= 6 && b.status !== "Done for Now";
    if (aMid !== bMid) return aMid ? -1 : 1;

    return daysSince(b.last_worked_at) - daysSince(a.last_worked_at);
  });

  const nextPerson = prioritized[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-[#1F3864]">Dashboard</h1>
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Total People" value={counts.total} />
          <StatCard label="Verified" value={counts.verified} />
          <StatCard label="Likely" value={counts.likely} />
          <StatCard label="Needs Proof" value={counts.needsProof} />
          <StatCard label="Conflict" value={counts.conflict} />
          <StatCard label="Probably Wrong" value={counts.probablyWrong} />
          <StatCard label="Done for Now" value={counts.doneForNow} />
          <StatCard label="Open High Priority Tasks" value={counts.highPriorityTasks} />
        </div>

        <section className="rounded border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Who to work on next</h2>
          {nextPerson ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{nextPerson.full_name}</p>
                <p className="text-sm text-slate-600">{nextPerson.person_id} - Generation {nextPerson.generation_number ?? "-"} - Step {nextPerson.current_step}</p>
                <div className="mt-2"><StatusBadge status={nextPerson.status} /></div>
              </div>
              <a className="rounded bg-[#2F75B6] px-3 py-2 text-white" href={`/people/${nextPerson.person_id}`}>Continue</a>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No people yet. Add a person to begin.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
