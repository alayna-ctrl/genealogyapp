import { Person, Relationship, Source } from "@/types/database";

type Flag = { level: "red" | "yellow" | "green"; message: string };

function extractYear(dateValue?: string) {
  if (!dateValue) return null;
  const m = dateValue.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

export function RedFlagPanel({ person, sources, relationships }: { person: Person; sources: Source[]; relationships: Relationship[]; }) {
  const flags: Flag[] = [];

  const parentRelated = sources.filter((s) => /parent|father|mother/i.test(s.what_it_proves ?? ""));
  if (
    parentRelated.length > 0 &&
    parentRelated.every((s) => s.source_quality_tier === "Family Tree / Other" || s.source_quality_tier === "Find A Grave")
  ) {
    flags.push({ level: "red", message: "🚩 Parents not proven by any original record. Do not go further back." });
  }

  const birthYear = extractYear(person.birth_date);
  const deathYear = extractYear(person.death_date);
  if (birthYear && deathYear && deathYear < birthYear) {
    flags.push({ level: "red", message: "🚩 Impossible dates: death year is before birth year." });
  }
  if (birthYear && birthYear < 1500) {
    flags.push({ level: "red", message: "🚩 Birth year appears impossible (<1500)." });
  }

  if (person.concern && !person.concern.startsWith("[FAST TRACK]")) {
    flags.push({ level: "yellow", message: `⚠ Open concern: ${person.concern}` });
  }

  if (person.status === "Verified" && person.current_step < 7 && !person.is_fast_track) {
    flags.push({ level: "yellow", message: "⚠ Person is Verified but workflow is not complete." });
  }

  relationships.forEach((rel) => {
    if (rel.status === "Probably Wrong") flags.push({ level: "red", message: `🚩 ${rel.relationship_type} relationship marked Probably Wrong.` });
    if (rel.status === "Conflict") flags.push({ level: "yellow", message: `⚠ ${rel.relationship_type} relationship marked Conflict.` });
  });

  const connectingChild = relationships.find((r) => r.relationship_type === "Connecting Child");
  if (connectingChild && (connectingChild.status === "Needs Proof" || connectingChild.status === "Probably Wrong")) {
    flags.push({ level: "red", message: "🚩 Connecting child not verified. Do not add ancestors above this person until this link is proven." });
  }

  if (flags.length === 0) {
    return <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">No issues found.</div>;
  }

  return (
    <div className="space-y-2 rounded border bg-white p-3">
      <p className="text-sm font-semibold">Red Flags</p>
      {flags.map((flag, i) => (
        <div key={i} className={`rounded p-2 text-xs ${flag.level === "red" ? "bg-red-100 text-red-900" : "bg-yellow-100 text-yellow-900"}`}>
          {flag.message}
        </div>
      ))}
    </div>
  );
}
