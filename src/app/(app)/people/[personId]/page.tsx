import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const supabase = await createClient();
  const { data: person } = await supabase
    .from("people")
    .select("person_id, full_name, current_step, status, main_question")
    .eq("person_id", personId)
    .single();

  if (!person) notFound();

  return (
    <AppShell>
      <div className="rounded border bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#1F3864]">{person.full_name}</h1>
        <p className="mt-2 text-sm text-slate-600">Person ID: {person.person_id}</p>
        <p className="text-sm text-slate-600">Current step: {person.current_step}</p>
        <p className="text-sm text-slate-600">Status: {person.status}</p>
        <p className="mt-4 text-sm">Workflow page placeholder for next build phase.</p>
      </div>
    </AppShell>
  );
}
