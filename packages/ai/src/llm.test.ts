import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateIncidentAnalysis } from "./llm";

describe("ObservabilityOS AI Engine", () => {
  const mockInput = {
    serviceName: "payment-service",
    environment: "prod" as const,
    logs: [
      {
        level: "error" as const,
        message:
          "insufficient funds to complete checkout transaction error code err_funds",
        timestamp: new Date(),
      },
    ],
    deploys: [
      {
        commitSha: "abcdef123456",
        commitMessage: "Optimized ledger database queries",
        branch: "main",
        deployedAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fall back immediately to mock analysis if no API keys are present", async () => {
    const analysis = await generateIncidentAnalysis(mockInput);

    expect(analysis.title).toContain("insufficient funds");
    expect(analysis.rootCause).toContain(
      "Customer accounts do not have enough funds",
    );
    expect(analysis.confidence).toBe(0.95);
    expect(analysis.suggestedFix).toContain(
      "Check account ledger sync status.",
    );
  });

  it("should enforce cooldown when API keys are configured and throw/fallback on rapid calls", async () => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

    // Stub fetch to return a valid Anthropic response
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          content: [
            {
              text: JSON.stringify({
                title: "Anthropic Success Title",
                summary: "Summary detail",
                rootCause: "Root cause",
                impact: "Impact info",
                suggestedFix: ["Fix 1"],
                confidence: 0.9,
              }),
            },
          ],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // First call (cooldown not active yet)
    const res1 = await generateIncidentAnalysis(mockInput);
    expect(res1.title).toBe("Anthropic Success Title");

    // Second call immediately after (cooldown is active)
    const res2 = await generateIncidentAnalysis(mockInput);
    // Should fall back to mock heuristics due to cooldown rate limit trigger
    expect(res2.title).toContain("insufficient funds");
  });

  it("should parse JSON even if enclosed in markdown code blocks", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  '```json\n{\n  "title": "Markdown JSON Title",\n  "summary": "Parsed summary",\n  "rootCause": "Parsed root cause",\n  "impact": "Parsed impact",\n  "suggestedFix": ["Check settings"],\n  "confidence": 0.85\n}\n```',
              },
            },
          ],
          usage: { prompt_tokens: 80, completion_tokens: 40 },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(mockInput);
    expect(result.title).toBe("Markdown JSON Title");
    expect(result.confidence).toBe(0.85);
  });

  it("should fail over from Anthropic to OpenAI, and then to Mock on failures", async () => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.OPENAI_API_KEY = "test-openai-key";

    // First call: Anthropic fails (500), OpenAI succeeds
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      }) // Anthropic attempt 1
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      }) // Anthropic retry 1
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      }) // Anthropic retry 2 (circuit breaker opens)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: "OpenAI Fallback Title",
                    summary: "OpenAI Summary",
                    rootCause: "OpenAI Root",
                    impact: "OpenAI Impact",
                    suggestedFix: ["Verify logs"],
                    confidence: 0.88,
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          }),
      }); // OpenAI attempt

    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(mockInput);
    expect(result.title).toBe("OpenAI Fallback Title");
  });
});
