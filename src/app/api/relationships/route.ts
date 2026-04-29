import { requireUser } from "@/lib/api";
import { getRelationshipDefaults } from "@/lib/relationship-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();
  const defaults = getRelationshipDefaults(
    body.relationship_type ?? "Other",
    body.related_person_name,
  );
  const { data, error } = await supabase
    .from("relationships")
    .insert({
      ...body,
      user_id: user.id,
      claim: body.claim ?? defaults.claim,
      suggested_searches: body.suggested_searches ?? defaults.suggested_searches,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
