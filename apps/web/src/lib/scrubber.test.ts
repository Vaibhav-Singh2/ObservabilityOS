import { describe, it, expect } from "vitest";
import { scrubText, scrubObject } from "./scrubber";

describe("PII Scrubber", () => {
  describe("scrubText", () => {
    it("should redact email addresses", () => {
      expect(scrubText("Contact us at support@example.com for help.")).toBe(
        "Contact us at [EMAIL_REDACTED] for help.",
      );
      expect(scrubText("Emails: a@b.co and test.user+label@domain.org")).toBe(
        "Emails: [EMAIL_REDACTED] and [EMAIL_REDACTED]",
      );
    });

    it("should redact JWT tokens", () => {
      const jwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      expect(scrubText(`Session token is: ${jwtToken}`)).toBe(
        "Session token is: [JWT_REDACTED]",
      );
    });

    it("should redact credit card numbers", () => {
      expect(scrubText("My card is 4111111111111111.")).toBe(
        "My card is [CARD_REDACTED].",
      );
      // Visa, Mastercard, Discover, Amex regex checks
      expect(scrubText("Charge card 5105105105105105")).toBe(
        "Charge card [CARD_REDACTED]",
      );
    });

    it("should redact database URIs passwords", () => {
      expect(
        scrubText(
          "Connected to mongodb+srv://admin:my-secret-pass@cluster0.mongodb.net/db",
        ),
      ).toBe(
        "Connected to mongodb+srv://admin:[PASSWORD_REDACTED]@cluster0.mongodb.net/db",
      );
      expect(scrubText("postgres://user:pass123@localhost:5432/dbname")).toBe(
        "postgres://user:[PASSWORD_REDACTED]@localhost:5432/dbname",
      );
    });

    it("should redact authorization headers values", () => {
      expect(scrubText("Headers: Authorization: Bearer abc-123-xyz")).toBe(
        "Headers: Authorization: Bearer [TOKEN_REDACTED]",
      );
      expect(scrubText("Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==")).toBe(
        "Basic [TOKEN_REDACTED]",
      );
    });
  });

  describe("scrubObject", () => {
    it("should redact sensitive keys fully", () => {
      const input = {
        username: "john_doe",
        password: "my-secure-password",
        secrets: {
          api_key: "obs_sk_12345",
          token: "jwt_token_here",
        },
        publicInfo: "Not sensitive",
      };

      const expected = {
        username: "john_doe",
        password: "[REDACTED]",
        secrets: {
          api_key: "[REDACTED]",
          token: "[REDACTED]",
        },
        publicInfo: "Not sensitive",
      };

      expect(scrubObject(input)).toEqual(expected);
    });

    it("should scrub text patterns in non-sensitive object keys", () => {
      const input = {
        name: "Alice",
        message:
          "Send email to alice@gmail.com and charge card 4111111111111111",
      };

      const expected = {
        name: "Alice",
        message:
          "Send email to [EMAIL_REDACTED] and charge card [CARD_REDACTED]",
      };

      expect(scrubObject(input)).toEqual(expected);
    });

    it("should recursively scrub arrays", () => {
      const input = [
        { email: "a@b.com" },
        { password: "123" },
        "Contact b@c.com",
      ];

      const expected = [
        { email: "[EMAIL_REDACTED]" },
        { password: "[REDACTED]" },
        "Contact [EMAIL_REDACTED]",
      ];

      expect(scrubObject(input)).toEqual(expected);
    });
  });
});
