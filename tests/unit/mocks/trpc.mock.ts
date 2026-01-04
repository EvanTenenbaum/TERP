import type { MockInstance } from "vitest";

export function asMockedFunction<TArgs extends unknown[], TResult>(
  fn: unknown
): MockInstance<TResult, TArgs> {
  return fn as MockInstance<TResult, TArgs>;
}
