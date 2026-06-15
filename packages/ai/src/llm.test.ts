import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateIncidentAnalysis } from "./llm.js";
import { IncidentPromptInput } from "./prompts/incident.js";

describe("ObservabilityOS AI Engine", () => {
  const mockInput: IncidentPromptInput = {
    serviceName: "payment-service",
    environment: "prod",
    detectedAt: new Date().toISOString(),
    anomalyMetric: "z-score: 4.2",
    logs: [
      {
        level: "error" as const,
        message:
          "insufficient funds to complete checkout transaction error code err_funds",
        timestamp: new Date().toISOString(),
      },
    ],
    deploys: [
      {
        commitSha: "abcdef123456",
        commitMessage: "Optimized ledger database queries",
        branch: "main",
        deployedAt: new Date().toISOString(),
      },
    ],
  };

  let currentTestTime = Date.now();

  beforeEach(() => {
    currentTestTime += 10000; // Clear cooldown between tests
    vi.spyOn(Date, "now").mockReturnValue(currentTestTime);

    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    delete process.env.AICREDITS_API_KEY;
    delete process.env.AICREDITS_MODEL;
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

  it("should successfully call the AICredits gateway when AICREDITS_API_KEY is configured", async () => {
    process.env.AICREDITS_API_KEY = "test-aicredits-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "AICredits Success Title",
                  summary: "AICredits Summary",
                  rootCause: "AICredits Root",
                  impact: "AICredits Impact",
                  suggestedFix: ["Test Fix"],
                  confidence: 0.97,
                }),
              },
            },
          ],
          usage: { prompt_tokens: 60, completion_tokens: 30 },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(mockInput);
    expect(result.title).toBe("AICredits Success Title");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://aicredits.in/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-aicredits-key",
          "content-type": "application/json",
        }),
      }),
    );
  });

  it("should successfully call the AICredits gateway with custom model when AICREDITS_MODEL is configured", async () => {
    process.env.AICREDITS_API_KEY = "test-aicredits-key";
    process.env.AICREDITS_MODEL = "custom/claude-3-haiku";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Custom Model Success",
                  summary: "Summary",
                  rootCause: "Root",
                  impact: "Impact",
                  suggestedFix: ["Fix"],
                  confidence: 0.95,
                }),
              },
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 25 },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(mockInput);
    expect(result.title).toBe("Custom Model Success");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://aicredits.in/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining('"model":"custom/claude-3-haiku"'),
      }),
    );
  });

  it("should bypass real LLM calls and return mock analysis if playground logs are detected", async () => {
    process.env.AICREDITS_API_KEY = "test-aicredits-key";
    const playgroundInput: IncidentPromptInput = {
      ...mockInput,
      logs: [
        {
          level: "error" as const,
          message: "something went wrong in the simulation",
          timestamp: new Date().toISOString(),
          traceId: "trace_playground_abc123",
        },
      ],
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(playgroundInput);
    // Should fall back to mock heuristics even though API keys are configured
    expect(result.title).toContain("Spike in unresolved errors");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should bypass LLM calls and return mock analysis if bypassLLM is true in incident analysis", async () => {
    process.env.AICREDITS_API_KEY = "test-aicredits-key";
    const bypassInput: IncidentPromptInput = {
      ...mockInput,
      bypassLLM: true,
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateIncidentAnalysis(bypassInput);
    expect(result.title).toContain("insufficient funds");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should bypass LLM calls and return mock summary if bypassLLM is true in email digest", async () => {
    process.env.AICREDITS_API_KEY = "test-aicredits-key";
    const digestInput = {
      projectName: "payment-service",
      incidents: [
        {
          title: "Critical error in DB",
          serviceName: "payment-service",
          environment: "prod",
          status: "open",
          createdAt: new Date().toISOString(),
          rootCause: "DB pool exhaustion",
        },
      ],
      bypassLLM: true,
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { generateEmailDigestSummary } = await import("./llm.js");
    const result = await generateEmailDigestSummary(digestInput);
    expect(result).toContain("SRE anomalies occurred");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
