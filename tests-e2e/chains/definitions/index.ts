/**
 * Chain Definitions Index
 *
 * Exports all chain definitions from all persona and cross-domain modules.
 * Includes write-path chains for full interactive CRUD coverage.
 */

import type { TestChain } from "../types";
import { SALES_CHAINS } from "./sales-chains";
import { INVENTORY_CHAINS } from "./inventory-chains";
import { ACCOUNTING_CHAINS } from "./accounting-chains";
import { OPS_CHAINS } from "./ops-chains";
import { CROSS_DOMAIN_CHAINS } from "./cross-domain-chains";
import { EDGE_CASE_CHAINS } from "./edge-case-chains";
import { WRITE_PATH_SALES_CHAINS } from "./write-path-sales-chains";
import { WRITE_PATH_INVENTORY_CHAINS } from "./write-path-inventory-chains";
import { WRITE_PATH_ACCOUNTING_CHAINS } from "./write-path-accounting-chains";
import { WRITE_PATH_OPS_CHAINS } from "./write-path-ops-chains";

export { SALES_CHAINS } from "./sales-chains";
export { INVENTORY_CHAINS } from "./inventory-chains";
export { ACCOUNTING_CHAINS } from "./accounting-chains";
export { OPS_CHAINS } from "./ops-chains";
export { CROSS_DOMAIN_CHAINS } from "./cross-domain-chains";
export { EDGE_CASE_CHAINS } from "./edge-case-chains";
export { WRITE_PATH_SALES_CHAINS } from "./write-path-sales-chains";
export { WRITE_PATH_INVENTORY_CHAINS } from "./write-path-inventory-chains";
export { WRITE_PATH_ACCOUNTING_CHAINS } from "./write-path-accounting-chains";
export { WRITE_PATH_OPS_CHAINS } from "./write-path-ops-chains";

export const ALL_CHAINS: TestChain[] = [
  ...SALES_CHAINS,
  ...INVENTORY_CHAINS,
  ...ACCOUNTING_CHAINS,
  ...OPS_CHAINS,
  ...CROSS_DOMAIN_CHAINS,
  ...EDGE_CASE_CHAINS,
  ...WRITE_PATH_SALES_CHAINS,
  ...WRITE_PATH_INVENTORY_CHAINS,
  ...WRITE_PATH_ACCOUNTING_CHAINS,
  ...WRITE_PATH_OPS_CHAINS,
];

export function getChainById(chainId: string): TestChain | undefined {
  return ALL_CHAINS.find(c => c.chain_id === chainId);
}

export function getChainsByTag(tag: string): TestChain[] {
  return ALL_CHAINS.filter(c => c.tags.includes(tag));
}

export function getChainsByPersona(personaId: string): TestChain[] {
  const personaTag = `persona:${personaId.split("-")[0]}`;
  return ALL_CHAINS.filter(c => c.tags.includes(personaTag));
}

export function getGoldenFlows(): TestChain[] {
  return ALL_CHAINS.filter(c => c.tags.includes("golden-flow"));
}
