import { requireUser } from "@/lib/api";
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

  const missing: string[] = [];

  if (newStep >= 2 && !person.main_question) missing.push("Step 2 requires main question");

  if (newStep >= 3) {
    const { count } = await supabase.from("sources").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("person_id", personId);
    if (!count) missing.push("Step 3 requires at least 1 source");
  }

  if (newStep >= 4) {
    const { count } = await supabase.from("relationships").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("person_id", personId);
    if (!count) missing.push("Step 4 requires at least 1 relationship");
  }

  if (newStep >= 5) {
    const { count } = await supabase.from("hints_searches").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("person_id", personId);
    if (!count) missing.push("Step 5 requires at least 1 hint/search");
  }

  if (!person.is_fast_track && newStep >= 6) {
    const { count } = await supabase.from("evidence_summary").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("person_id", personId);
    if (!count) missing.push("Step 6 requires at least 1 evidence summary");
  }

  if (!person.is_fast_track && newStep >= 7 && !person.cleanup_note_added) {
    missing.push("Step 7 requires cleanup_note_added = true");
  }

  if (missing.length > 0) return NextResponse.json({ error: "Missing requirements", missing }, { status: 422 });

  const { data, error } = await supabase.from("people").update({ current_step: newStep, last_worked_at: new Date().toISOString() }).eq("user_id", user.id).eq("person_id", personId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
