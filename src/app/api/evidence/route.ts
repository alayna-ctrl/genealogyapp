import { buildCleanupNote, requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();
  const cleanup_note = buildCleanupNote(body);
  const { data, error } = await supabase.from("evidence_summary").insert({ ...body, user_id: user.id, cleanup_note }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
