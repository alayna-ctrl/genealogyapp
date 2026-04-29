import { requireUser } from "@/lib/api";
import { buildPersonAudit } from "@/lib/genealogy-audit";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: peopleData, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", user.id)
    .order("last_worked_at", { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const people = peopleData ?? [];

  const counts = {
    Verified: people.filter((p) => p.status === "Verified").length,
    Likely: people.filter((p) => p.status === "Likely").length,
    "Needs Proof": people.filter((p) => p.status === "Needs Proof").length,
    Conflict: people.filter((p) => p.status === "Conflict").length,
    "Probably Wrong": people.filter((p) => p.status === "Probably Wrong").length,
    "Done for Now": people.filter((p) => p.status === "Done for Now").length,
  };
  const total = people.length;
  const cleaned = counts.Verified + counts.Likely;
  const percent_cleaned = total > 0 ? Math.round((cleaned / total) * 100) : 0;

  const now = Date.now();
  const staleThreshold = now - 30 * 24 * 60 * 60 * 1000;
  const priorityCandidate =
    people.find((p) => p.status === "Conflict" || p.status === "Probably Wrong")
    ?? people.find((p) => p.finished_at === null && p.last_worked_at && new Date(p.last_worked_at).getTime() < staleThreshold)
    ?? people.find((p) => p.finished_at === null && p.current_step < 7)
    ?? null;
  let priority_reason = "";
  if (priorityCandidate?.status === "Conflict" || priorityCandidate?.status === "Probably Wrong") priority_reason = "Conflict";
  else if (priorityCandidate?.finished_at === null && priorityCandidate?.last_worked_at && new Date(priorityCandidate.last_worked_at).getTime() < staleThreshold) priority_reason = "Stale";
  else if (priorityCandidate) priority_reason = "Mid-workflow";

  const recent_people = people.slice(0, 5);
  const personIds = people.map((person) => person.person_id);
  const [sourcesRes, relationshipsRes, hintsRes] = await Promise.all([
    supabase.from("sources").select("*").eq("user_id", user.id).in("person_id", personIds.length ? personIds : [""]),
    supabase.from("relationships").select("*").eq("user_id", user.id).in("person_id", personIds.length ? personIds : [""]),
    supabase.from("hints_searches").select("*").eq("user_id", user.id).in("person_id", personIds.length ? personIds : [""]),
  ]);
  const sourcesByPerson = new Map<string, Record<string, unknown>[]>();
  const relationshipsByPerson = new Map<string, Record<string, unknown>[]>();
  const hintsByPerson = new Map<string, Record<string, unknown>[]>();
  for (const source of sourcesRes.data ?? []) {
    const rows = sourcesByPerson.get(source.person_id) ?? [];
    rows.push(source);
    sourcesByPerson.set(source.person_id, rows);
  }
  for (const rel of relationshipsRes.data ?? []) {
    const rows = relationshipsByPerson.get(rel.person_id) ?? [];
    rows.push(rel);
    relationshipsByPerson.set(rel.person_id, rows);
  }
  for (const hint of hintsRes.data ?? []) {
    const rows = hintsByPerson.get(hint.person_id) ?? [];
    rows.push(hint);
    hintsByPerson.set(hint.person_id, rows);
  }
  const audit_rows = people.map((person) => {
    const audit = buildPersonAudit({
      person,
      sources: sourcesByPerson.get(person.person_id) ?? [],
      relationships: relationshipsByPerson.get(person.person_id) ?? [],
      hints: hintsByPerson.get(person.person_id) ?? [],
    });
    return {
      person_id: person.person_id,
      full_name: person.full_name,
      missing_count: audit.missingFacts.length,
      weak_count: audit.weakProofs.length,
      conflict_count: audit.conflicts.length,
      source_sites: audit.summary.source_sites,
      direct_line: person.is_direct_line,
    };
  });
  const weak_direct_line_count = audit_rows.filter((row) => row.direct_line && (row.weak_count > 0 || row.conflict_count > 0)).length;
  const incomplete_people_count = audit_rows.filter((row) => row.missing_count > 0).length;

  const { count: open_high_priority_tasks } = await supabase
    .from("next_steps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("priority", "High")
    .eq("done", false);

  return NextResponse.json({
    counts,
    total_people: total,
    percent_cleaned,
    priority_person: priorityCandidate,
    priority_reason,
    recent_people,
    open_high_priority_tasks: open_high_priority_tasks ?? 0,
    weak_direct_line_count,
    incomplete_people_count,
    audit_rows: audit_rows
      .sort((a, b) => (b.conflict_count + b.weak_count + b.missing_count) - (a.conflict_count + a.weak_count + a.missing_count))
      .slice(0, 5),
  });
}
