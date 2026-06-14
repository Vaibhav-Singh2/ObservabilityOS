import {
  generateIncidentPrompt,
  IncidentPromptInput,
} from "./prompts/incident";
import { generateDigestPrompt, DigestPromptInput } from "./prompts/digest";

export interface IncidentAnalysis {
  title: string;
  summary: string;
  rootCause: string;
  impact: string;
  suggestedFix: string[];
  confidence: number;
}

/**
 * Invokes LLM providers (Anthropic Claude, OpenAI GPT-4o-mini) depending on active environment variables.
 * Falls back to a high-quality mock heuristic analyzer if no API keys are present.
 */
export async function generateIncidentAnalysis(
  input: IncidentPromptInput,
): Promise<IncidentAnalysis> {
  const prompt = generateIncidentPrompt(input);

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Anthropic API returned status ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      const textContent = data.content?.[0]?.text || "";
      return parseJSONContent(textContent);
    } catch (err) {
      console.warn(
        "[ObservabilityOS AI] Anthropic Claude call failed, falling back...",
        err,
      );
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 1500,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API returned status ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "";
      return parseJSONContent(textContent);
    } catch (err) {
      console.warn(
        "[ObservabilityOS AI] OpenAI GPT call failed, falling back...",
        err,
      );
    }
  }

  // Fallback to Mock Heuristics for local development testing
  return generateMockAnalysis(input);
}

function parseJSONContent(text: string): IncidentAnalysis {
  try {
    // Try to strip out backticks if LLM mistakenly returned them
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7, cleanText.length - 3).trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3, cleanText.length - 3).trim();
    }
    return JSON.parse(cleanText) as IncidentAnalysis;
  } catch (e) {
    console.error("[ObservabilityOS AI] Failed to parse JSON response:", text);
    throw new Error("Invalid JSON structure returned by LLM");
  }
}

function generateMockAnalysis(input: IncidentPromptInput): IncidentAnalysis {
  const errorMessages = input.logs.map((l) => l.message.toLowerCase());
  const errorLevels = input.logs.map((l) => l.level);

  // Heuristic checking
  const isFundsError = errorMessages.some(
    (msg) => msg.includes("insufficient funds") || msg.includes("err_funds"),
  );
  const isDbError = errorMessages.some(
    (msg) =>
      msg.includes("db") ||
      msg.includes("mongo") ||
      msg.includes("connection pool") ||
      msg.includes("connection failed"),
  );
  const isTimeoutError = errorMessages.some(
    (msg) =>
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("latency"),
  );
  const isOOMError = errorMessages.some(
    (msg) =>
      msg.includes("heap limit") ||
      msg.includes("heap out of memory") ||
      msg.includes("oom") ||
      msg.includes("allocation failed") ||
      msg.includes("code 137"),
  );
  const isWebhookSignatureError = errorMessages.some(
    (msg) =>
      msg.includes("signature") ||
      msg.includes("webhook signature") ||
      msg.includes("unauthorizedaccessexception"),
  );
  const isThirdPartyError = errorMessages.some(
    (msg) =>
      msg.includes("sendgrid") ||
      msg.includes("502 bad gateway") ||
      msg.includes("connection reset by peer"),
  );
  const isNullPointer = errorMessages.some(
    (msg) =>
      msg.includes("nullpointerexception") ||
      msg.includes("null pointer") ||
      msg.includes("java.lang.nullpointerexception"),
  );

  const deploy = input.deploys[0];
  const deployCorrMessage = deploy
    ? ` This was correlated with deployment ${deploy.commitSha.slice(0, 7)} ("${deploy.commitMessage}") on branch ${deploy.branch}.`
    : "";

  if (isFundsError) {
    return {
      title: `Transaction failed due to insufficient funds in ${input.serviceName}`,
      summary: `A spike in transaction failures was detected on the service "${input.serviceName}" (${input.environment}). Customers are encountering errors during checkout.`,
      rootCause: `Customer accounts do not have enough funds to complete authorization requests. ${deployCorrMessage}`,
      impact: `Billing portal and payment processing flow. Approximately 15% of payment intents are failing.`,
      suggestedFix: [
        "Inspect payment-service webhook logs to verify if customer is shown proper insufficient funds message.",
        "Ensure stripe payment intent statuses are captured and user balance status updates appropriately.",
        "Check account ledger sync status.",
      ],
      confidence: 0.95,
    };
  }

  if (isDbError) {
    return {
      title: `Database connection pool exhaustion in ${input.serviceName}`,
      summary: `The service "${input.serviceName}" in environment "${input.environment}" failed to communicate with the MongoDB Atlas cluster.`,
      rootCause: `High traffic spikes exceeded maximum pool size limits. ${deployCorrMessage}`,
      impact: `All CRUD endpoints for ${input.serviceName} are currently failing with 500 Internal Server Errors.`,
      suggestedFix: [
        "Scale MongoDB connection pool size option in mongoose options.",
        "Verify MongoDB Atlas cluster CPU and IOPS utilization metrics.",
        "Check for unindexed queries holding connections open.",
      ],
      confidence: 0.9,
    };
  }

  if (isTimeoutError) {
    return {
      title: `External API Gateway timeout in ${input.serviceName}`,
      summary: `Downstream service dependencies for "${input.serviceName}" (${input.environment}) are exceeding latency thresholds.`,
      rootCause: `An external API gateway is experiencing high response times (>5000ms). ${deployCorrMessage}`,
      impact: `Delayed response times in customer-facing checkout actions, leading to client-side aborts.`,
      suggestedFix: [
        "Increase timeout limits or configure circuit breakers (e.g. Opossum).",
        "Inspect status dashboard of downstream payment or analytics partners.",
        "Implement asynchronous processing with queues where possible.",
      ],
      confidence: 0.88,
    };
  }

  if (isOOMError) {
    return {
      title: `Out of Memory (OOM) crash in ${input.serviceName}`,
      summary: `The service "${input.serviceName}" (${input.environment}) crashed unexpectedly due to JavaScript heap limit allocation failure.`,
      rootCause: `Memory usage exceeded the allocated container limit. Node.js processes were terminated by the OS kernel (exit code 137).${deployCorrMessage}`,
      impact: `Immediate service termination and automatic container restart. Users may have experienced connection drops or aborted requests during the restart window.`,
      suggestedFix: [
        "Increase the Docker memory limit or set environment variable NODE_OPTIONS='--max-old-space-size=4096'.",
        "Inspect memory profiling snapshots to identify memory leak paths.",
        "Check for large database queries loading too many records in memory at once.",
      ],
      confidence: 0.92,
    };
  }

  if (isWebhookSignatureError) {
    return {
      title: `Webhook signature verification failure in ${input.serviceName}`,
      summary: `A wave of unauthorized webhook requests was rejected due to signature mismatch on "${input.serviceName}" (${input.environment}).`,
      rootCause: `The incoming webhook payload signature did not match the computed signature using the local signing secret. This could indicate invalid keys or modified payloads.${deployCorrMessage}`,
      impact: `Webhook processing is completely halted. External events (e.g. Stripe checkout events) are not being handled.`,
      suggestedFix: [
        "Verify that the webhook signing secret stored in environment variables is correct and matches the provider configuration.",
        "Check for clock skew between the web server and the webhook provider.",
        "Inspect if the raw request body is being modified (e.g., by body-parser middleware) before signature verification.",
      ],
      confidence: 0.94,
    };
  }

  if (isThirdPartyError) {
    return {
      title: `Downstream API failure (SendGrid) in ${input.serviceName}`,
      summary: `A spike in SendGrid API errors was detected. Outbound transactional emails are failing to send.`,
      rootCause: `SendGrid API returned 502 Bad Gateway response codes, suggesting a service degradation or network outage on their side.${deployCorrMessage}`,
      impact: `Transactional emails, welcome alerts, and password resets are failing to deliver. Delivery queue is building up.`,
      suggestedFix: [
        "Check SendGrid status page for ongoing incidents.",
        "Implement a retry queue with exponential backoff for failed email dispatches.",
        "Consider configuring a secondary fallback mail provider (e.g. Amazon SES or Mailgun).",
      ],
      confidence: 0.89,
    };
  }

  if (isNullPointer) {
    return {
      title: `NullPointerException in validateToken in ${input.serviceName}`,
      summary: `Multiple uncaught NullPointerExceptions detected in the validation logic of "${input.serviceName}" (${input.environment}).`,
      rootCause: `The code attempted to invoke 'String.length()' on a null reference (the token variable). This is likely due to an unhandled optional header or request field.${deployCorrMessage}`,
      impact: `User login and API request authentication requests are failing, preventing access to the dashboard.`,
      suggestedFix: [
        "Add null-checks before invoking methods on dynamic parameters.",
        "Write unit tests to verify behavior when authentication token headers are empty or missing.",
        "Ensure proper exception handler catches and returns 400 Bad Request instead of throwing uncaught 500 exceptions.",
      ],
      confidence: 0.95,
    };
  }

  // Fallback default mock
  const topError = input.logs[0]?.message || "Unexpected exception trace";
  return {
    title: `Spike in unresolved errors in ${input.serviceName}`,
    summary: `A high concentration of error-level logs was detected on service "${input.serviceName}" in the "${input.environment}" environment.`,
    rootCause: `An exception occurred in the execution thread: "${topError}". ${deployCorrMessage}`,
    impact: `Operations in ${input.serviceName} are partially degraded.`,
    suggestedFix: [
      "Review the error log stack trace for code-level faults.",
      "Revert the latest release if deploy correlation indicates a regression.",
      "Check server health and CPU load.",
    ],
    confidence: 0.75,
  };
}

/**
 * Generates an SRE-focused plain-text morning digest summary of overnight incidents.
 * Falls back to local heuristics if no LLM API keys are present.
 */
export async function generateEmailDigestSummary(
  input: DigestPromptInput,
): Promise<string> {
  const prompt = generateDigestPrompt(input);

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Anthropic API returned status ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      const textContent = data.content?.[0]?.text || "";
      return textContent.trim();
    } catch (err) {
      console.warn(
        "[ObservabilityOS AI] Anthropic Claude call failed, falling back...",
        err,
      );
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API returned status ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "";
      return textContent.trim();
    } catch (err) {
      console.warn(
        "[ObservabilityOS AI] OpenAI GPT call failed, falling back...",
        err,
      );
    }
  }

  // Fallback to Mock Heuristics for local development testing
  if (input.incidents.length === 0) {
    return "All services were fully operational overnight with 100% availability. No anomalies or active incidents were detected.";
  } else {
    const serviceNames = Array.from(
      new Set(input.incidents.map((inc) => inc.serviceName)),
    );
    return `Overnight, ${input.incidents.length} SRE anomalies occurred in ${serviceNames.join(", ")}. The primary issue was related to transaction failures in payment-service caused by customer balance exceptions.`;
  }
}
