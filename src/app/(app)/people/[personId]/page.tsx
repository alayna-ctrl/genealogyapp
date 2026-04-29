"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AppShell } from "@/components/app-shell";
import { PersonCard } from "@/components/PersonCard";
import { QualityTierBadge } from "@/components/QualityTierBadge";
import { StepProgressBar } from "@/components/StepProgressBar";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { detectTier, inferSourceSite } from "@/lib/source-utils";

const STEPS = ["Snapshot", "Source Review", "Relationship Check", "Hints + Searches", "Evidence Summary", "Update Ancestry", "Next Steps"];

const RELATIONSHIP_SUGGESTIONS: Record<string, string> = {
  Spouse: "marriage record, census showing them together, obituary, children's records naming both parents",
  "Connecting Child": "census with child in household, child's birth record, child's death cert naming both parents, obituary",
  Father: "birth/baptism record naming father, census as child in father's household, death cert (lead only)",
  Mother: "birth/baptism record naming mother, census as child in mother's household, marriage record naming bride's parents",
};

export default function PersonWorkflowPage({ params }: { params: Promise<{ personId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personId, setPersonId] = useState("");
  const [bundle, setBundle] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [profileText, setProfileText] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [parsingDocument, setParsingDocument] = useState(false);
  const [recordText, setRecordText] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [showNegativeForm, setShowNegativeForm] = useState(false);
  const [negativeForm, setNegativeForm] = useState({ type: "Manual Search", decision: "Logged - Nothing Found", site: "", search_terms: "", result_description: "" });
  const [parsedProfile, setParsedProfile] = useState<any | null>(null);
  const [connectingChildSelection, setConnectingChildSelection] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [quickSourceText, setQuickSourceText] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const missingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { params.then((p) => setPersonId(p.personId)); }, [params]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (personId) fetchData(); }, [personId]);

  async function fetchData() {
    const data = await fetch(`/api/people/${personId}`).then((r) => r.json());
    setBundle(data);
    const action = searchParams.get("action");
    if (action === "add-source") {
      setStep(2);
      return;
    }
    if (action === "log-search") {
      setStep(4);
      return;
    }
    setStep(data.person.current_step);
  }

  async function savePersonField(field: string, value: any) {
    await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSavedField(field);
    setToast({ kind: "success", text: "Saved." });
    setTimeout(() => setToast(null), 2000);
    setTimeout(() => setSavedField((prev) => (prev === field ? null : prev)), 2000);
    fetchData();
  }

  async function advanceStep() {
    setAdvancing(true);
    const res = await fetch(`/api/people/${personId}/advance-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStep: Math.min(7, step + 1) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMissing(data.missing ?? [data.error]);
      setRequirements(data.requirements ?? []);
      setTimeout(() => missingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 10);
      setAdvancing(false);
      return;
    }
    setMissing([]);
    setRequirements([]);
    setStep(data.current_step);
    setToast({ kind: "success", text: `Moved to Step ${data.current_step}.` });
    setTimeout(() => setToast(null), 2500);
    setAdvancing(false);
    fetchData();
  }

  function relationshipCompleteness(rel: any) {
    return {
      hasName: Boolean(rel.related_person_name?.trim()),
      hasStatus: Boolean(rel.status?.trim()),
      hasEvidence: Boolean(rel.evidence_summary?.trim()),
    };
  }

  async function saveRelationship(rel: any, patch: Record<string, unknown>) {
    const payload = { ...patch };
    const type = (patch.relationship_type as string) || rel.relationship_type;
    if (RELATIONSHIP_SUGGESTIONS[type]) payload.suggested_searches = RELATIONSHIP_SUGGESTIONS[type];
    await fetch(`/api/relationships/${rel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    fetchData();
  }

  async function parseProfile() {
    const parsed = await fetch("/api/parse/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: profileText }),
    }).then((r) => r.json());
    setParsedProfile(parsed);
    setConnectingChildSelection(parsed.children?.[0] ?? "");
  }

  async function parseProfileDocument() {
    if (!profileFile) return;
    setParsingDocument(true);
    const form = new FormData();
    form.append("file", profileFile);
    const res = await fetch("/api/parse/document", {
      method: "POST",
      body: form,
    });
    const payload = await res.json();
    setParsingDocument(false);
    if (!res.ok) {
      setToast({ kind: "error", text: payload.error ?? "Could not parse uploaded document." });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setProfileText(payload.text ?? "");
    setParsedProfile(payload.parsed ?? null);
    setConnectingChildSelection(payload.parsed?.children?.[0] ?? "");
    setToast({ kind: "success", text: `Parsed document: ${profileFile.name}` });
    setTimeout(() => setToast(null), 2500);
  }

  async function confirmParsedProfileApply(person: any) {
    if (!parsedProfile) return;
    await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: parsedProfile.name || person.full_name,
        birth_date: parsedProfile.birth || person.birth_date,
        death_date: parsedProfile.death || person.death_date,
        spouse_name: parsedProfile.spouse || person.spouse_name,
        marriage_date: parsedProfile.marriageDate || person.marriage_date,
        father_name: parsedProfile.father || person.father_name,
        mother_name: parsedProfile.mother || person.mother_name,
        connecting_child: connectingChildSelection || person.connecting_child,
      }),
    });

    let created = 0;
    for (const sourceTitle of parsedProfile.keySources ?? []) {
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
          person_name: parsedProfile.name || person.full_name,
          source_title: sourceTitle,
          source_quality_tier: detectTier(sourceTitle),
          keep_decision: "Maybe",
          downloaded: false,
        }),
      });
      created += 1;
    }

    if ((parsedProfile.batchSources ?? []).length > 0) {
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
          person_name: parsedProfile.name || person.full_name,
          source_title: "Multiple index sources",
          notes: (parsedProfile.batchSources ?? []).join("; "),
          source_quality_tier: "Derivative Record",
          keep_decision: "Clue Only",
          downloaded: false,
        }),
      });
      created += 1;
    }

    setToast({ kind: "success", text: `Profile applied. Created ${created} source row(s).` });
    setTimeout(() => setToast(null), 3000);
    setParsedProfile(null);
    setProfileText("");
    fetchData();
  }

  async function quickAddSources(keepDecision = "Maybe") {
    if (!quickSourceText.trim()) return;
    setSavingSource(true);
    const res = await fetch("/api/sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        person_name: person.full_name,
        raw_text: quickSourceText,
        keep_decision: keepDecision,
      }),
    });
    const payload = await res.json();
    setSavingSource(false);
    if (!res.ok) {
      setToast({ kind: "error", text: payload.error ?? "Bulk source import failed." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast({ kind: "success", text: `Quick add complete: created ${payload.created_count ?? 0}, skipped ${payload.skipped_count ?? 0}.` });
    setTimeout(() => setToast(null), 3500);
    setQuickSourceText("");
    fetchData();
  }

  if (!bundle) return <AppShell><p>Loading...</p></AppShell>;

  const person = bundle.person;
  const sources = bundle.sources ?? [];
  const relationships = bundle.relationships ?? [];
  const hints = bundle.hints ?? [];
  const evidence = bundle.evidence ?? [];
  const nextSteps = bundle.next_steps ?? [];
  const audit = bundle.audit ?? {
    scorecard: [],
    proofMatrix: [],
    missingFacts: [],
    weakProofs: [],
    conflicts: [],
    suggestedSearches: [],
    summary: { source_sites: [] },
  };

  const connectingChildWarning = relationships.find(
    (r: any) =>
      r.relationship_type === "Connecting Child" &&
      (r.status === "Needs Proof" || r.status === "Probably Wrong"),
  );

  async function deleteCurrentPerson() {
    const ok = window.confirm(`Delete ${person.full_name}? This will remove all related data for this person.`);
    if (!ok) return;
    const res = await fetch(`/api/people/${personId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/people");
      router.refresh();
    } else {
      window.alert("Could not delete person. Please try again.");
    }
  }

  async function createStandardRelationships() {
    const needed = ["Spouse", "Connecting Child", "Father", "Mother"].filter(
      (type) => !relationships.some((r: any) => r.relationship_type === type),
    );
    for (const relationship_type of needed) {
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
          person_name: person.full_name,
          relationship_type,
          status: "Needs Proof",
        }),
      });
    }
    setToast({ kind: "success", text: `Added ${needed.length} standard relationship card(s).` });
    setTimeout(() => setToast(null), 3000);
    fetchData();
  }

  async function setAsStartingPerson() {
    const res = await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set_as_starting_person: true }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast({ kind: "error", text: payload.error ?? "Could not set starting person." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast({ kind: "success", text: `${person.full_name} is now the starting person.` });
    setTimeout(() => setToast(null), 3000);
    fetchData();
  }

  const openTaskCount = nextSteps.filter((n: any) => !n.done).length;

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-3">
          <PersonCard person={person} />

          {/* Compact Research Status strip */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Facts Proven</p>
              <span className="ui-chip bg-indigo-100 text-indigo-900 text-xs">
                {audit.proofMatrix.filter((i: any) => i.status === "Proven").length}/{audit.proofMatrix.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {audit.proofMatrix.map((item: any) => (
                <span
                  key={item.key}
                  title={`${item.label}: ${item.status}`}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${item.status === "Proven" ? "bg-green-100 text-green-900" : item.status === "Partial" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"}`}
                >
                  <span className={`h-2 w-2 rounded-full ${item.status === "Proven" ? "bg-green-500" : item.status === "Partial" ? "bg-amber-400" : "bg-red-400"}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Guided step nav */}
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3">
            <StepProgressBar currentStep={step} totalSteps={7} isFastTrack={person.is_fast_track} />
            <div className="mt-3 space-y-1">
              {STEPS.map((name, i) => {
                const stepNum = i + 1;
                const isDone = stepNum < step;
                const isCurrent = stepNum === step;
                return (
                  <button
                    key={name}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${isCurrent ? "border border-fuchsia-200 bg-fuchsia-100/80 font-medium" : "hover:bg-white/70"}`}
                    onClick={() => setStep(stepNum)}
                  >
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${isDone ? "bg-green-400" : isCurrent ? "bg-fuchsia-400" : "bg-slate-300"}`} />
                    <span>Step {stepNum}: {name}</span>
                  </button>
                );
              })}
            </div>
            {openTaskCount > 0 && (
              <button
                className="mt-3 w-full rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 hover:bg-emerald-100"
                onClick={() => setStep(7)}
              >
                {openTaskCount} open task{openTaskCount !== 1 ? "s" : ""} — view in Step 7
              </button>
            )}
          </div>
        </aside>

        <section className="space-y-4 rounded-xl border border-rose-100 bg-rose-50/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold text-[#1F3864]">Step {step}: {STEPS[step - 1]}</h1>
            <div className="flex gap-2">
              {person.generation_number === 0 ? (
                <span className="ui-chip border border-violet-200 bg-violet-100/70 text-violet-900">Starting Person</span>
              ) : (
                <button className="ui-btn-soft" onClick={setAsStartingPerson}>Set as Starting Person</button>
              )}
              <button className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" onClick={deleteCurrentPerson}>Delete Person</button>
            </div>
          </div>
          {toast ? <div className={toast.kind === "success" ? "ui-alert-success" : "ui-alert-error"}>{toast.text}</div> : null}

          {step === 1 && (
            <div className="space-y-3">
              <label className="text-sm">
                Full Name
                <input className="ui-input mt-1" defaultValue={person.full_name ?? ""} onBlur={(e) => savePersonField("full_name", e.currentTarget.value)} />
                {savedField === "full_name" ? <span className="text-xs text-green-700">Saved ✓</span> : null}
              </label>
              <label className="text-sm">
                Main Research Question
                <textarea
                  className="ui-input mt-1"
                  defaultValue={person.main_question ?? ""}
                  onBlur={(e) => savePersonField("main_question", e.currentTarget.value)}
                />
                {savedField === "main_question" ? <span className="text-xs text-green-700">Saved ✓</span> : null}
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                {[["birth_date", "Birth Date"], ["birth_place", "Birth Place"], ["death_date", "Death Date"], ["death_place", "Death Place"], ["spouse_name", "Spouse"], ["marriage_date", "Marriage Date"], ["father_name", "Father"], ["mother_name", "Mother"], ["connecting_child", "Connecting Child"], ["ancestry_profile_url", "Ancestry URL"]].map(([field, label]) => (
                  <label key={field} className="text-sm">
                    {label}
                    <input className="ui-input mt-1" defaultValue={person[field] ?? ""} onBlur={(e) => savePersonField(field, e.currentTarget.value)} />
                    {savedField === field ? <span className="text-xs text-green-700">Saved ✓</span> : null}
                  </label>
                ))}
              </div>
              <label className="text-sm">
                Concern
                <textarea className="ui-input mt-1" defaultValue={person.concern ?? ""} onBlur={(e) => savePersonField("concern", e.currentTarget.value)} />
                {savedField === "concern" ? <span className="text-xs text-green-700">Saved ✓</span> : null}
              </label>

              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                <p className="font-semibold">Parse Ancestry Profile</p>
                <textarea className="ui-input mt-2 h-28" value={profileText} onChange={(e) => setProfileText(e.target.value)} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button className="ui-btn-primary" onClick={parseProfile}>Parse Text</button>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="text-xs"
                    onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)}
                  />
                  <button className="ui-btn-soft disabled:opacity-60" disabled={!profileFile || parsingDocument} onClick={parseProfileDocument}>
                    {parsingDocument ? "Parsing..." : "Parse Uploaded File"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">PDF with selectable text is supported now. Image OCR support is next.</p>

                {parsedProfile && (
                  <div className="mt-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-sm">
                    <p><strong>Name:</strong> {parsedProfile.name || "-"}</p>
                    <p><strong>Birth:</strong> {parsedProfile.birth || "-"}</p>
                    <p><strong>Death:</strong> {parsedProfile.death || "-"}</p>
                    <p><strong>Spouse:</strong> {parsedProfile.spouse || "-"}</p>
                    <p><strong>Parents:</strong> {parsedProfile.parentsFormatted || "-"}</p>
                    {(parsedProfile.children ?? []).length > 0 && (
                      <label className="block">
                        Connecting child
                        <select className="ui-input mt-1" value={connectingChildSelection} onChange={(e) => setConnectingChildSelection(e.target.value)}>
                          {(parsedProfile.children ?? []).map((child: string) => <option key={child}>{child}</option>)}
                        </select>
                      </label>
                    )}
                    <p><strong>Key sources found:</strong> {(parsedProfile.keySources ?? []).length}</p>
                    <p><strong>Batch sources found:</strong> {(parsedProfile.batchSources ?? []).length}</p>
                    <button className="ui-btn-success" onClick={() => confirmParsedProfileApply(person)}>Confirm + Fill Workspace</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50/35 p-3">
                <p className="font-semibold">Quick Add Sources</p>
                <p className="mt-1 text-xs text-slate-600">Paste one source per line (title and optional URL).</p>
                <textarea className="ui-input mt-2 h-24" value={quickSourceText} onChange={(e) => setQuickSourceText(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="ui-btn-primary disabled:opacity-60" disabled={savingSource} onClick={() => quickAddSources("Maybe")}>Import</button>
                  <button className="rounded border border-amber-200 bg-amber-50 px-3 py-2 disabled:opacity-60" disabled={savingSource} onClick={() => quickAddSources("Clue Only")}>Set all to Clue Only</button>
                  <button className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 disabled:opacity-60" disabled={savingSource} onClick={() => quickAddSources("Keep")}>Set all to Keep</button>
                </div>
              </div>

              {sources.map((source: any) => (
                <div key={source.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm">
                  <button className="flex w-full items-center justify-between text-left" onClick={() => setExpandedSourceId((id) => (id === source.id ? null : source.id))}>
                    <span className="font-semibold">{source.source_title}</span>
                    <span>{expandedSourceId === source.id ? "▾" : "▸"}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><QualityTierBadge tier={source.source_quality_tier ?? "Unknown"} /><span className="ui-chip bg-fuchsia-100 text-fuchsia-900">Keep: {source.keep_decision ?? "Maybe"}</span><span className="ui-chip bg-cyan-100 text-cyan-900">Needs review: {source.what_it_proves ? "No" : "Yes"}</span></div>
                  <div className="mt-1 text-xs text-slate-500">Site: {inferSourceSite(source)}</div>
                  {source.source_quality_tier === "Family Tree / Other" && <p className="mt-2 rounded bg-red-100 p-2 text-red-900">⚠ This is another person&apos;s tree - NOT evidence. Find the real record this tree claims to prove.</p>}

                  {expandedSourceId === source.id && (
                    <div className="mt-3 space-y-2">
                      <textarea className="ui-input" value={source.what_it_says ?? ""} onChange={(e) => setBundle((prev: any) => ({ ...prev, sources: prev.sources.map((s: any) => s.id === source.id ? { ...s, what_it_says: e.target.value } : s) }))} onBlur={(e) => fetch(`/api/sources/${source.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what_it_says: e.currentTarget.value }) })} placeholder="What It Says" />
                      <textarea className="ui-input" value={source.what_it_proves ?? ""} onChange={(e) => setBundle((prev: any) => ({ ...prev, sources: prev.sources.map((s: any) => s.id === source.id ? { ...s, what_it_proves: e.target.value } : s) }))} onBlur={(e) => fetch(`/api/sources/${source.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what_it_proves: e.currentTarget.value }) })} placeholder="What It Proves" />
                      <textarea className="ui-input" value={source.what_it_does_not_prove ?? ""} onChange={(e) => setBundle((prev: any) => ({ ...prev, sources: prev.sources.map((s: any) => s.id === source.id ? { ...s, what_it_does_not_prove: e.target.value } : s) }))} onBlur={(e) => fetch(`/api/sources/${source.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what_it_does_not_prove: e.currentTarget.value }) })} placeholder="What It Does NOT Prove" />
                      <select className="ui-input" value={source.keep_decision ?? "Maybe"} onChange={async (e) => { if (source.source_quality_tier === "Family Tree / Other" && e.target.value === "Keep") { const okay = window.confirm("This source is Family Tree / Other and should usually not be kept as evidence. Keep anyway?"); if (!okay) return; } await fetch(`/api/sources/${source.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keep_decision: e.target.value }) }); fetchData(); }}>
                        <option>Keep</option><option>Maybe</option><option>No</option><option>Clue Only</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-xl border border-violet-100 bg-violet-50/35 p-3">
                <p className="font-semibold">Parse Ancestry Record Text</p>
                <p className="mt-1 text-xs text-slate-600">Paste record details from Ancestry or FamilySearch. Best results come from a detail tab / full record text block.</p>
                <textarea className="ui-input mt-2 h-24" value={recordText} onChange={(e) => setRecordText(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button className="rounded border border-slate-300 bg-white/70 px-3 py-2 disabled:opacity-60" disabled={savingSource} onClick={async () => { setSavingSource(true); await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, source_title: "New Source", keep_decision: "Maybe", source_quality_tier: "Unknown", downloaded: false }) }); setSavingSource(false); fetchData(); }}>Add Blank Source</button>
                  <button className="ui-btn-primary disabled:opacity-60" disabled={savingSource} onClick={async () => { setSavingSource(true); const parsed = await fetch("/api/parse/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: recordText }) }).then((r) => r.json()); await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, source_title: `${parsed.recordType} Parsed Source`, what_it_says: parsed.says, what_it_proves: parsed.proves, what_it_does_not_prove: parsed.notProves, source_quality_tier: parsed.recordType === "Census" ? "Original Record" : "Unknown", keep_decision: "Maybe", downloaded: false }) }); setSavingSource(false); setToast({ kind: "success", text: `Parsed ${parsed.recordType} (${parsed.confidence} confidence).` }); setTimeout(() => setToast(null), 3000); fetchData(); }}>Parse + Save Source</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <button className="rounded border border-violet-200 bg-violet-50 px-3 py-2 text-sm" onClick={createStandardRelationships}>Create standard relationship set</button>
              {relationships.filter((r: any) => ["Spouse", "Connecting Child", "Father", "Mother"].includes(r.relationship_type)).map((rel: any) => (
                <div key={rel.id} className="rounded border p-3">
                  <p className="font-semibold">{rel.relationship_type}</p>
                  <div className="mt-1 flex gap-2 text-xs">
                    <span className="ui-chip-soft">Name: {relationshipCompleteness(rel).hasName ? "Set" : "Missing"}</span>
                    <span className="ui-chip-soft">Status: {relationshipCompleteness(rel).hasStatus ? "Set" : "Missing"}</span>
                    <span className="ui-chip-soft">Evidence: {relationshipCompleteness(rel).hasEvidence ? "Added" : "Missing"}</span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input className="ui-input" placeholder="Related person name" defaultValue={rel.related_person_name ?? ""} onBlur={(e) => saveRelationship(rel, { related_person_name: e.currentTarget.value })} />
                    <select className="ui-input" defaultValue={rel.status} onChange={(e) => saveRelationship(rel, { status: e.currentTarget.value })}>
                      <option>Verified</option><option>Likely</option><option>Needs Proof</option><option>Conflict</option><option>Probably Wrong</option>
                    </select>
                    <textarea className="ui-input" placeholder="Evidence" defaultValue={rel.evidence_summary ?? ""} onBlur={(e) => saveRelationship(rel, { evidence_summary: e.currentTarget.value })} />
                    <textarea className="ui-input" placeholder="Problems" defaultValue={rel.problems ?? ""} onBlur={(e) => saveRelationship(rel, { problems: e.currentTarget.value })} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Suggested searches: {RELATIONSHIP_SUGGESTIONS[rel.relationship_type] || rel.suggested_searches || ""}</p>
                </div>
              ))}
              {connectingChildWarning && <div className="rounded bg-red-100 p-2 text-sm text-red-900">🚩 STOP: Do not go further back in this family line until the connecting child link is verified.</div>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <button className="rounded border border-cyan-200 bg-cyan-50 px-3 py-2" onClick={() => setShowNegativeForm((v) => !v)}>Log a Negative Search</button>
              <div className="flex flex-wrap gap-2">
                <button className="ui-chip border border-slate-300 bg-white/70 text-slate-700" onClick={() => setNegativeForm((f) => ({ ...f, site: "Ancestry", search_terms: `${person.full_name} census`, result_description: "Searched expected census year and place; no convincing match." }))}>Prefill: Missing census</button>
                <button className="ui-chip border border-slate-300 bg-white/70 text-slate-700" onClick={() => setNegativeForm((f) => ({ ...f, site: "FamilySearch", search_terms: `${person.full_name} birth`, result_description: "Searched indexed births with variants; no reliable candidate." }))}>Prefill: Missing birth</button>
              </div>
              {showNegativeForm && (
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className="ui-input" value={negativeForm.type} readOnly />
                    <input className="ui-input" value={negativeForm.decision} readOnly />
                    <input className="ui-input" placeholder="Site" value={negativeForm.site} onChange={(e) => setNegativeForm((f) => ({ ...f, site: e.target.value }))} />
                    <input className="ui-input" placeholder="What you searched for" value={negativeForm.search_terms} onChange={(e) => setNegativeForm((f) => ({ ...f, search_terms: e.target.value }))} />
                    <textarea className="ui-input md:col-span-2" placeholder="Result description" value={negativeForm.result_description} onChange={(e) => setNegativeForm((f) => ({ ...f, result_description: e.target.value }))} />
                  </div>
                  <button className="ui-btn-primary mt-2" onClick={async () => {
                    await fetch("/api/hints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...negativeForm, person_id: personId, person_name: person.full_name }) });
                    setNegativeForm({ type: "Manual Search", decision: "Logged - Nothing Found", site: "", search_terms: "", result_description: "" });
                    setShowNegativeForm(false);
                    fetchData();
                  }}>Save Negative Search</button>
                </div>
              )}
              {hints.map((hint: any) => <div key={hint.id} className="rounded-xl border border-slate-200 bg-white/70 p-2 text-sm">{hint.type} - {hint.decision} - {hint.result_description}</div>)}
            </div>
          )}

          {step === 5 && !person.is_fast_track && <SimpleEvidence key={evidence[0]?.id ?? "new-evidence"} personId={personId} person={person} current={evidence[0]} refresh={fetchData} />}
          {step === 6 && !person.is_fast_track && <Checklist savePerson={savePersonField} />}
          {step === 7 && <NextStepSection personId={personId} person={person} nextSteps={nextSteps} refresh={fetchData} savePerson={savePersonField} />}

          {missing.length > 0 && (
            <div ref={missingRef} className="rounded bg-red-100 p-2 text-sm text-red-900">
              <p className="font-semibold">Cannot advance yet:</p>
              <ul className="ml-4 list-disc">
                {missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
              {requirements.length > 0 ? (
                <div className="mt-2 rounded bg-white/70 p-2 text-xs text-red-950">
                  {requirements.map((r: any) => (
                    <div key={`${r.step}-${r.label}`}>{r.met ? "✓" : "•"} Step {r.step}: {r.label}</div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-between">
            <button className="rounded border border-slate-300 bg-white/70 px-3 py-2" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
            <button className="ui-btn-success disabled:opacity-60" onClick={advanceStep} disabled={advancing}>
              {advancing ? "Advancing..." : "Advance Step"}
            </button>
          </div>

          <AuditDrawer audit={audit} person={person} sources={sources} relationships={relationships} />
        </section>
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

  return <div className="grid gap-3 md:grid-cols-2"><div className="space-y-2">{Object.entries(form).map(([k, v]) => k === "status" ? <select key={k} className="w-full rounded border p-2" value={String(v)} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Verified</option><option>Likely</option><option>Needs Proof</option><option>Conflict</option><option>Probably Wrong</option><option>Done for Now</option></select> : <textarea key={k} className="h-20 w-full rounded border p-2" placeholder={k.replaceAll("_", " ")} value={String(v)} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />)}<button className="rounded bg-indigo-300 px-3 py-2 text-indigo-950 hover:bg-indigo-200" onClick={async () => { if (current?.id) { await fetch(`/api/evidence/${current.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); } else { await fetch("/api/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, person_id: personId, person_name: person.full_name }) }); } refresh(); }}>Save</button></div><div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm whitespace-pre-wrap">{note}<button className="mt-3 rounded border border-slate-300 bg-white/60 px-2 py-1" onClick={() => navigator.clipboard.writeText(note)}>Copy to clipboard</button></div></div>;
}

function Checklist({ savePerson }: any) {
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    savePerson("cleanup_note_added", checks.every(Boolean));
  }, [checks, savePerson]);
  const labels = ["Copied cleanup note into Ancestry profile Notes", "Attached sources marked Keep", "Removed or detached sources marked No", "Corrected main facts based on research", "Updated birth/death dates if needed"];
  return <div className="space-y-2">{labels.map((label, i) => <label key={label} className="flex items-center gap-2"><input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((prev) => prev.map((v, idx) => idx === i ? e.target.checked : v))} />{label}</label>)}</div>;
}

function NextStepSection({ personId, person, nextSteps, refresh, savePerson }: any) {
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("Medium");
  return <div className="space-y-3"><div className="space-y-2">{nextSteps.map((n: any) => <div key={n.id} className="rounded-xl border border-slate-200 bg-white/70 p-2 text-sm">{n.task} ({n.priority})</div>)}</div><input className="w-full rounded border p-2" placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} /><select className="w-full rounded border p-2" value={priority} onChange={(e) => setPriority(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select><button className="rounded bg-indigo-300 px-3 py-2 text-indigo-950 hover:bg-indigo-200" onClick={async () => { await fetch("/api/nextsteps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: personId, person_name: person.full_name, task, priority }) }); setTask(""); refresh(); }}>Add next step</button><button className="rounded bg-emerald-300 px-3 py-2 text-emerald-950 hover:bg-emerald-200" onClick={async () => { await savePerson("status", "Done for Now"); await savePerson("finished_at", new Date().toISOString()); refresh(); }}>Mark as Done for Now</button></div>;
}

type AuditDrawerProps = { audit: any; person: any; sources: any[]; relationships: any[] };

function AuditDrawer({ audit, person, sources, relationships }: AuditDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  const conflictCount = audit.conflicts?.length ?? 0;
  const missingCount = audit.missingFacts?.length ?? 0;
  const weakCount = audit.weakProofs?.length ?? 0;
  const allClear = conflictCount + missingCount + weakCount === 0;

  // Red flags inline (extracted from RedFlagPanel logic)
  const flags: { level: "red" | "yellow"; message: string }[] = [];
  const parentRelated = sources.filter((s: any) => /parent|father|mother/i.test(s.what_it_proves ?? ""));
  if (parentRelated.length > 0 && parentRelated.every((s: any) => s.source_quality_tier === "Family Tree / Other" || s.source_quality_tier === "Find A Grave")) {
    flags.push({ level: "red", message: "🚩 Parents not proven by any original record. Do not go further back." });
  }
  const birthYear = person.birth_date?.match(/(\d{4})/)?.[1] ? Number(person.birth_date.match(/(\d{4})/)[1]) : null;
  const deathYear = person.death_date?.match(/(\d{4})/)?.[1] ? Number(person.death_date.match(/(\d{4})/)[1]) : null;
  if (birthYear && deathYear && deathYear < birthYear) flags.push({ level: "red", message: "🚩 Impossible dates: death year is before birth year." });
  if (birthYear && birthYear < 1500) flags.push({ level: "red", message: "🚩 Birth year appears impossible (<1500)." });
  if (person.concern && !person.concern.startsWith("[FAST TRACK]")) flags.push({ level: "yellow", message: `⚠ Open concern: ${person.concern}` });
  relationships.forEach((rel: any) => {
    if (rel.status === "Probably Wrong") flags.push({ level: "red", message: `🚩 ${rel.relationship_type} relationship marked Probably Wrong.` });
    if (rel.status === "Conflict") flags.push({ level: "yellow", message: `⚠ ${rel.relationship_type} relationship marked Conflict.` });
  });
  const connectingChild = relationships.find((r: any) => r.relationship_type === "Connecting Child");
  if (connectingChild && (connectingChild.status === "Needs Proof" || connectingChild.status === "Probably Wrong")) {
    flags.push({ level: "red", message: "🚩 Connecting child not verified. Do not add ancestors until this link is proven." });
  }

  const redFlagCount = flags.filter((f) => f.level === "red").length;
  const totalIssues = conflictCount + missingCount + weakCount + redFlagCount;

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold text-amber-900">
          {allClear && redFlagCount === 0 ? "Audit — No issues found ✓" : `Audit — ${totalIssues} issue${totalIssues !== 1 ? "s" : ""}: ${conflictCount > 0 ? `${conflictCount} conflict${conflictCount !== 1 ? "s" : ""}` : ""}${conflictCount > 0 && (missingCount > 0 || weakCount > 0 || redFlagCount > 0) ? " · " : ""}${missingCount > 0 ? `${missingCount} missing` : ""}${missingCount > 0 && (weakCount > 0 || redFlagCount > 0) ? " · " : ""}${weakCount > 0 ? `${weakCount} weak` : ""}${weakCount > 0 && redFlagCount > 0 ? " · " : ""}${redFlagCount > 0 ? `${redFlagCount} flag${redFlagCount !== 1 ? "s" : ""}` : ""}`}
        </span>
        <span className="text-slate-500">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="border-t border-amber-100 px-4 pb-4 pt-3 space-y-4 text-sm">
          {/* Red flags */}
          {flags.length > 0 && (
            <div>
              <p className="font-semibold text-red-800 mb-1">Red Flags</p>
              <div className="space-y-1">
                {flags.map((flag, i) => (
                  <div key={i} className={`rounded p-2 text-xs ${flag.level === "red" ? "bg-red-100 text-red-900" : "bg-yellow-100 text-yellow-900"}`}>{flag.message}</div>
                ))}
              </div>
            </div>
          )}

          {/* Proof matrix */}
          {audit.proofMatrix?.length > 0 && (
            <div>
              <p className="font-semibold text-violet-800 mb-1">Proof Matrix</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {audit.proofMatrix.map((item: any) => (
                  <div key={item.key} className="rounded border border-violet-100 bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs">{item.label}</span>
                      <span className={`ui-chip text-xs ${item.status === "Proven" ? "bg-green-100 text-green-900" : item.status === "Partial" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"}`}>{item.status}</span>
                    </div>
                    {item.supporting?.length > 0 ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">Sources: {item.supporting.join("; ")}</p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-slate-400">No supporting source tagged yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit warnings */}
          {(missingCount > 0 || weakCount > 0 || conflictCount > 0 || (audit.suggestedSearches?.length ?? 0) > 0) && (
            <div>
              <p className="font-semibold text-amber-800 mb-1">Audit Warnings</p>
              <div className="space-y-2">
                {audit.missingFacts?.length > 0 && <div><p className="font-medium text-amber-800 text-xs">Missing important data</p>{audit.missingFacts.map((item: string) => <div key={item} className="text-slate-700 text-xs">{item}</div>)}</div>}
                {audit.weakProofs?.length > 0 && <div><p className="font-medium text-amber-800 text-xs">Weak proof</p>{audit.weakProofs.map((item: string) => <div key={item} className="text-slate-700 text-xs">{item}</div>)}</div>}
                {audit.conflicts?.length > 0 && <div><p className="font-medium text-red-800 text-xs">Conflicts</p>{audit.conflicts.map((item: string) => <div key={item} className="text-slate-700 text-xs">{item}</div>)}</div>}
                {audit.suggestedSearches?.length > 0 && <div><p className="font-medium text-slate-800 text-xs">Suggested next checks</p>{audit.suggestedSearches.map((item: string) => <div key={item} className="text-slate-700 text-xs">{item}</div>)}</div>}
              </div>
            </div>
          )}

          {allClear && redFlagCount === 0 && (
            <p className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">No issues found. This person looks well-researched!</p>
          )}
        </div>
      )}
    </div>
  );
}
