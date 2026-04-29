import { requireUser } from "@/lib/api";
import { buildSourceTemplate, detectRecordType, detectRecordYear, detectTier, parseQuickSourceLines } from "@/lib/source-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();

  const personRes = await supabase.from("people").select("full_name").eq("user_id", user.id).eq("person_id", body.person_id).single();
  if (personRes.error) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const sourceTitle = String(body.source_title ?? "").trim();
  const record_year = body.record_year ?? detectRecordYear(sourceTitle);
  const dedupeCheck = await supabase
    .from("sources")
    .select("id")
    .eq("user_id", user.id)
    .eq("person_id", body.person_id)
    .eq("source_title", sourceTitle)
    .eq("record_year", record_year || "")
    .maybeSingle();
  if (dedupeCheck.data?.id) {
    return NextResponse.json({ error: "Duplicate source", duplicate: true }, { status: 409 });
  }

  const template = buildSourceTemplate(sourceTitle);
  const payload = {
    ...body,
    user_id: user.id,
    person_name: body.person_name ?? personRes.data.full_name,
    source_title: sourceTitle,
    record_type: body.record_type ?? detectRecordType(sourceTitle),
    record_year,
    source_quality_tier: body.source_quality_tier ?? detectTier(sourceTitle),
    what_it_says: body.what_it_says ?? template.what_it_says,
    what_it_proves: body.what_it_proves ?? template.what_it_proves,
    what_it_does_not_prove: body.what_it_does_not_prove ?? template.what_it_does_not_prove,
    keep_decision: body.keep_decision ?? "Maybe",
    downloaded: body.downloaded ?? false,
  };
  const { data, error } = await supabase.from("sources").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();
  const personRes = await supabase
    .from("people")
    .select("full_name")
    .eq("user_id", user.id)
    .eq("person_id", body.person_id)
    .single();
  if (personRes.error) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const parsed = parseQuickSourceLines(String(body.raw_text ?? ""));
  const created: unknown[] = [];
  let skipped = 0;
  for (const row of parsed) {
    if (!row.source_title) continue;
    const exists = await supabase
      .from("sources")
      .select("id")
      .eq("user_id", user.id)
      .eq("person_id", body.person_id)
      .eq("source_title", row.source_title)
      .eq("record_year", row.record_year || "")
      .maybeSingle();
    if (exists.data?.id) {
      skipped += 1;
      continue;
    }
    const template = buildSourceTemplate(row.source_title);
    const { data } = await supabase
      .from("sources")
      .insert({
        user_id: user.id,
        person_id: body.person_id,
        person_name: body.person_name ?? personRes.data.full_name,
        source_title: row.source_title,
        ancestry_url: row.ancestry_url || null,
        record_type: row.record_type,
        record_year: row.record_year || null,
        source_quality_tier: row.source_quality_tier,
        keep_decision: body.keep_decision ?? "Maybe",
        downloaded: false,
        what_it_says: template.what_it_says,
        what_it_proves: template.what_it_proves,
        what_it_does_not_prove: template.what_it_does_not_prove,
      })
      .select("*")
      .single();
    if (data) created.push(data);
  }
  return NextResponse.json({ created, created_count: created.length, skipped_count: skipped });
}
