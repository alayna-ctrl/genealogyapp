import { parseProfileText } from "../src/lib/parsers.ts";

const sample = `Print Customize CancelPublish with MyCanvas
Ancestry
Profile image
Gretchen Lou Snyder
Birth 28 OCT 1935 • Mt Vernon, Knox County, Ohio, USA
Death 8 APR 2024 • Double Oak, Denton, Texas, USA
paternal grandmother`;

const parsed = parseProfileText(sample);
console.log(parsed);
