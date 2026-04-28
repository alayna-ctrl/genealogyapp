import { requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { supabase, user } = auth;
  const body = await request.json();

  const existingRes = await supabase.from("next_steps").select("done").eq("user_id", user.id).eq("id", id).single();
  if (existingRes.error || !existingRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload: Record<string, unknown> = { ...body };
  if (existingRes.data.done === false && body.done === true) payload.done_at = new Date().toISOString();

  const { data, error } = await supabase.from("next_steps").update(payload).eq("user_id", user.id).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { supabase, user } = auth;
  const { error } = await supabase.from("next_steps").delete().eq("user_id", user.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
