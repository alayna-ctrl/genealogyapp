import { requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();

  const personRes = await supabase.from("people").select("full_name").eq("user_id", user.id).eq("person_id", body.person_id).single();
  if (personRes.error) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const { data, error } = await supabase.from("sources").insert({ ...body, user_id: user.id, person_name: body.person_name ?? personRes.data.full_name, downloaded: body.downloaded ?? false }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
