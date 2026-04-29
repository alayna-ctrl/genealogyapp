const RELATIONSHIP_SUGGESTIONS: Record<string, string> = {
  Spouse: "marriage record, census showing them together, obituary, children's records naming both parents",
  "Connecting Child": "census with child in household, child's birth record, child's death cert naming both parents, obituary",
  Father: "birth/baptism record naming father, census as child in father's household, death cert (lead only)",
  Mother: "birth/baptism record naming mother, census as child in mother's household, marriage record naming bride's parents",
};

export function getRelationshipDefaults(relationshipType: string, relatedName?: string) {
  const claim = relatedName
    ? `Determine whether ${relatedName} is the ${relationshipType.toLowerCase()} of the focus person.`
    : `Determine whether this ${relationshipType.toLowerCase()} relationship is supported by evidence.`;
  return {
    claim,
    suggested_searches: RELATIONSHIP_SUGGESTIONS[relationshipType] ?? "",
  };
}
