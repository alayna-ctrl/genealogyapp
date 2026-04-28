import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function daysSince(date: string | null) {
  if (!date) return 999;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: peopleData } = await supabase
    .from("people")
    .select("person_id, full_name, generation_number, is_direct_line, current_step, status, last_worked_at")
    .order("full_name", { ascending: true });
  const people = peopleData ?? [];

  const status = typeof params.status === "string" ? params.status : "";
  const generation = typeof params.generation === "string" ? Number(params.generation) : null;
  const directLine = params.directLine === "true";
  const staleOnly = params.stale === "true";

  const filtered = people.filter((p) => {
    if (status && p.status !== status) return false;
    if (generation && p.generation_number !== generation) return false;
    if (directLine && !p.is_direct_line) return false;
    if (staleOnly && daysSince(p.last_worked_at) < 30) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#1F3864]">People</h1>
          <Link href="/people/new" className="rounded bg-[#2F75B6] px-3 py-2 text-white">Add Person</Link>
        </div>

        <form className="grid gap-2 rounded border bg-white p-3 md:grid-cols-4">
          <select name="status" defaultValue={status} className="rounded border p-2">
            <option value="">All Statuses</option>
            <option>Verified</option><option>Likely</option><option>Needs Proof</option>
            <option>Conflict</option><option>Probably Wrong</option><option>Done for Now</option>
          </select>
          <input name="generation" defaultValue={generation ?? ""} placeholder="Generation" className="rounded border p-2" />
          <label className="flex items-center gap-2 rounded border p-2"><input type="checkbox" name="directLine" value="true" defaultChecked={directLine} />Direct line only</label>
          <label className="flex items-center gap-2 rounded border p-2"><input type="checkbox" name="stale" value="true" defaultChecked={staleOnly} />Stale only (30+ days)</label>
          <button className="rounded bg-slate-800 px-3 py-2 text-white md:col-span-4" type="submit">Apply Filters</button>
        </form>

        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">Person ID</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Generation</th>
                <th className="p-2 text-left">Direct Line</th>
                <th className="p-2 text-left">Step</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Last Worked On</th>
                <th className="p-2 text-left">Days Since Worked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="p-4 text-slate-500" colSpan={8}>No people found. Add a person to begin your workflow.</td></tr>
              ) : filtered.map((p) => (
                <tr className="border-t" key={p.person_id}>
                  <td className="p-2"><a href={`/people/${p.person_id}`} className="text-[#2F75B6]">{p.person_id}</a></td>
                  <td className="p-2">{p.full_name}</td>
                  <td className="p-2">{p.generation_number ?? "-"}</td>
                  <td className="p-2">{p.is_direct_line ? <span className="rounded bg-blue-100 px-2 py-1 text-xs">Direct</span> : "-"}</td>
                  <td className="p-2"><StepProgress step={p.current_step} /></td>
                  <td className="p-2"><StatusBadge status={p.status} /></td>
                  <td className="p-2">{p.last_worked_at ? new Date(p.last_worked_at).toLocaleDateString() : "-"}</td>
                  <td className={`p-2 ${daysSince(p.last_worked_at) >= 30 ? "text-red-700" : ""}`}>{daysSince(p.last_worked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        const n = i + 1;
        const active = n <= step;
        return <span key={n} className={`h-2 w-5 rounded ${active ? "bg-[#2F75B6]" : "bg-slate-200"}`} />;
      })}
      <span className="ml-1 text-xs">{step}/7</span>
    </div>
  );
}
