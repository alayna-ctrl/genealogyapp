import { requireUser } from "@/lib/api";
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
  const priority_person =
    people.find((p) => p.status === "Conflict" || p.status === "Probably Wrong") ||
    people.find((p) => p.finished_at === null && p.last_worked_at && new Date(p.last_worked_at).getTime() < staleThreshold) ||
    people.find((p) => p.finished_at === null && p.current_step < 7) ||
    null;

  const recent_people = people.slice(0, 5);

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
    priority_person,
    recent_people,
    open_high_priority_tasks: open_high_priority_tasks ?? 0,
  });
}
