"use client";

import { AppShell } from "@/components/app-shell";
import { PersonCard } from "@/components/PersonCard";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Person } from "@/types/database";

type DashboardData = {
  counts: Record<string, number>;
  total_people: number;
  percent_cleaned: number;
  priority_person: Person | null;
  recent_people: Person[];
  open_high_priority_tasks: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/dashboard")
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
          recent_people: payload.recent_people ?? [],
          open_high_priority_tasks: payload.open_high_priority_tasks ?? 0,
        }),
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  const setupError = /Missing|SUPABASE|service role|environment/i.test(error);
  return <AppShell>{error ? (
    setupError ? (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Setup required: Add your Supabase credentials to .env.local and restart the dev server. You need:
        NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY - all from your Supabase project Settings -&gt; API page.
      </div>
    ) : (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">Dashboard failed to load: {error}</div>
    )
  ) : !data ? <p>Loading...</p> : <div className="space-y-6"><h1 className="text-2xl font-semibold text-[#1F3864]">Dashboard</h1>{data.total_people===0?<div className="rounded border bg-white p-6 text-center"><p className="mb-3 text-slate-600">No people yet.</p><Link href="/people/new" className="rounded bg-[#2F75B6] px-3 py-2 text-white">Add Your First Person</Link></div>:<><div className="grid gap-3 md:grid-cols-4"><Stat label="Total" value={data.total_people} />{Object.entries(data.counts ?? {}).map(([k,v])=><Stat key={k} label={k} value={v} />)}<Stat label="% Cleaned" value={data.percent_cleaned} /><Stat label="Open High Priority Tasks" value={data.open_high_priority_tasks} /></div><section className="rounded border bg-white p-4"><h2 className="mb-2 text-lg font-semibold">Who to work on next</h2>{data.priority_person?<div className="flex items-center justify-between"><div><p className="font-semibold">{data.priority_person.full_name}</p><p className="text-sm text-slate-600">{data.priority_person.person_id}</p><div className="mt-2"><StatusBadge status={data.priority_person.status} /></div></div><Link className="rounded bg-[#2F75B6] px-3 py-2 text-white" href={`/people/${data.priority_person.person_id}`}>Continue Working</Link></div>:<p className="text-sm text-slate-500">No priority person right now.</p>}</section><section className="space-y-3"><h2 className="text-lg font-semibold">Recent People</h2><div className="grid gap-3 md:grid-cols-2">{(data.recent_people ?? []).map((person)=><PersonCard key={person.id} person={person} />)}</div></section></>}</div>}</AppShell>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded border bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}
