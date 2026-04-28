import { buildCleanupNote, requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { supabase, user } = auth;
  const body = await request.json();
  const cleanup_note = buildCleanupNote(body);
  const { data, error } = await supabase.from("evidence_summary").update({ ...body, cleanup_note }).eq("user_id", user.id).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
