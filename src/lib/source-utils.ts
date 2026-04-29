export type SourceQualityTier =
  | "Original Record"
  | "Derivative Record"
  | "Authored Work"
  | "Family Tree / Other"
  | "Find A Grave"
  | "Unknown";

export function detectTier(sourceTitle: string): SourceQualityTier {
  const t = sourceTitle.toLowerCase();
  if (/family tree|member tree|geni|familysearch tree/.test(t)) return "Family Tree / Other";
  if (/find a grave/.test(t)) return "Find A Grave";
  if (/index/.test(t)) return "Derivative Record";
  if (/obituary|newspaper|family history/.test(t)) return "Authored Work";
  if (/census|death cert|birth cert|marriage|passenger|military|naturalization|church|probate|will/.test(t)) return "Original Record";
  return "Unknown";
}

export function detectRecordType(sourceTitle: string) {
  const t = sourceTitle.toLowerCase();
  if (t.includes("census")) return "Census";
  if (/death|obituary|grave/.test(t)) return "Death";
  if (/birth|baptism/.test(t)) return "Birth";
  if (/marriage/.test(t)) return "Marriage";
  if (/passenger|ship|immigration|naturalization/.test(t)) return "Immigration";
  if (/military|draft/.test(t)) return "Military";
  return "Unknown";
}

export function detectRecordYear(sourceTitle: string) {
  const m = sourceTitle.match(/\b(17|18|19|20)\d{2}\b/);
  return m?.[0] ?? "";
}

export function inferSourceSite(input: { source_title?: string | null; ancestry_url?: string | null }) {
  const url = input.ancestry_url?.toLowerCase() ?? "";
  const title = input.source_title?.toLowerCase() ?? "";
  if (url.includes("familysearch.org") || title.includes("familysearch")) return "FamilySearch";
  if (url.includes("ancestry.com") || title.includes("ancestry")) return "Ancestry";
  if (title.includes("find a grave")) return "Find A Grave";
  if (title.includes("newspaper")) return "Newspapers";
  return "Other";
}

export function buildSourceTemplate(sourceTitle: string) {
  const recordType = detectRecordType(sourceTitle);
  if (recordType === "Census") {
    return {
      what_it_says: "Household, ages, residence, and birthplace columns as transcribed from the census.",
      what_it_proves: "Confirms household composition and residence in the census year.",
      what_it_does_not_prove: "Does not independently prove parent-child identity across generations.",
    };
  }
  if (recordType === "Death") {
    return {
      what_it_says: "Death date/place and informant-provided parent/spouse details.",
      what_it_proves: "Usually strong for death facts; relationship details are leads unless corroborated.",
      what_it_does_not_prove: "Informant-provided parents are not definitive without supporting records.",
    };
  }
  return {
    what_it_says: "",
    what_it_proves: "",
    what_it_does_not_prove: "",
  };
}

export function parseQuickSourceLines(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const urlMatch = line.match(/https?:\/\/\S+/i);
    const ancestry_url = urlMatch?.[0] ?? "";
    const source_title = line.replace(/https?:\/\/\S+/gi, "").replace(/[-–|]\s*$/, "").trim();
    const record_year = detectRecordYear(source_title);
    const record_type = detectRecordType(source_title);
    const source_quality_tier = detectTier(source_title);
    return {
      source_title,
      ancestry_url,
      record_year,
      record_type,
      source_quality_tier,
    };
  });
}
