"use client";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const questionExamples = [
  "Are his parents [name] and [name] proven by records?",
  "Is this the right person connected to my family?",
  "Is the spouse correct?",
];

export default function NewPersonPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    mainQuestion: "",
    generationNumber: 1,
    isDirectLine: false,
  });

  async function submit() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: peopleRows, error: listError } = await supabase
      .from("people")
      .select("person_id")
      .eq("user_id", user.id);

    if (listError) {
      setLoading(false);
      return;
    }

    const max = (peopleRows ?? []).reduce((acc, row) => {
      const n = Number((row.person_id || "").replace("P", ""));
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    const personId = `P${String(max + 1).padStart(3, "0")}`;

    const { error: insertError } = await supabase.from("people").insert({
      user_id: user.id,
      person_id: personId,
      full_name: form.fullName,
      main_question: form.mainQuestion,
      generation_number: form.generationNumber,
      is_direct_line: form.isDirectLine,
      status: "Needs Proof",
      current_step: 1,
      last_worked_at: new Date().toISOString(),
    });

    if (insertError) {
      setLoading(false);
      return;
    }

    const placeholderRelationships = ["Spouse", "Connecting Child", "Father", "Mother"].map((relationshipType) => ({
      user_id: user.id,
      person_id: personId,
      person_name: form.fullName,
      relationship_type: relationshipType,
      claim: `${relationshipType} relationship for ${form.fullName}`,
      status: "Needs Proof",
    }));

    await supabase.from("relationships").insert(placeholderRelationships);

    router.push(`/people/${personId}`);
    router.refresh();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 rounded border bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#1F3864]">New Person Wizard</h1>
        <p className="text-sm text-slate-600">Step {step} of 4</p>

        {step === 1 && (
          <div className="space-y-2">
            <label className="text-sm">Full name</label>
            <input className="w-full rounded border p-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <label className="text-sm">Main research question</label>
            <textarea className="h-28 w-full rounded border p-2" value={form.mainQuestion} onChange={(e) => setForm({ ...form, mainQuestion: e.target.value })} />
            <div className="rounded border bg-slate-50 p-2 text-xs">
              {questionExamples.map((q) => <p key={q}>- {q}</p>)}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <label className="text-sm">Generation number (1=parent, 2=grandparent)</label>
              <input type="number" className="mt-1 w-full rounded border p-2" value={form.generationNumber} onChange={(e) => setForm({ ...form, generationNumber: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isDirectLine} onChange={(e) => setForm({ ...form, isDirectLine: e.target.checked })} />Direct line</label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2 rounded border bg-slate-50 p-3 text-sm">
            <p><strong>Name:</strong> {form.fullName}</p>
            <p><strong>Main question:</strong> {form.mainQuestion}</p>
            <p><strong>Generation:</strong> {form.generationNumber}</p>
            <p><strong>Direct line:</strong> {form.isDirectLine ? "Yes" : "No"}</p>
          </div>
        )}

        <div className="flex justify-between">
          <button className="rounded border px-3 py-2" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</button>
          {step < 4 ? (
            <button className="rounded bg-[#2F75B6] px-3 py-2 text-white" onClick={() => setStep((s) => Math.min(4, s + 1))}>Next</button>
          ) : (
            <button className="rounded bg-green-700 px-3 py-2 text-white" onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create Person"}</button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
