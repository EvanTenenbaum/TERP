/**
 * Chain Definitions Index
 *
 * NOTE: This file is a stub. The authoritative chain definitions are being built
 * in parallel. This stub exports the required symbols so the spec files compile.
 * It will be replaced by the parallel agent's full output.
 */

import type { TestChain } from "../types";

export const ALL_CHAINS: TestChain[] = [];

export function getChainById(chainId: string): TestChain | undefined {
  return ALL_CHAINS.find(c => c.chain_id === chainId);
}
