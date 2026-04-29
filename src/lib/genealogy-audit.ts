import { inferSourceSite } from "@/lib/source-utils";

type PersonLike = {
  full_name?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  death_date?: string | null;
  death_place?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  spouse_name?: string | null;
  connecting_child?: string | null;
  is_direct_line?: boolean | null;
};

type SourceLike = {
  source_title?: string | null;
  record_type?: string | null;
  record_year?: string | null;
  keep_decision?: string | null;
  source_quality_tier?: string | null;
  ancestry_url?: string | null;
  what_it_proves?: string | null;
};

type RelationshipLike = {
  relationship_type?: string | null;
  related_person_name?: string | null;
  status?: string | null;
  evidence_summary?: string | null;
};

type HintLike = {
  type?: string | null;
  decision?: string | null;
};

function yearFromText(value?: string | null) {
  const found = value?.match(/\b(17|18|19|20)\d{2}\b/);
  return found ? Number(found[0]) : null;
}

function hasStrongKeepSource(sources: SourceLike[], matcher?: (source: SourceLike) => boolean) {
  return sources.some((source) => {
    const keep = source.keep_decision === "Keep";
    const strong = source.source_quality_tier === "Original Record" || source.source_quality_tier === "Authored Work";
    return keep && strong && (!matcher || matcher(source));
  });
}

function normalize(text?: string | null) {
  return (text ?? "").toLowerCase();
}

function sourceSupportsFact(source: SourceLike, fact: string) {
  const title = normalize(source.source_title);
  const recordType = normalize(source.record_type);
  const proves = normalize(source.what_it_proves);
  const text = `${title} ${recordType} ${proves}`;
  if (fact === "birth") return /birth|baptism/.test(text);
  if (fact === "death") return /death|obituary|burial|grave/.test(text);
  if (fact === "parents") return /parent|father|mother/.test(text);
  if (fact === "spouse") return /spouse|marriage|wife|husband/.test(text);
  if (fact === "connecting_child") return /child|son|daughter|household/.test(text);
  if (fact === "timeline") return /census|residence|home in|address/.test(text);
  return false;
}

function getFactMatrixStatus(input: {
  fact: string;
  sources: SourceLike[];
  requiredHint: boolean;
}) {
  const matching = input.sources.filter((source) => sourceSupportsFact(source, input.fact));
  const kept = matching.filter((source) => source.keep_decision === "Keep");
  const strongKept = kept.filter(
    (source) => source.source_quality_tier === "Original Record" || source.source_quality_tier === "Authored Work",
  );
  if (input.requiredHint && matching.length === 0) return { status: "Missing", supporting: [] as string[] };
  if (strongKept.length > 0) return { status: "Proven", supporting: strongKept.map((source) => source.source_title ?? "Untitled source") };
  if (kept.length > 0 || matching.length > 0) return { status: "Partial", supporting: matching.map((source) => source.source_title ?? "Untitled source").slice(0, 3) };
  return { status: "Missing", supporting: [] as string[] };
}

export function buildPersonAudit(input: {
  person: PersonLike;
  sources: SourceLike[];
  relationships: RelationshipLike[];
  hints: HintLike[];
}) {
  const { person, sources, relationships, hints } = input;
  const birthYear = yearFromText(person.birth_date);
  const deathYear = yearFromText(person.death_date);
  const sourceSites = Array.from(new Set(sources.map(inferSourceSite)));

  const scorecard = [
    {
      label: "Birth",
      status: person.birth_date && person.birth_place
        ? hasStrongKeepSource(sources, (source) => (source.record_type ?? "").includes("Birth")) ? "Proven" : "Partial"
        : "Missing",
    },
    {
      label: "Death",
      status: person.death_date || person.death_place
        ? hasStrongKeepSource(sources, (source) => (source.record_type ?? "").includes("Death")) ? "Proven" : "Partial"
        : "Missing",
    },
    {
      label: "Parents",
      status: person.father_name && person.mother_name
        ? relationships.some((rel) => ["Father", "Mother"].includes(rel.relationship_type ?? "") && rel.status === "Verified") ? "Proven" : "Partial"
        : "Missing",
    },
    {
      label: "Connecting Child",
      status: person.connecting_child
        ? relationships.some((rel) => rel.relationship_type === "Connecting Child" && rel.status === "Verified") ? "Proven" : "Partial"
        : "Missing",
    },
    {
      label: "Source Quality",
      status: hasStrongKeepSource(sources) ? "Proven" : sources.length > 0 ? "Partial" : "Missing",
    },
  ];

  const proofMatrix = [
    { key: "birth", label: "Birth fact", ...getFactMatrixStatus({ fact: "birth", sources, requiredHint: Boolean(person.birth_date || person.birth_place) }) },
    { key: "death", label: "Death fact", ...getFactMatrixStatus({ fact: "death", sources, requiredHint: Boolean(person.death_date || person.death_place) }) },
    { key: "parents", label: "Parent identities", ...getFactMatrixStatus({ fact: "parents", sources, requiredHint: Boolean(person.father_name || person.mother_name) }) },
    { key: "spouse", label: "Spouse relationship", ...getFactMatrixStatus({ fact: "spouse", sources, requiredHint: Boolean(person.spouse_name) }) },
    { key: "connecting_child", label: "Connecting child relationship", ...getFactMatrixStatus({ fact: "connecting_child", sources, requiredHint: Boolean(person.connecting_child) }) },
    { key: "timeline", label: "Timeline / residence", ...getFactMatrixStatus({ fact: "timeline", sources, requiredHint: true }) },
  ];

  const missingFacts: string[] = [];
  if (!person.birth_date) missingFacts.push("Birth date missing");
  if (!person.birth_place) missingFacts.push("Birth place missing");
  if (!person.death_date && deathYear === null) missingFacts.push("Death date missing");
  if (!person.father_name) missingFacts.push("Father not named");
  if (!person.mother_name) missingFacts.push("Mother not named");
  if (!person.connecting_child && person.is_direct_line) missingFacts.push("Connecting child missing for direct-line person");
  if (!hasStrongKeepSource(sources)) missingFacts.push("No strong Keep source yet");
  if (!hints.some((hint) => /nothing found/i.test(hint.decision ?? ""))) missingFacts.push("No negative search logged");

  const weakProofs: string[] = [];
  if (sources.some((source) => source.keep_decision === "Keep" && source.source_quality_tier === "Family Tree / Other")) {
    weakProofs.push("A Family Tree / Other source is marked Keep");
  }
  if (person.father_name || person.mother_name) {
    const parentLeadOnly = sources.some(
      (source) =>
        source.keep_decision === "Keep" &&
        source.record_type === "Death" &&
        /parent/i.test(source.what_it_proves ?? ""),
    );
    if (parentLeadOnly) weakProofs.push("Parent identities may rely on death/informant evidence");
  }
  const connectingChildRel = relationships.find((rel) => rel.relationship_type === "Connecting Child");
  if (connectingChildRel && connectingChildRel.status !== "Verified") {
    weakProofs.push("Connecting child relationship is not yet verified");
  }

  const conflicts: string[] = [];
  if (birthYear && deathYear && deathYear < birthYear) conflicts.push("Death year is earlier than birth year");
  if (birthYear && birthYear < 1700) conflicts.push("Birth year looks unusually early; verify identity");
  const verifiedParents = relationships.filter((rel) => ["Father", "Mother"].includes(rel.relationship_type ?? "") && rel.status === "Verified");
  if (verifiedParents.length === 0 && (person.father_name || person.mother_name)) {
    conflicts.push("Parents are named on profile but not verified in relationship review");
  }
  if (sources.filter((source) => source.keep_decision === "Keep").length === 0 && sources.length > 0) {
    conflicts.push("Sources exist but none are marked Keep");
  }

  const suggestedSearches: string[] = [];
  if (birthYear) {
    const censusYears = [];
    for (let year = 1850; year <= 1950; year += 10) {
      const age = year - birthYear;
      if (age >= 0 && age <= 100) censusYears.push(year);
    }
    const sourceYears = new Set(sources.map((source) => Number(source.record_year)).filter(Boolean));
    const missingCensusYears = censusYears.filter((year) => !sourceYears.has(year)).slice(0, 3);
    if (missingCensusYears.length > 0) {
      suggestedSearches.push(`Look for missing census coverage: ${missingCensusYears.join(", ")}`);
    }
  } else {
    suggestedSearches.push("Estimate birth year from any reliable age/timeline record");
  }
  if (sourceSites.includes("Ancestry") && !sourceSites.includes("FamilySearch")) {
    suggestedSearches.push("Cross-check key records on FamilySearch for comparison");
  }
  if (sourceSites.includes("FamilySearch") && !sourceSites.includes("Ancestry")) {
    suggestedSearches.push("Cross-check key records on Ancestry for alternate indexing");
  }

  const summary = {
    proven_count: scorecard.filter((item) => item.status === "Proven").length,
    partial_count: scorecard.filter((item) => item.status === "Partial").length,
    missing_count: scorecard.filter((item) => item.status === "Missing").length,
    strong_keep_sources: sources.filter(
      (source) =>
        source.keep_decision === "Keep" &&
        (source.source_quality_tier === "Original Record" || source.source_quality_tier === "Authored Work"),
    ).length,
    tree_only_kept: sources.filter(
      (source) => source.keep_decision === "Keep" && source.source_quality_tier === "Family Tree / Other",
    ).length,
    source_sites: sourceSites,
  };

  return { scorecard, proofMatrix, missingFacts, weakProofs, conflicts, suggestedSearches, summary };
}
