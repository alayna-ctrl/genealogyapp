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
  const [generationNumber, setGenerationNumber] = useState(1);
  const [isDirectLine, setIsDirectLine] = useState(false);
  const [isFastTrack, setIsFastTrack] = useState(false);

  async function submit() {
    const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: fullName, main_question: mainQuestion, generation_number: generationNumber, is_direct_line: isDirectLine, is_fast_track: isFastTrack }) });
    const created = await res.json();
    if (created.person_id) router.push(`/people/${created.person_id}`);
  }

  return <AppShell><div className="mx-auto max-w-2xl space-y-4 rounded border bg-white p-6"><h1 className="text-2xl font-semibold text-[#1F3864]">New Person Wizard</h1><div className="text-sm text-slate-600">Step {step} of 4</div>{step===1?<input className="w-full rounded border p-2" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />:null}{step===2?<div className="space-y-2"><textarea className="h-28 w-full rounded border p-2" value={mainQuestion} onChange={(e)=>setMainQuestion(e.target.value)} placeholder="Main research question" /><div className="space-y-1 rounded border bg-slate-50 p-2 text-xs">{suggestions.map((s)=><button key={s} className="block text-left text-[#2F75B6]" onClick={()=>setMainQuestion(s)} type="button">{s}</button>)}</div></div>:null}{step===3?<div className="space-y-3 text-sm"><div><label>Generation (1-10)</label><input className="mt-1 w-full rounded border p-2" type="number" min={1} max={10} value={generationNumber} onChange={(e)=>setGenerationNumber(Number(e.target.value))} /></div><label className="flex items-center gap-2"><input type="checkbox" checked={isDirectLine} onChange={(e)=>setIsDirectLine(e.target.checked)} />Direct Line</label><label className="flex items-center gap-2"><input type="checkbox" checked={isFastTrack} onChange={(e)=>setIsFastTrack(e.target.checked)} />Fast Track</label><p className="text-xs text-slate-500">Use for people you already know well - grandparents, parents.</p></div>:null}{step===4?<div className="rounded border bg-slate-50 p-3 text-sm"><p><strong>Name:</strong> {fullName}</p><p><strong>Question:</strong> {mainQuestion}</p><p><strong>Generation:</strong> {generationNumber}</p><p><strong>Direct line:</strong> {isDirectLine?"Yes":"No"}</p><p><strong>Fast track:</strong> {isFastTrack?"Yes":"No"}</p></div>:null}<div className="flex justify-between"><button className="rounded border px-3 py-2" type="button" onClick={()=>setStep((s)=>Math.max(1,s-1))}>Back</button>{step<4?<button className="rounded bg-[#2F75B6] px-3 py-2 text-white" type="button" onClick={()=>setStep((s)=>Math.min(4,s+1))}>Next</button>:<button className="rounded bg-green-700 px-3 py-2 text-white" type="button" onClick={submit}>Confirm</button>}</div></div></AppShell>;
}
