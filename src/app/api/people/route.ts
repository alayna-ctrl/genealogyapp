import { requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

function buildStarterChecklist(input: {
  fullName: string;
  mainQuestion?: string | null;
  isDirectLine: boolean;
  birthDate?: string | null;
  deathDate?: string | null;
}) {
  const { fullName, mainQuestion, isDirectLine, birthDate, deathDate } = input;
  const birthYear = Number((birthDate ?? "").match(/\b(17|18|19|20)\d{2}\b/)?.[0] ?? "");
  const deathYear = Number((deathDate ?? "").match(/\b(17|18|19|20)\d{2}\b/)?.[0] ?? "");
  const likelyCensusYears: number[] = [];
  if (Number.isFinite(birthYear) && birthYear > 0) {
    for (let year = 1850; year <= 1950; year += 10) {
      const age = year - birthYear;
      if (age >= 0 && age <= 100) likelyCensusYears.push(year);
    }
  }
  const tasks = [
    {
      task: `Paste Ancestry profile print text for ${fullName} and confirm parsed fields`,
      priority: "High",
      where_to_search: "Ancestry profile /print view",
      why_it_matters: "Creates a clean baseline and captures key source candidates quickly.",
    },
    {
      task: `Add at least 3 high-value records (census, vital, obituary) and set Keep decisions`,
      priority: "High",
      where_to_search: "Ancestry, FamilySearch, state archives",
      why_it_matters: "Prevents tree-only evidence and improves source reliability.",
    },
    {
      task: "Verify connecting child link before moving to prior generation",
      priority: "High",
      where_to_search: "Census households, birth/death certificates, obituaries",
      why_it_matters: "Avoids attaching the wrong ancestor line.",
    },
    {
      task: `Log one negative search (what was searched, where, and no-match result)`,
      priority: "Medium",
      where_to_search: "Hints + Searches step",
      why_it_matters: "Avoids repeating failed searches and improves research discipline.",
    },
  ];
  if (!mainQuestion?.trim()) {
    tasks.unshift({
      task: "Write one focused main research question",
      priority: "High",
      where_to_search: "Snapshot step",
      why_it_matters: "Keeps evidence review focused on one claim at a time.",
    });
  }
  if (isDirectLine) {
    tasks.push({
      task: "Prioritize direct-line proof set (birth, marriage, death, censuses)",
      priority: "Medium",
      where_to_search: "Vital records and federal/state censuses",
      why_it_matters: "Improves confidence in core tree backbone first.",
    });
  }
  if (likelyCensusYears.length > 0) {
    const top = likelyCensusYears.slice(0, 4).join(", ");
    tasks.push({
      task: `Target likely census years for ${fullName}: ${top}`,
      priority: "High",
      where_to_search: "US federal/state census collections",
      why_it_matters: "Anchors timeline with age/location snapshots to reduce wrong-person merges.",
    });
  } else {
    tasks.push({
      task: "Estimate an approximate birth year from known records before broad searching",
      priority: "Medium",
      where_to_search: "Obituaries, grave records, censuses, marriage/death records",
      why_it_matters: "A usable date anchor makes matching much more accurate.",
    });
  }
  if (Number.isFinite(deathYear) && deathYear > 0) {
    tasks.push({
      task: `Prioritize death-era records near ${deathYear} (death cert, obituary, burial)`,
      priority: "Medium",
      where_to_search: "State death indexes, newspapers, Find A Grave",
      why_it_matters: "Death-era records often identify relatives and locations for backtracking.",
    });
  }
  return tasks;
}

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
  const isStartingPerson = Boolean(body.is_starting_person);

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

  if (isStartingPerson) {
    await supabase
      .from("people")
      .update({ generation_number: null })
      .eq("user_id", user.id)
      .eq("generation_number", 0);
  }

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: user.id,
      person_id: personId,
      full_name: body.full_name,
      main_question: body.main_question ?? null,
      birth_date: body.birth_date ?? null,
      death_date: body.death_date ?? null,
      generation_number: isStartingPerson ? 0 : (body.generation_number ?? null),
      is_direct_line: isStartingPerson ? true : !!body.is_direct_line,
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

  const starterChecklist = buildStarterChecklist({
    fullName: body.full_name,
    mainQuestion: body.main_question ?? null,
    isDirectLine: !!body.is_direct_line,
    birthDate: body.birth_date ?? null,
    deathDate: body.death_date ?? null,
  });
  await supabase.from("next_steps").insert(
    starterChecklist.map((item) => ({
      user_id: user.id,
      person_id: personId,
      person_name: body.full_name,
      done: false,
      ...item,
    })),
  );

  return NextResponse.json(data, { status: 201 });
}
