import { describe, expect, it } from "vitest";
import { sha256, stableJson } from "../src/core/hash.js";

describe("canonical event hashing", () => {
  it("is stable across object key order", () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}',
    );
    expect(sha256({ a: 1, b: 2 })).toBe(sha256({ b: 2, a: 1 }));
  });
});
