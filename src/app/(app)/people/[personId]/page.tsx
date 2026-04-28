"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AppShell } from "@/components/app-shell";
import { PersonCard } from "@/components/PersonCard";
import { QualityTierBadge } from "@/components/QualityTierBadge";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { StepProgressBar } from "@/components/StepProgressBar";
import { useEffect, useState } from "react";

const STEPS = ["Snapshot", "Source Review", "Relationship Check", "Hints + Searches", "Evidence Summary", "Update Ancestry", "Next Steps"];

export default function PersonWorkflowPage({ params }: { params: Promise<{ personId: string }> }) {
  const [personId, setPersonId] = useState("");
  const [bundle, setBundle] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [profileText, setProfileText] = useState("");
  const [recordText, setRecordText] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => { params.then((p) => setPersonId(p.personId)); }, [params]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (personId) fetchData(); }, [personId]);

  async function fetchData() {
    const data = await fetch(`/api/people/${personId}`).then((r) => r.json());
    setBundle(data);
    setStep(data.person.current_step);
  }

  async function savePerson(payload: Record<string, unknown>) {
    await fetch(`/api/people/${personId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    fetchData();
  }

  async function advanceStep() {
    const res = await fetch(`/api/people/${personId}/advance-step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newStep: Math.min(7, step + 1) }) });
    const data = await res.json();
    if (!res.ok) {
      setMissing(data.missing ?? [data.error]);
      return;
    }
    setMissing([]);
    setStep(data.current_step);
    fetchData();
  }

  if (!bundle) return <AppShell><p>Loading...</p></AppShell>;

  const person = bundle.person;
  const sources = bundle.sources ?? [];
  const relationships = bundle.relationships ?? [];
  const hints = bundle.hints ?? [];
  const evidence = bundle.evidence ?? [];
  const nextSteps = bundle.next_steps ?? [];

  const connectingChildWarning = relationships.find((r: any) => r.relationship_type === "Connecting Child" && (r.status === "Needs Proof" || r.status === "Probably Wrong"));

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr_18rem]">
        <aside className="space-y-3">
          <PersonCard person={person} />
          <div className="rounded border bg-white p-3">
            <StepProgressBar currentStep={step} totalSteps={7} isFastTrack={person.is_fast_track} />
            <div className="mt-3 space-y-1">
              {STEPS.map((name, i) => (
                <button key={name} className={`block w-full rounded px-2 py-1 text-left text-sm ${step === i + 1 ? "bg-blue-50" : ""}`} onClick={() => setStep(i + 1)}>
                  Step {i + 1}: {name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-4 rounded border bg-white p-4">
          <h1 className="text-xl font-semibold text-[#1F3864]">Step {step}: {STEPS[step - 1]}</h1>

          {step === 1 && (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                {[["birth_date","Birth Date"],["birth_place","Birth Place"],["death_date","Death Date"],["death_place","Death Place"],["spouse_name","Spouse"],["marriage_date","Marriage Date"],["father_name","Father"],["mother_name","Mother"],["connecting_child","Connecting Child"],["ancestry_profile_url","Ancestry URL"]].map(([f,l]) => (
                  <label key={f} className="text-sm">{l}<input className="mt-1 w-full rounded border p-2" defaultValue={person[f] ?? ""} onBlur={(e) => savePerson({ [f]: e.currentTarget.value })} /></label>
                ))}
              </div>
              <label className="text-sm">Concern<textarea className="mt-1 w-full rounded border p-2" defaultValue={person.concern ?? ""} onBlur={(e) => savePerson({ concern: e.currentTarget.value })} /></label>
              <div className="rounded border p-3">
                <p className="font-semibold">Parse Ancestry Profile</p>
                <textarea className="mt-2 h-24 w-full rounded border p-2" value={profileText} onChange={(e) => setProfileText(e.target.value)} />
                <button className="mt-2 rounded bg-[#2F75B6] px-3 py-2 text-white" onClick={async () => {
                  const parsed = await fetch("/api/parse/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: profileText }) }).then((r) => r.json());
                  await savePerson({ full_name: parsed.name || person.full_name, birth_date: parsed.birth || person.birth_date, death_date: parsed.death || person.death_date, spouse_name: parsed.spouse || person.spouse_name, marriage_date: parsed.marriageDate || person.marriage_date, father_name: parsed.father || person.father_name, mother_name: parsed.mother || person.mother_name });
                }}>Parse + Apply</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {sources.map((source: any) => (
                <div key={source.id} className="rounded border p-3 text-sm">
                  <p className="font-semibold">{source.source_title}</p>
                  <QualityTierBadge tier={source.source_quality_tier ?? "Unknown"} />
                  {source.source_quality_tier === "Family Tree / Other" && <p className="mt-2 rounded bg-red-100 p-2 text-red-900">⚠ This is another person&apos;s tree - NOT evidence. Find the real record this tree claims to prove.</p>}
                </div>
              ))}
              <div className="rounded border p-3">
                <p className="font-semibold">Add Source / Parse Record Text</p>
                <textarea className="mt-2 h-24 w-full rounded border p-2" value={recordText} onChange={(e) => setRecordText(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button className="rounded border px-3 py-2" onClick={async () => {
                    await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, source_title: "New Source", keep_decision: "Maybe", source_quality_tier: "Unknown", downloaded: false }) });
                    fetchData();
                  }}>Add Blank Source</button>
                  <button className="rounded bg-[#2F75B6] px-3 py-2 text-white" onClick={async () => {
                    const parsed = await fetch("/api/parse/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: recordText }) }).then((r) => r.json());
                    await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, source_title: `${parsed.recordType} Parsed Source`, what_it_says: parsed.says, what_it_proves: parsed.proves, what_it_does_not_prove: parsed.notProves, source_quality_tier: parsed.recordType === "Census" ? "Original Record" : "Unknown", keep_decision: "Maybe", downloaded: false }) });
                    fetchData();
                  }}>Parse + Save Source</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {relationships.filter((r: any) => ["Spouse", "Connecting Child", "Father", "Mother"].includes(r.relationship_type)).map((rel: any) => (
                <div key={rel.id} className="rounded border p-3">
                  <p className="font-semibold">{rel.relationship_type}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input className="rounded border p-2" placeholder="Related person name" defaultValue={rel.related_person_name ?? ""} onBlur={(e) => fetch(`/api/relationships/${rel.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ related_person_name: e.currentTarget.value, claim: `${rel.relationship_type} relationship for ${person.full_name}`, suggested_searches: `Search ${rel.relationship_type} records for ${person.full_name}` }) }).then(fetchData)} />
                    <select className="rounded border p-2" defaultValue={rel.status} onChange={(e) => fetch(`/api/relationships/${rel.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: e.currentTarget.value }) }).then(fetchData)}>
                      <option>Verified</option><option>Likely</option><option>Needs Proof</option><option>Conflict</option><option>Probably Wrong</option>
                    </select>
                    <textarea className="rounded border p-2" placeholder="Evidence" defaultValue={rel.evidence_summary ?? ""} onBlur={(e) => fetch(`/api/relationships/${rel.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidence_summary: e.currentTarget.value }) }).then(fetchData)} />
                    <textarea className="rounded border p-2" placeholder="Problems" defaultValue={rel.problems ?? ""} onBlur={(e) => fetch(`/api/relationships/${rel.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problems: e.currentTarget.value }) }).then(fetchData)} />
                  </div>
                </div>
              ))}
              {connectingChildWarning && <div className="rounded bg-red-100 p-2 text-sm text-red-900">🚩 STOP: Do not go further back in this family line until the connecting child link is verified.</div>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <button className="rounded border px-3 py-2" onClick={() => fetch('/api/hints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, type: 'Manual Search', decision: 'Logged - Nothing Found', result_description: 'Negative search logged' }) }).then(fetchData)}>Log a Negative Search</button>
              {hints.map((hint: any) => <div key={hint.id} className="rounded border p-2 text-sm">{hint.type} - {hint.decision} - {hint.result_description}</div>)}
            </div>
          )}

          {step === 5 && !person.is_fast_track && (
            <SimpleEvidence personId={personId} person={person} current={evidence[0]} refresh={fetchData} />
          )}

          {step === 6 && !person.is_fast_track && (
            <Checklist savePerson={savePerson} />
          )}

          {step === 7 && (
            <NextStepSection personId={personId} person={person} nextSteps={nextSteps} refresh={fetchData} savePerson={savePerson} />
          )}

          {missing.length > 0 && <div className="rounded bg-red-100 p-2 text-sm text-red-900">{missing.join(", ")}</div>}

          <div className="flex justify-between">
            <button className="rounded border px-3 py-2" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
            <button className="rounded bg-green-700 px-3 py-2 text-white" onClick={advanceStep}>Advance Step</button>
          </div>
        </section>

        <aside className="space-y-3">
          <RedFlagPanel person={person} sources={sources} relationships={relationships} />
          <div className="rounded border bg-white p-3">
            <p className="font-semibold">Open next steps</p>
            {nextSteps.filter((n: any) => !n.done).map((n: any) => <div key={n.id} className="mt-2 rounded border p-2 text-sm">{n.task}</div>)}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function SimpleEvidence({ personId, person, current, refresh }: any) {
  const [form, setForm] = useState({
    claim_being_checked: current?.claim_being_checked ?? person.main_question ?? "",
    evidence_for: current?.evidence_for ?? "",
    evidence_against: current?.evidence_against ?? "",
    best_conclusion: current?.best_conclusion ?? "",
    status: current?.status ?? "Needs Proof",
    strongest_sources: current?.strongest_sources ?? "",
    still_needed: current?.still_needed ?? "",
  });

  const note = `CLEANUP NOTE\n\nStatus: ${form.status}\n\nMain question checked:\n${form.claim_being_checked}\n\nWhat seems solid:\n${form.evidence_for}\n\nWhat is still uncertain:\n${form.evidence_against}\n\nStrongest sources:\n${form.strongest_sources}\n\nNext steps:\n${form.still_needed}`;

  return <div className="grid gap-3 md:grid-cols-2"><div className="space-y-2">{Object.entries(form).map(([k,v]) => k==="status" ? <select key={k} className="w-full rounded border p-2" value={String(v)} onChange={(e)=>setForm({ ...form, status: e.target.value })}><option>Verified</option><option>Likely</option><option>Needs Proof</option><option>Conflict</option><option>Probably Wrong</option><option>Done for Now</option></select> : <textarea key={k} className="h-20 w-full rounded border p-2" placeholder={k} value={String(v)} onChange={(e)=>setForm({ ...form, [k]: e.target.value })} />)}<button className="rounded bg-[#2F75B6] px-3 py-2 text-white" onClick={async()=>{if(current?.id){await fetch(`/api/evidence/${current.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});}else{await fetch('/api/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ ...form, person_id: personId, person_name: person.full_name })});} refresh();}}>Save</button></div><div className="rounded border bg-slate-50 p-3 text-sm whitespace-pre-wrap">{note}<button className="mt-3 rounded border px-2 py-1" onClick={()=>navigator.clipboard.writeText(note)}>Copy to clipboard</button></div></div>;
}

function Checklist({ savePerson }: any) {
  const [checks, setChecks] = useState([false, false, false, false, false]);
  useEffect(() => {
    savePerson({ cleanup_note_added: checks.every(Boolean) });
  }, [checks, savePerson]);
  const labels = ["Copied cleanup note into Ancestry profile Notes", "Attached sources marked Keep", "Removed or detached sources marked No", "Corrected main facts based on research", "Updated birth/death dates if needed"];
  return <div className="space-y-2">{labels.map((label, i) => <label key={label} className="flex items-center gap-2"><input type="checkbox" checked={checks[i]} onChange={(e)=>setChecks((prev)=>prev.map((v,idx)=>idx===i?e.target.checked:v))} />{label}</label>)}</div>;
}

function NextStepSection({ personId, person, nextSteps, refresh, savePerson }: any) {
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("Medium");
  return <div className="space-y-3"><div className="space-y-2">{nextSteps.map((n: any) => <div key={n.id} className="rounded border p-2 text-sm">{n.task} ({n.priority})</div>)}</div><input className="w-full rounded border p-2" placeholder="Task" value={task} onChange={(e)=>setTask(e.target.value)} /><select className="w-full rounded border p-2" value={priority} onChange={(e)=>setPriority(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select><button className="rounded bg-[#2F75B6] px-3 py-2 text-white" onClick={async()=>{await fetch('/api/nextsteps',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ person_id: personId, person_name: person.full_name, task, priority })}); setTask(''); refresh();}}>Add next step</button><button className="rounded bg-blue-700 px-3 py-2 text-white" onClick={async()=>{await savePerson({ status: 'Done for Now', finished_at: new Date().toISOString() }); refresh();}}>Mark as Done for Now</button></div>;
}
