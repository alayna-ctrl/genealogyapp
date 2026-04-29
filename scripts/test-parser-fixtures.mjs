import { parseProfileText, parseRecordText } from "../src/lib/parsers.ts";

const profileFixture = `Print
Ancestry
Jane Marie Doe
Birth 12 JAN 1912 • Ohio, USA
Death 08 APR 1994 • Texas, USA
Parents
John Doe
Mary Smith
Spouse and Children
Robert Doe
Helen Doe`;

const recordFixture = `Name\tJane M Doe
Residence Date\t1940
Residence Place\tDallas, Texas
Age\t28
Household Members
Jane M Doe\t28\tHead
Robert Doe\t30\tHusband`;

const profile = parseProfileText(profileFixture);
const record = parseRecordText(recordFixture);

if (!profile.name || !profile.father || !profile.mother) {
  throw new Error("Profile parser fixture failed");
}
if (!record.recordType || !record.says || !record.proves) {
  throw new Error("Record parser fixture failed");
}

console.log("Parser fixtures passed", {
  profileName: profile.name,
  recordType: record.recordType,
  confidence: record.confidence,
});
