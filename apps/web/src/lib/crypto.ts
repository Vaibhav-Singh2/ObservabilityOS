import crypto from "crypto";

/**
 * Generates a cryptographically secure plain-text API key.
 */
export function generateApiKey(): string {
  return `obs_sk_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Hashes a plain-text API key using SHA-256.
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}
