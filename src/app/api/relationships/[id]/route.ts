import { requireUser } from "@/lib/api";
import { getRelationshipDefaults } from "@/lib/relationship-utils";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { supabase, user } = auth;
  const body = await request.json();
  const existing = await supabase
    .from("relationships")
    .select("relationship_type, related_person_name, claim, suggested_searches")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (existing.error || !existing.data) {
    return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
  }
  const relType = body.relationship_type ?? existing.data.relationship_type;
  const relatedName = body.related_person_name ?? existing.data.related_person_name;
  const defaults = getRelationshipDefaults(relType, relatedName ?? undefined);
  const { data, error } = await supabase
    .from("relationships")
    .update({
      ...body,
      claim: body.claim ?? existing.data.claim ?? defaults.claim,
      suggested_searches:
        body.suggested_searches ??
        existing.data.suggested_searches ??
        defaults.suggested_searches,
    })
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { supabase, user } = auth;
  const { error } = await supabase.from("relationships").delete().eq("user_id", user.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
