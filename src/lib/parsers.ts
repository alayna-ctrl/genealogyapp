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

const IGNORE_NAME_PATTERNS = [
  /^print$/i,
  /^customize$/i,
  /^cancel/i,
  /^ancestry$/i,
  /^https?:\/\//i,
  /^birth$/i,
  /^death$/i,
  /^paternal/i,
  /^maternal/i,
  /^profile image$/i,
];

const KEY_SOURCE_PATTERN = /census|death cert|marriage|birth cert|birth index|obituary|passenger|military|family tree|member tree|naturalization|church|probate|will/i;
const BATCH_SOURCE_PATTERN = /school yearbook|public records|city director|family history book|newspapers\.com|stories and events|index to public/i;

function isLikelyName(line: string) {
  if (!line || line.length < 3) return false;
  if (IGNORE_NAME_PATTERNS.some((p) => p.test(line))) return false;
  if (/(print|customize|cancel|ancestry|mycanvas)/i.test(line)) return false;
  if (/(birth|death|marriage|parents|spouse and children)/i.test(line)) return false;
  if (/\d{2} [A-Z]{3} \d{4}|\d{4}/i.test(line)) return false;
  if (/•/.test(line)) return false;
  return true;
}

function normalizeSourceTitle(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

export function parseProfileText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lower = lines.map((l) => l.toLowerCase());

  const name = lines.find((line) => isLikelyName(line)) ?? "";

  const birth = lines.find((line) => /^birth\s+/i.test(line) && /•/.test(line))?.replace(/^birth\s+/i, "") ?? "";
  const death = lines.find((line) => /^death\s+/i.test(line) && /•/.test(line))?.replace(/^death\s+/i, "") ?? "";

  let spouse = "";
  let marriageDate = "";
  const marriageIdx = lower.findIndex((l) => /age\s+\d+.*marriage/i.test(l));
  if (marriageIdx >= 0) {
    const after = lines.slice(marriageIdx + 1, marriageIdx + 6);
    marriageDate = after.find((l) => /\d{1,2}\s+[A-Z]{3}\s+\d{4}|\d{4}/i.test(l) && /•/.test(l)) ?? "";
    spouse = after.find((l) => isLikelyName(l)) ?? "";
  }

  let father = "";
  let mother = "";
  const parentsIdx = lower.findIndex((l) => /^parents$/i.test(l) || /parents\s*$/i.test(l));
  if (parentsIdx >= 0) {
    const candidates = lines.slice(parentsIdx + 1).filter((line) => {
      if (/^https?:\/\//i.test(line)) return false;
      if (/\d{4}|•/.test(line)) return false;
      if (!isLikelyName(line)) return false;
      return true;
    });
    father = candidates[0] ?? "";
    mother = candidates[1] ?? "";
  }

  const children: string[] = [];
  const scIdx = lower.findIndex((l) => /spouse and children/i.test(l));
  if (scIdx >= 0) {
    const block = lines.slice(scIdx + 1, scIdx + 20).filter((line) => !/^https?:\/\//i.test(line));
    const nameLines = block.filter((line) => isLikelyName(line) && !/\d{4}\s*[–\-]\s*\d{4}|\d{4}\s*[–\-]/.test(line));
    if (nameLines.length > 1) {
      children.push(...nameLines.slice(1));
    }
  }

  const keySources = lines.filter((line) => KEY_SOURCE_PATTERN.test(line)).map(normalizeSourceTitle);
  const batchSources = lines.filter((line) => BATCH_SOURCE_PATTERN.test(line)).map(normalizeSourceTitle);

  return {
    name,
    birth,
    death,
    spouse,
    marriageDate,
    father,
    mother,
    parentsFormatted: [father, mother].filter(Boolean).join(" and "),
    children,
    keySources,
    batchSources,
  };
}

const LABEL_MAP: Record<string, string> = {
  "father birth place": "Father's birthplace",
  "mother birth place": "Mother's birthplace",
  "relation to head of house": "Relation to head of household",
  "residence date": "Census year",
  "birth place": "Birth place listed",
  "birth date": "Birth date listed",
  age: "Age listed",
  name: "Name as listed",
  "death date": "Death date",
  "death place": "Death place",
  "cause of death": "Cause of death",
  "marital status": "Marital status",
  occupation: "Occupation",
  informant: "Informant",
  "burial place": "Burial place",
  "father name": "Father named",
  "mother name": "Mother named",
};

for (let year = 1860; year <= 1950; year += 10) {
  LABEL_MAP[`home in ${year}`] = `Residence in ${year}`;
}
LABEL_MAP["home in 1950"] = "Residence in 1950";

function mapLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return LABEL_MAP[normalized] ?? label.trim();
}

function detectRecordType(input: { labels: string[]; body: string }) {
  const text = input.body;
  if (/census year|residence in\s*\d{4}/i.test(text)) return "Census";
  if (/cause of death|informant/i.test(text)) return "Death Certificate";
  if (/marriage date/i.test(text)) return "Marriage Record";
  if (/ship name|port of arrival/i.test(text)) return "Passenger Record";
  if (/father named/i.test(text) && /birth date listed/i.test(text)) return "Birth Record";
  if (/branch|rank/i.test(text)) return "Military Record";
  return "Unknown";
}

function pick(fields: Record<string, string>, contains: string[]) {
  const entries = Object.entries(fields);
  for (const key of contains) {
    const found = entries.find(([k]) => k.toLowerCase().includes(key));
    if (found) return found[1];
  }
  return "";
}

export function parseRecordText(text: string): ParseRecordResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields: Record<string, string> = {};
  const household: string[] = [];
  let inHousehold = false;

  for (const line of lines) {
    if (/^household members$/i.test(line)) {
      inHousehold = true;
      continue;
    }

    if (inHousehold) {
      if (line.includes("	")) {
        const [name, age, rel] = line.split("	").map((x) => x.trim()).filter(Boolean);
        if (name) household.push(`- ${name}  |  age ${age ?? "?"}  |  ${rel ?? "Unknown"}`);
        continue;
      }
      if (/^[A-Z][a-z]+\s+/.test(line)) {
        household.push(`- ${line}`);
        continue;
      }
      inHousehold = false;
    }

    let label = "";
    let value = "";

    if (line.includes("	")) {
      const [left, ...rest] = line.split("	");
      label = left.trim();
      value = rest.join(" ").trim();
    } else {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 50) {
        label = line.slice(0, colonIdx).trim();
        value = line.slice(colonIdx + 1).trim();
      }
    }

    if (!label || !value) continue;
    if (SKIP_FIELD_PATTERNS.some((p) => p.test(label))) continue;

    fields[mapLabel(label)] = value;
  }

  const recordType = detectRecordType({ labels: Object.keys(fields), body: Object.keys(fields).join(" ") });
  const name = pick(fields, ["name as listed", "name"]);
  const address = pick(fields, ["residence in", "address", "street"]);
  const year = pick(fields, ["census year", "residence in"]);
  const age = pick(fields, ["age listed", "age"]);
  const deathDate = pick(fields, ["death date"]);
  const deathPlace = pick(fields, ["death place"]);
  const father = pick(fields, ["father named", "father"]);
  const mother = pick(fields, ["mother named", "mother"]);
  const informant = pick(fields, ["informant"]);

  const saysLines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  if (household.length > 0) {
    saysLines.push("Household Members:");
    saysLines.push(...household);
  }
  const says = saysLines.join("\n");

  let proves = "Record details extracted for review.";
  let notProves = "Does not prove all relationships by itself.";

  if (recordType === "Census") {
    let approx = "unknown";
    const yearNum = Number((year.match(/(18|19|20)\d{2}/) ?? [""])[0]);
    const ageNum = Number((age.match(/\d+/) ?? [""])[0]);
    if (Number.isFinite(yearNum) && Number.isFinite(ageNum) && yearNum > 0 && ageNum >= 0) {
      approx = String(yearNum - ageNum);
    }
    proves = `Confirms ${name || "the person"}'s residence at ${address || "unknown address"} in ${year || "unknown year"}. Approximate birth year ~${approx}.`;
    notProves = "Does NOT prove who the parents of the adults are. Father's/Mother's birthplace columns show where the HEAD's parents were born - they do not name those parents.";
  } else if (recordType === "Death Certificate") {
    proves = `Death date ${deathDate || "unknown"} in ${deathPlace || "unknown"} confirmed. Parents listed as ${father || "unknown"} and ${mother || "unknown"} - provided by ${informant || "informant not listed"}. Treat as lead only.`;
    notProves = `Parent names (${father || "unknown"} and ${mother || "unknown"}) were reported by ${informant || "the informant"} who may not have known the grandparents' details. Verify with birth record.`;
  }

  return { fields, household, recordType, says, proves, notProves };
}
