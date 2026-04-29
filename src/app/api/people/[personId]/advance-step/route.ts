import { requireUser } from "@/lib/api";
import { getWorkflowRequirements } from "@/lib/workflow-rules";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { personId } = await params;
  const { supabase, user } = auth;
  const { newStep } = await request.json();

  const personRes = await supabase.from("people").select("*").eq("user_id", user.id).eq("person_id", personId).single();
  if (personRes.error || !personRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const person = personRes.data;

  if (typeof newStep !== "number") return NextResponse.json({ error: "newStep is required" }, { status: 400 });
  if (newStep < person.current_step) {
    const { data, error } = await supabase.from("people").update({ current_step: newStep, last_worked_at: new Date().toISOString() }).eq("user_id", user.id).eq("person_id", personId).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const requirements = await getWorkflowRequirements({
    supabase,
    userId: user.id,
    personId,
    newStep,
    isFastTrack: person.is_fast_track,
    mainQuestion: person.main_question,
    cleanupNoteAdded: person.cleanup_note_added,
  });
  const missing = requirements.filter((r) => !r.met).map((r) => `Step ${r.step}: ${r.label}`);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Missing requirements", missing, requirements },
      { status: 422 },
    );
  }

  const { data, error } = await supabase.from("people").update({ current_step: newStep, last_worked_at: new Date().toISOString() }).eq("user_id", user.id).eq("person_id", personId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
