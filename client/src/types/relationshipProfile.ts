import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type RelationshipProfileShellData =
  RouterOutputs["relationshipProfile"]["getShell"];
export type RelationshipProfileSalesPricingData =
  RouterOutputs["relationshipProfile"]["getSalesPricing"];
export type RelationshipProfileMoneyData =
  RouterOutputs["relationshipProfile"]["getMoney"];
export type RelationshipProfileSupplyInventoryData =
  RouterOutputs["relationshipProfile"]["getSupplyInventory"];
export type RelationshipProfileActivityData =
  RouterOutputs["relationshipProfile"]["getActivity"];
