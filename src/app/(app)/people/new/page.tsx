"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { useState } from "react";

const suggestions = [
  "Are his parents [name] and [name] proven by records?",
  "Is this the right person connected to my family?",
  "Is the spouse correct?",
];

export default function NewPersonPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [mainQuestion, setMainQuestion] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [generationNumber, setGenerationNumber] = useState(1);
  const [isDirectLine, setIsDirectLine] = useState(false);
  const [isFastTrack, setIsFastTrack] = useState(false);
  const [isStartingPerson, setIsStartingPerson] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: fullName, main_question: mainQuestion, birth_date: birthYear || null, death_date: deathYear || null, generation_number: generationNumber, is_direct_line: isDirectLine, is_fast_track: isFastTrack, is_starting_person: isStartingPerson }) });
    const created = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(created.error ?? "Could not create person.");
      return;
    }
    if (created.person_id) router.push(`/people/${created.person_id}`);
  }

  return <AppShell><div className="mx-auto max-w-2xl space-y-4 rounded border bg-white p-6"><h1 className="text-2xl font-semibold text-[#1F3864]">New Person Wizard</h1><div className="text-sm text-slate-600">Step {step} of 4</div>{error?<div className="rounded bg-red-100 p-2 text-sm text-red-900">{error}</div>:null}{step===1?<div className="space-y-2"><input className="w-full rounded border p-2" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} /><div className="grid gap-2 md:grid-cols-2"><input className="w-full rounded border p-2" placeholder="Approx birth year (optional)" value={birthYear} onChange={(e)=>setBirthYear(e.target.value)} /><input className="w-full rounded border p-2" placeholder="Approx death year (optional)" value={deathYear} onChange={(e)=>setDeathYear(e.target.value)} /></div><p className="text-xs text-slate-500">If you know rough years, we will auto-generate more targeted checklist tasks.</p></div>:null}{step===2?<div className="space-y-2"><textarea className="h-28 w-full rounded border p-2" value={mainQuestion} onChange={(e)=>setMainQuestion(e.target.value)} placeholder="Main research question" /><div className="space-y-1 rounded border bg-slate-50 p-2 text-xs">{suggestions.map((s)=><button key={s} className="block text-left text-[#2F75B6]" onClick={()=>setMainQuestion(s)} type="button">{s}</button>)}</div></div>:null}{step===3?<div className="space-y-3 text-sm"><div><label>Generation ({isStartingPerson ? "0" : "1-10"})</label><input className="mt-1 w-full rounded border p-2" type="number" min={isStartingPerson ? 0 : 1} max={10} value={isStartingPerson ? 0 : generationNumber} onChange={(e)=>setGenerationNumber(Number(e.target.value))} disabled={isStartingPerson} /></div><label className="flex items-center gap-2"><input type="checkbox" checked={isStartingPerson} onChange={(e)=>{ const checked = e.target.checked; setIsStartingPerson(checked); if (checked) { setIsDirectLine(true); setGenerationNumber(0); } }} />Set as Starting Person (Me)</label><label className="flex items-center gap-2"><input type="checkbox" checked={isDirectLine || isStartingPerson} onChange={(e)=>setIsDirectLine(e.target.checked)} disabled={isStartingPerson} />Direct Line</label><label className="flex items-center gap-2"><input type="checkbox" checked={isFastTrack} onChange={(e)=>setIsFastTrack(e.target.checked)} />Fast Track</label><p className="text-xs text-slate-500">Starting Person is your root person and will be saved as generation 0. Only one person can hold this slot at a time.</p></div>:null}{step===4?<div className="rounded border bg-slate-50 p-3 text-sm"><p><strong>Name:</strong> {fullName}</p><p><strong>Question:</strong> {mainQuestion}</p><p><strong>Birth year:</strong> {birthYear || "Unknown"}</p><p><strong>Death year:</strong> {deathYear || "Unknown"}</p><p><strong>Generation:</strong> {isStartingPerson ? 0 : generationNumber}</p><p><strong>Starting person:</strong> {isStartingPerson ? "Yes" : "No"}</p><p><strong>Direct line:</strong> {isStartingPerson || isDirectLine?"Yes":"No"}</p><p><strong>Fast track:</strong> {isFastTrack?"Yes":"No"}</p><p className="mt-2 text-xs text-slate-600">Starter checklist will be created automatically after you confirm.</p></div>:null}<div className="flex justify-between"><button className="rounded border px-3 py-2" type="button" onClick={()=>setStep((s)=>Math.max(1,s-1))}>Back</button>{step<4?<button className="rounded bg-[#2F75B6] px-3 py-2 text-white" type="button" onClick={()=>setStep((s)=>Math.min(4,s+1))}>Next</button>:<button className="rounded bg-green-700 px-3 py-2 text-white disabled:opacity-60" disabled={creating} type="button" onClick={submit}>{creating?"Creating...":"Confirm"}</button>}</div></div></AppShell>;
}
