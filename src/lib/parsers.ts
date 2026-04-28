type ParseRecordResult = {
  fields: Record<string, string>;
  household: string[];
  recordType: string;
  says: string;
  proves: string;
  notProves: string;
};

const SKIP_FIELD_PATTERNS = [
  /farm/i,
  /acres/i,
  /income/i,
  /weeks worked/i,
  /school attendance/i,
  /employment status/i,
  /same house/i,
  /same county/i,
  /grade completed/i,
  /dwelling number/i,
  /apartment number/i,
  /house number/i,
  /color or race/i,
  /school completed/i,
  /previously on farm/i,
  /previous occupation/i,
  /previous industry/i,
];

export function parseProfileText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const readValue = (label: RegExp) => {
    const idx = lines.findIndex((line) => label.test(line));
    if (idx === -1) return "";
    const line = lines[idx];
    if (line.includes(":")) return line.split(":").slice(1).join(":").trim();
    return lines[idx + 1] ?? "";
  };

  const children = lines
    .filter((line) => /child/i.test(line) && /:/.test(line))
    .map((line) => line.split(":").slice(1).join(":").trim())
    .filter(Boolean);

  const keySources = lines.filter((line) => /census|death cert|marriage|birth cert|birth index|obituary|passenger|military|family tree|member tree/i.test(line));
  const batchSources = lines.filter((line) => /school yearbook|public records index|city director|family history|newspapers\.com|stories and events index/i.test(line));

  return {
    name: readValue(/^name/i),
    birth: readValue(/^birth/i),
    death: readValue(/^death/i),
    spouse: readValue(/^spouse/i),
    marriageDate: readValue(/^marriage date/i),
    father: readValue(/^father/i),
    mother: readValue(/^mother/i),
    parentsFormatted: `${readValue(/^father/i)} and ${readValue(/^mother/i)}`.trim(),
    children,
    keySources,
    batchSources,
  };
}

function detectRecordType(text: string) {
  if (/census year|residence in\s*\d{4}/i.test(text)) return "Census";
  if (/cause of death|informant/i.test(text)) return "Death Certificate";
  if (/marriage date/i.test(text)) return "Marriage Record";
  if (/ship name|port of arrival/i.test(text)) return "Passenger Record";
  if (/father named/i.test(text) && /birth date listed/i.test(text)) return "Birth Record";
  if (/branch|rank/i.test(text)) return "Military Record";
  return "Unknown";
}

function pickField(fields: Record<string, string>, keys: string[]) {
  const entries = Object.entries(fields);
  for (const key of keys) {
    const match = entries.find(([k]) => k.toLowerCase().includes(key.toLowerCase()));
    if (match) return match[1];
  }
  return "";
}

export function parseRecordText(text: string): ParseRecordResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields: Record<string, string> = {};
  const household: string[] = [];

  for (const line of lines) {
    if (line.includes(":")) {
      const [label, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (!SKIP_FIELD_PATTERNS.some((pattern) => pattern.test(label))) {
        fields[label.trim()] = value;
      }
    }
    if (/household member|in household|relation to head/i.test(line)) {
      household.push(line);
    }
  }

  const recordType = detectRecordType(text);
  const name = pickField(fields, ["name"]) || "Person";
  const address = pickField(fields, ["address", "street", "residence", "place"]) || "unknown location";
  const year = pickField(fields, ["year", "census year"]) || (text.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? "");
  const ageValue = pickField(fields, ["age"]);
  const deathDate = pickField(fields, ["death date", "date of death"]);
  const deathPlace = pickField(fields, ["death place", "place of death"]);
  const father = pickField(fields, ["father"]);
  const mother = pickField(fields, ["mother"]);
  const informant = pickField(fields, ["informant"]) || "the informant";

  let says = `Record type detected: ${recordType}.`;
  let proves = "Record details extracted for review.";
  let notProves = "Does not prove all relationships by itself.";

  if (recordType === "Census") {
    let approx = "";
    if (ageValue && year) {
      const yearNum = Number(year);
      const ageNum = Number(ageValue.match(/\d+/)?.[0] ?? "");
      if (Number.isFinite(yearNum) && Number.isFinite(ageNum)) approx = String(yearNum - ageNum);
    }
    says = `${name} appears in a census entry with residence details at ${address}.`;
    proves = `Confirms ${name}'s residence at ${address} in ${year || "the census year"}. Approximate birth year ~${approx || "unknown"}.`;
    notProves = "Does NOT prove who the parents of the adults are. Father's/Mother's birthplace columns show where the HEAD's parents were born - they do not name those parents.";
  }

  if (recordType === "Death Certificate") {
    says = `Death certificate lists date/place and informant context for ${name}.`;
    proves = `Death date ${deathDate || "unknown"} in ${deathPlace || "unknown"} confirmed. Parents listed as ${father || "unknown"} and ${mother || "unknown"} - provided by ${informant}. Treat as lead only.`;
    notProves = `Parent names (${father || "unknown"} and ${mother || "unknown"}) were reported by ${informant} who may not have known the grandparents' details. Verify with birth record.`;
  }

  return { fields, household, recordType, says, proves, notProves };
}
