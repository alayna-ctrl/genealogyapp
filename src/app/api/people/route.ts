import { requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", user.id)
    .order("last_worked_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();

  const { data: existing, error: existingError } = await supabase
    .from("people")
    .select("person_id")
    .eq("user_id", user.id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

  const max = (existing ?? []).reduce((acc, row) => {
    const n = Number(String(row.person_id).replace("P", ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  const personId = `P${String(max + 1).padStart(3, "0")}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: user.id,
      person_id: personId,
      full_name: body.full_name,
      main_question: body.main_question ?? null,
      generation_number: body.generation_number ?? null,
      is_direct_line: !!body.is_direct_line,
      is_fast_track: !!body.is_fast_track,
      status: "Needs Proof",
      current_step: 1,
      started_at: now,
      last_worked_at: now,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const placeholders = ["Spouse", "Connecting Child", "Father", "Mother"].map((relationshipType) => ({
    user_id: user.id,
    person_id: personId,
    person_name: body.full_name,
    relationship_type: relationshipType,
    status: "Needs Proof",
    claim: `${relationshipType} relationship for ${body.full_name}`,
  }));
  await supabase.from("relationships").insert(placeholders);

  return NextResponse.json(data, { status: 201 });
}
