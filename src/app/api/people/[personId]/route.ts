import { requireUser } from "@/lib/api";
import { buildPersonAudit } from "@/lib/genealogy-audit";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ personId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { personId } = await params;
  const { supabase, user } = auth;

  const personRes = await supabase.from("people").select("*").eq("user_id", user.id).eq("person_id", personId).single();
  if (personRes.error) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [sources, relationships, hints, evidence, nextSteps] = await Promise.all([
    supabase.from("sources").select("*").eq("user_id", user.id).eq("person_id", personId),
    supabase.from("relationships").select("*").eq("user_id", user.id).eq("person_id", personId),
    supabase.from("hints_searches").select("*").eq("user_id", user.id).eq("person_id", personId),
    supabase.from("evidence_summary").select("*").eq("user_id", user.id).eq("person_id", personId),
    supabase.from("next_steps").select("*").eq("user_id", user.id).eq("person_id", personId),
  ]);

  const audit = buildPersonAudit({
    person: personRes.data,
    sources: sources.data ?? [],
    relationships: relationships.data ?? [],
    hints: hints.data ?? [],
  });

  return NextResponse.json({
    person: personRes.data,
    sources: sources.data ?? [],
    relationships: relationships.data ?? [],
    hints: hints.data ?? [],
    evidence: evidence.data ?? [],
    next_steps: nextSteps.data ?? [],
    audit,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { personId } = await params;
  const { supabase, user } = auth;
  const body = await request.json();
  const setAsStartingPerson = Boolean(body.set_as_starting_person);

  if (setAsStartingPerson) {
    await supabase
      .from("people")
      .update({ generation_number: null })
      .eq("user_id", user.id)
      .eq("generation_number", 0)
      .neq("person_id", personId);
  }

  const { data, error } = await supabase
    .from("people")
    .update({
      ...body,
      ...(setAsStartingPerson ? { generation_number: 0, is_direct_line: true } : {}),
      last_worked_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("person_id", personId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ personId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { personId } = await params;
  const { supabase, user } = auth;

  const { error } = await supabase.from("people").delete().eq("user_id", user.id).eq("person_id", personId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
