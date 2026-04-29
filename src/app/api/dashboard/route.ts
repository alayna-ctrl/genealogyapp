import { requireUser } from "@/lib/api";
import { buildPersonAudit } from "@/lib/genealogy-audit";
import { NextResponse } from "next/server";

type HubRow = {
  person_id: string;
  full_name: string;
  direct_line: boolean;
  score: number;
  rationale_tokens: string[];
  missing_count: number;
  weak_count: number;
  conflict_count: number;
  source_sites: string[];
  action_hints: string[];
};

function getActionHints(row: {
  conflict_count: number;
  weak_count: number;
  missing_count: number;
  source_sites: string[];
}) {
  const hints: string[] = [];
  if (row.conflict_count > 0) hints.push("Review conflicts");
  if (row.weak_count > 0) hints.push("Resolve connecting child");
  if (row.missing_count > 0) hints.push("Add source");
  if (!row.source_sites.includes("FamilySearch")) hints.push("Log search");
  if (hints.length === 0) hints.push("Continue");
  return hints.slice(0, 2);
}

function scoreRow(row: {
  conflict_count: number;
  weak_count: number;
  missing_count: number;
  stale: boolean;
  direct_line: boolean;
}) {
  return (
    row.conflict_count * 100 +
    row.weak_count * 60 +
    row.missing_count * 30 +
    (row.stale ? 15 : 0) +
    (row.direct_line ? 10 : 0)
  );
}

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
      stale:
        person.finished_at === null &&
        Boolean(person.last_worked_at) &&
        new Date(person.last_worked_at).getTime() < staleThreshold,
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

  const weightedRows: HubRow[] = audit_rows.map((row) => {
    const rationale_tokens: string[] = [];
    if (row.conflict_count > 0) rationale_tokens.push("Conflict");
    if (row.weak_count > 0) rationale_tokens.push("WeakProof");
    if (row.missing_count > 0) rationale_tokens.push("MissingCoreData");
    if (row.stale) rationale_tokens.push("Stale");
    return {
      person_id: row.person_id,
      full_name: row.full_name,
      direct_line: row.direct_line,
      score: scoreRow(row),
      rationale_tokens,
      missing_count: row.missing_count,
      weak_count: row.weak_count,
      conflict_count: row.conflict_count,
      source_sites: row.source_sites,
      action_hints: getActionHints(row),
    };
  });

  const hub_sections = {
    urgent_proof_risks: weightedRows
      .filter((row) => row.conflict_count > 0 || row.weak_count > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6),
    missing_core_facts: weightedRows
      .filter((row) => row.missing_count > 0)
      .sort((a, b) => b.missing_count - a.missing_count)
      .slice(0, 6),
    stale_in_progress: weightedRows
      .filter((row) => row.rationale_tokens.includes("Stale"))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6),
  };

  const [recentSources, recentHints, recentRelationships, recentNextSteps] = await Promise.all([
    supabase.from("sources").select("person_id, person_name, source_title, keep_decision, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("hints_searches").select("person_id, person_name, type, decision, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("relationships").select("person_id, person_name, relationship_type, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("next_steps").select("person_id, person_name, task, priority, done, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const recent_activity = [
    ...(recentSources.data ?? []).map((item) => ({
      person_id: item.person_id,
      person_name: item.person_name,
      type: "source",
      summary: `${item.source_title} (${item.keep_decision ?? "Maybe"})`,
      created_at: item.created_at,
    })),
    ...(recentHints.data ?? []).map((item) => ({
      person_id: item.person_id,
      person_name: item.person_name,
      type: "search",
      summary: `${item.type}: ${item.decision ?? "reviewed"}`,
      created_at: item.created_at,
    })),
    ...(recentRelationships.data ?? []).map((item) => ({
      person_id: item.person_id,
      person_name: item.person_name,
      type: "relationship",
      summary: `${item.relationship_type} set to ${item.status}`,
      created_at: item.created_at,
    })),
    ...(recentNextSteps.data ?? []).map((item) => ({
      person_id: item.person_id,
      person_name: item.person_name,
      type: "task",
      summary: `${item.done ? "Done" : "Open"}: ${item.task} (${item.priority})`,
      created_at: item.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);
  const activity_recent_7d_count = recent_activity.filter(
    (item) => Date.now() - new Date(item.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

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
    activity_recent_7d_count,
    hub_sections,
    recent_activity,
    action_hints: priorityCandidate
      ? getActionHints(
          weightedRows.find((row) => row.person_id === priorityCandidate.person_id) ?? {
            conflict_count: 0,
            weak_count: 0,
            missing_count: 0,
            source_sites: [],
          },
        )
      : [],
    audit_rows: audit_rows
      .sort((a, b) => (b.conflict_count + b.weak_count + b.missing_count) - (a.conflict_count + a.weak_count + a.missing_count))
      .slice(0, 5),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json();
  const personId = String(body.person_id ?? "");
  if (!personId) return NextResponse.json({ error: "person_id is required" }, { status: 400 });

  const personRes = await supabase
    .from("people")
    .select("person_id, full_name, is_direct_line")
    .eq("user_id", user.id)
    .eq("person_id", personId)
    .single();
  if (personRes.error || !personRes.data) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const existingRes = await supabase
    .from("next_steps")
    .select("task, done")
    .eq("user_id", user.id)
    .eq("person_id", personId)
    .eq("done", false);
  const existingTasks = new Set((existingRes.data ?? []).map((row) => row.task));

  const suggested = [
    "Verify connecting child with one primary household record",
    "Cross-check key record on FamilySearch and compare details",
    "Log one negative search to rule out same-name candidate",
    ...(personRes.data.is_direct_line
      ? ["Confirm parent-child link before extending one more generation"]
      : []),
  ];
  const toCreate = suggested.filter((task) => !existingTasks.has(task));
  if (toCreate.length === 0) return NextResponse.json({ created_count: 0, skipped_count: suggested.length });

  const insertRes = await supabase.from("next_steps").insert(
    toCreate.map((task) => ({
      user_id: user.id,
      person_id: personId,
      person_name: personRes.data.full_name,
      task,
      priority: "High",
      where_to_search: "Dashboard suggested task",
      why_it_matters: "Closes common proof gaps with minimal manual planning.",
      done: false,
    })),
  );
  if (insertRes.error) return NextResponse.json({ error: insertRes.error.message }, { status: 400 });
  return NextResponse.json({ created_count: toCreate.length, skipped_count: suggested.length - toCreate.length });
}
