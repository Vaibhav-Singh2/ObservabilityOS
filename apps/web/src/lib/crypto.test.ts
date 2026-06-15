import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "./crypto";

describe("Crypto Utilities", () => {
  it("should generate plain-text API keys with the correct prefix and length", () => {
    const key = generateApiKey();
    expect(key).toBeDefined();
    expect(key.startsWith("obs_sk_")).toBe(true);
    // obs_sk_ is 7 chars. 24 bytes of hex is 48 chars. 7 + 48 = 55 chars.
    expect(key.length).toBe(55);
  });

  it("should generate unique API keys on successive calls", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  it("should securely hash API keys to a 64-character SHA-256 hex string", () => {
    const key = "obs_sk_1234567890abcdef";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    // Matches hex string pattern
    expect(hash1).matches(/^[0-9a-f]{64}$/);
  });
});
