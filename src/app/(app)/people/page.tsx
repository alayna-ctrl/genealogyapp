"use client";

import { AppShell } from "@/components/app-shell";
import { PersonCard } from "@/components/PersonCard";
import { Person } from "@/types/database";
import { useEffect, useMemo, useState } from "react";

function daysSince(date?: string) {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState("");
  const [generation, setGeneration] = useState("");
  const [directLineOnly, setDirectLineOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  useEffect(() => { fetch("/api/people").then((res) => res.json()).then(setPeople); }, []);

  const filtered = useMemo(() => people.filter((p) => {
    if (status && p.status !== status) return false;
    if (generation && Number(generation) !== p.generation_number) return false;
    if (directLineOnly && !p.is_direct_line) return false;
    if (staleOnly && daysSince(p.last_worked_at) < 30) return false;
    return true;
  }), [people, status, generation, directLineOnly, staleOnly]);

  return <AppShell><div className="space-y-4"><h1 className="text-2xl font-semibold text-[#1F3864]">People</h1><div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-4"><select className="rounded border p-2" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All statuses</option><option>Verified</option><option>Likely</option><option>Needs Proof</option><option>Conflict</option><option>Probably Wrong</option><option>Done for Now</option></select><input className="rounded border p-2" placeholder="Generation" value={generation} onChange={(e)=>setGeneration(e.target.value)} /><label className="flex items-center gap-2 rounded border p-2"><input type="checkbox" checked={directLineOnly} onChange={(e)=>setDirectLineOnly(e.target.checked)} />Direct line</label><label className="flex items-center gap-2 rounded border p-2"><input type="checkbox" checked={staleOnly} onChange={(e)=>setStaleOnly(e.target.checked)} />Stale only</label></div>{filtered.length===0?<div className="rounded border bg-white p-6 text-slate-600">No people yet - add your first person.</div>:<div className="grid gap-3 md:grid-cols-2">{filtered.map((person)=><PersonCard key={person.id} person={person} />)}</div>}</div></AppShell>;
}
