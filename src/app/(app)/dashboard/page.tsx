"use client";

import { AppShell } from "@/components/app-shell";
import { PersonCard } from "@/components/PersonCard";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Person } from "@/types/database";

type HubRow = {
  person_id: string;
  full_name: string;
  direct_line: boolean;
  score: number;
  rationale_tokens: string[];
  missing_count: number;
  weak_count: number;
  conflict_count: number;
  source_sites: string[];
  action_hints: string[];
};

type DashboardData = {
  counts: Record<string, number>;
  total_people: number;
  percent_cleaned: number;
  priority_person: Person | null;
  priority_reason: string;
  recent_people: Person[];
  open_high_priority_tasks: number;
  weak_direct_line_count: number;
  incomplete_people_count: number;
  activity_recent_7d_count: number;
  hub_sections: {
    urgent_proof_risks: HubRow[];
    missing_core_facts: HubRow[];
    stale_in_progress: HubRow[];
  };
  recent_activity: Array<{
    person_id: string;
    person_name: string;
    type: string;
    summary: string;
    created_at: string;
  }>;
  action_hints: string[];
  audit_rows: Array<{
    person_id: string;
    full_name: string;
    missing_count: number;
    weak_count: number;
    conflict_count: number;
    source_sites: string[];
    direct_line: boolean;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "direct-line" | "conflict" | "missing" | "stale">("all");
  const [taskToast, setTaskToast] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.reason || payload.details || "Setup required");
        }
      })
      .then(() => fetch("/api/dashboard"))
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load dashboard");
        }
        return payload;
      })
      .then((payload) =>
        setData({
          counts: payload.counts ?? {},
          total_people: payload.total_people ?? 0,
          percent_cleaned: payload.percent_cleaned ?? 0,
          priority_person: payload.priority_person ?? null,
          priority_reason: payload.priority_reason ?? "",
          recent_people: payload.recent_people ?? [],
          open_high_priority_tasks: payload.open_high_priority_tasks ?? 0,
          weak_direct_line_count: payload.weak_direct_line_count ?? 0,
          incomplete_people_count: payload.incomplete_people_count ?? 0,
          activity_recent_7d_count: payload.activity_recent_7d_count ?? 0,
          hub_sections: payload.hub_sections ?? {
            urgent_proof_risks: [],
            missing_core_facts: [],
            stale_in_progress: [],
          },
          recent_activity: payload.recent_activity ?? [],
          action_hints: payload.action_hints ?? [],
          audit_rows: payload.audit_rows ?? [],
        }),
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  const setupError = /Missing|SUPABASE|service role|environment/i.test(error);

  async function generateSuggestedTasks(personId: string) {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: personId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTaskToast(payload.error ?? "Could not generate suggested tasks.");
      setTimeout(() => setTaskToast(""), 3000);
      return;
    }
    setTaskToast(`Suggested tasks updated: created ${payload.created_count ?? 0}, skipped ${payload.skipped_count ?? 0}.`);
    setTimeout(() => setTaskToast(""), 3500);
  }

  return (
    <AppShell>
      {error ? (
        setupError ? (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Setup required: Add your Supabase credentials to `.env.local` and restart the dev server. You need
            `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
          </div>
        ) : (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Dashboard failed to load: {error}
          </div>
        )
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-[#1F3864]">Dashboard</h1>
          {taskToast ? <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">{taskToast}</div> : null}
          {data.total_people === 0 ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-6 text-center">
              <p className="mb-3 text-slate-600">No people yet.</p>
              <Link href="/people/new" className="rounded bg-violet-300 px-3 py-2 text-violet-950 hover:bg-violet-200">
                Add Your First Person
              </Link>
            </div>
          ) : (
            <>
              {/* Row 1: big headline numbers */}
              <div className="grid gap-3 md:grid-cols-3">
                <Stat label="Total People" value={data.total_people} highlight />
                <Stat label="% Cleaned" value={data.percent_cleaned} />
                <Stat label="Conflicts" value={Object.entries(data.counts ?? {}).find(([k]) => /conflict/i.test(k))?.[1] ?? 0} accent="red" />
              </div>
              {/* Row 2: research health chips */}
              <div className="flex flex-wrap gap-2">
                <HealthChip label="Weak Direct Line" value={data.weak_direct_line_count} color="amber" />
                <HealthChip label="Incomplete People" value={data.incomplete_people_count} color="rose" />
                <HealthChip label="Activity (7d)" value={data.activity_recent_7d_count} color="sky" />
                <HealthChip label="Open High Priority" value={data.open_high_priority_tasks} color="violet" />
              </div>
              <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <h2 className="mb-2 text-lg font-semibold">Who to work on next</h2>
                {data.priority_person ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{data.priority_person.full_name}</p>
                      <p className="text-sm text-slate-600">{data.priority_person.person_id}</p>
                      <div className="mt-2">
                        <StatusBadge status={data.priority_person.status} />
                      </div>
                      {data.priority_reason ? (
                        <p className="mt-2 text-xs text-slate-600">Reason: {data.priority_reason}</p>
                      ) : null}
                      {data.action_hints.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {data.action_hints.map((hint) => (
                            <ActionHintPill key={hint} label={hint} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Link className="rounded border border-sky-200 bg-sky-50 px-3 py-2" href={`/people/${data.priority_person.person_id}?action=add-source`}>Add source</Link>
                      <Link className="rounded border border-lime-200 bg-lime-50 px-3 py-2" href={`/people/${data.priority_person.person_id}?action=log-search`}>Log search</Link>
                      <Link className="rounded bg-indigo-300 px-3 py-2 text-indigo-950 hover:bg-indigo-200" href={`/people/${data.priority_person.person_id}`}>Continue</Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No priority person right now.</p>
                )}
              </section>
              <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-4 rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Research Hub Board</h2>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["all", "All"],
                        ["direct-line", "Direct Line"],
                        ["conflict", "Conflict"],
                        ["missing", "Missing Core Data"],
                        ["stale", "Stale"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          className={`ui-chip border ${filter === id ? "border-violet-200 bg-violet-100/70 text-violet-950" : "border-slate-200 bg-white/60 text-slate-700"}`}
                          onClick={() => setFilter(id as typeof filter)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <HubSectionCard
                    title="Urgent Proof Risks"
                    rows={applyFilter(data.hub_sections.urgent_proof_risks, filter)}
                    emptyText="No high-risk conflicts right now."
                    onGenerateTasks={generateSuggestedTasks}
                  />
                  <HubSectionCard
                    title="Missing Core Facts"
                    rows={applyFilter(data.hub_sections.missing_core_facts, filter)}
                    emptyText="No critical core-data gaps in current queue."
                    onGenerateTasks={generateSuggestedTasks}
                  />
                  <HubSectionCard
                    title="Stale In-Progress"
                    rows={applyFilter(data.hub_sections.stale_in_progress, filter)}
                    emptyText="No stale in-progress people right now."
                    onGenerateTasks={generateSuggestedTasks}
                  />
                </div>
                <ActivityFeedCard rows={data.recent_activity} />
              </section>
              <section className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/30 p-4">
                <h2 className="text-lg font-semibold">Recent People</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {(data.recent_people ?? []).map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, highlight, accent }: { label: string; value: number; highlight?: boolean; accent?: "red" }) {
  return (
    <div className={`rounded-xl border p-3 ${accent === "red" ? "border-red-100 bg-red-50/40" : highlight ? "border-indigo-200 bg-indigo-100/60" : "border-indigo-100 bg-indigo-50/50"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold ${accent === "red" ? "text-red-700" : "text-indigo-950"}`}>{value}</p>
    </div>
  );
}

function HealthChip({ label, value, color }: { label: string; value: number; color: "amber" | "rose" | "sky" | "violet" }) {
  const styles: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };
  return (
    <div className={`rounded-lg border px-3 py-1.5 text-sm ${styles[color]}`}>
      <span className="font-semibold">{value}</span>
      <span className="ml-1 text-xs opacity-75">{label}</span>
    </div>
  );
}

function ActionHintPill({ label }: { label: string }) {
  return <span className="ui-chip bg-fuchsia-100 text-fuchsia-900">{label}</span>;
}

function applyFilter(rows: HubRow[], filter: "all" | "direct-line" | "conflict" | "missing" | "stale") {
  if (filter === "all") return rows;
  if (filter === "direct-line") return rows.filter((row) => row.direct_line);
  if (filter === "conflict") return rows.filter((row) => row.conflict_count > 0);
  if (filter === "missing") return rows.filter((row) => row.missing_count > 0);
  if (filter === "stale") return rows.filter((row) => row.rationale_tokens.includes("Stale"));
  return rows;
}

function HubSectionCard({ title, rows, emptyText, onGenerateTasks }: { title: string; rows: HubRow[]; emptyText: string; onGenerateTasks: (personId: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-3 text-sm text-slate-500">{emptyText}</p>
        ) : (
          rows.map((row) => (
            <div key={`${title}-${row.person_id}`} className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.full_name}</p>
                  <p className="text-xs text-slate-600">
                    Missing: {row.missing_count} | Weak: {row.weak_count} | Conflicts: {row.conflict_count}
                  </p>
                  <p className="text-xs text-slate-500">Sites: {row.source_sites.join(", ") || "None yet"}</p>
                </div>
                <div className="flex gap-1">
                  {row.action_hints.map((hint) => (
                    <ActionHintPill key={`${row.person_id}-${hint}`} label={hint} />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link className="ui-chip border border-sky-200 bg-sky-50 text-sky-900" href={`/people/${row.person_id}?action=add-source`}>Add source</Link>
                <Link className="ui-chip border border-lime-200 bg-lime-50 text-lime-900" href={`/people/${row.person_id}?action=log-search`}>Log search</Link>
                <button className="ui-chip border border-amber-200 bg-amber-50 text-amber-900" onClick={() => onGenerateTasks(row.person_id)}>Generate tasks</button>
                <Link className="ui-chip border border-violet-200 bg-violet-50 text-violet-900" href={`/people/${row.person_id}`}>Review audit</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityFeedCard({ rows }: { rows: DashboardData["recent_activity"] }) {
  return (
    <aside className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent Decisions</h3>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-3 text-sm text-slate-500">No recent research activity yet.</p>
        ) : (
          rows.map((row) => (
            <Link key={`${row.person_id}-${row.created_at}-${row.summary}`} href={`/people/${row.person_id}`} className="block rounded-xl border border-slate-200 bg-white/70 p-2 text-sm hover:bg-white">
              <p className="font-medium">{row.person_name}</p>
              <p className="text-xs text-slate-600">{row.type}: {row.summary}</p>
              <p className="text-[11px] text-slate-500">{new Date(row.created_at).toLocaleString()}</p>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
