export const RELATIONSHIP_PROFILE_SECTIONS = [
  "overview",
  "sales-pricing",
  "money",
  "supply-inventory",
  "activity",
] as const;

export type RelationshipProfileSection =
  (typeof RELATIONSHIP_PROFILE_SECTIONS)[number];

const SECTION_SET = new Set<RelationshipProfileSection>(
  RELATIONSHIP_PROFILE_SECTIONS
);

export const LEGACY_PROFILE_TAB_TO_SECTION: Record<
  string,
  RelationshipProfileSection
> = {
  overview: "overview",
  supplier: "overview",
  "live-catalog": "overview",
  pricing: "sales-pricing",
  needs: "sales-pricing",
  history: "money",
  transactions: "money",
  payments: "money",
  communications: "activity",
  calendar: "activity",
  notes: "activity",
};

export function isRelationshipProfileSection(
  value: string | null | undefined
): value is RelationshipProfileSection {
  return Boolean(value && SECTION_SET.has(value as RelationshipProfileSection));
}

export function resolveRelationshipProfileSection(
  search: string
): RelationshipProfileSection {
  const params = new URLSearchParams(search);
  const section = params.get("section");
  if (isRelationshipProfileSection(section)) {
    return section;
  }

  const legacyTab = params.get("tab");
  if (legacyTab && LEGACY_PROFILE_TAB_TO_SECTION[legacyTab]) {
    return LEGACY_PROFILE_TAB_TO_SECTION[legacyTab];
  }

  return "overview";
}

export function buildRelationshipProfilePath(
  clientId: number,
  section: RelationshipProfileSection = "overview"
): string {
  const params = new URLSearchParams();
  params.set("section", section);
  return `/clients/${clientId}?${params.toString()}`;
}
