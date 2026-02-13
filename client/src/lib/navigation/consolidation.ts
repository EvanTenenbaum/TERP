export type RelationshipsTab = "clients" | "suppliers";

export function resolveRelationshipsTab(search: string): RelationshipsTab {
  const params = new URLSearchParams(search);
  const currentTab = params.get("tab");

  if (currentTab === "clients" || currentTab === "suppliers") {
    return currentTab;
  }

  const clientTypes = params.get("clientTypes")?.toLowerCase() ?? "";
  const hasSellerFilter = clientTypes
    .split(",")
    .map(value => value.trim())
    .includes("seller");

  return hasSellerFilter ? "suppliers" : "clients";
}
