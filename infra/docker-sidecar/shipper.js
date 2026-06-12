const fs = require("fs");
const readline = require("readline");

// Retrieve configuration from environment variables
const API_URL = process.env.API_URL || "http://host.docker.internal:3000/api/ingest";
const API_KEY = process.env.API_KEY || "";
const SERVICE_NAME = process.env.SERVICE_NAME || "sidecar-service";
const ENVIRONMENT = process.env.ENVIRONMENT || "prod"; // prod, staging, dev
const LOG_FILE = process.env.LOG_FILE || "";
const FLUSH_INTERVAL_MS = parseInt(process.env.FLUSH_INTERVAL_MS || "2000", 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "20", 10);

if (!API_KEY) {
  console.error("[ObservabilityOS Sidecar] Error: API_KEY is required.");
  process.exit(1);
}

console.log(`[ObservabilityOS Sidecar] Starting log-shipper...`);
console.log(`[ObservabilityOS Sidecar] Target Ingest Endpoint: ${API_URL}`);
console.log(`[ObservabilityOS Sidecar] Service: ${SERVICE_NAME} | Env: ${ENVIRONMENT}`);

let logBuffer = [];
let flushTimeout = null;

// Flush logs to the server
async function flushLogs() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (logBuffer.length === 0) return;

  const payload = [...logBuffer];
  logBuffer = [];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[ObservabilityOS Sidecar] Failed to push logs (status ${response.status}):`, text);
    } else {
      console.log(`[ObservabilityOS Sidecar] Successfully shipped ${payload.length} log events.`);
    }
  } catch (err) {
    console.error("[ObservabilityOS Sidecar] Connection error posting logs:", err.message);
    // Keep failed logs in buffer or discard based on policy.
    // For simplicity, we discard/log them to avoid memory leaks.
  }
}

// Process a raw log line
function processLine(line) {
  if (!line || !line.trim()) return;

  let logItem = {
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString(),
    level: "info",
    message: line,
    metadata: { source: "sidecar-shipper" },
  };

  // Attempt to parse line as JSON if possible
  try {
    const parsed = JSON.parse(line);
    // If it's already a fully formed log item, keep its structure
    if (parsed.message) {
      logItem.message = parsed.message;
      if (parsed.service) logItem.service = parsed.service;
      if (parsed.environment) logItem.environment = parsed.environment;
      if (parsed.level) logItem.level = parsed.level;
      if (parsed.timestamp) logItem.timestamp = parsed.timestamp;
      if (parsed.metadata) logItem.metadata = { ...logItem.metadata, ...parsed.metadata };
      if (parsed.traceId) logItem.traceId = parsed.traceId;
    } else {
      logItem.metadata = { ...logItem.metadata, ...parsed };
    }
  } catch (e) {
    // If it's raw text, parse levels heuristically
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("error") || lowerLine.includes("exception") || lowerLine.includes("fail")) {
      logItem.level = "error";
    } else if (lowerLine.includes("warn")) {
      logItem.level = "warn";
    } else if (lowerLine.includes("debug")) {
      logItem.level = "debug";
    }
  }

  logBuffer.push(logItem);

  if (logBuffer.length >= BATCH_SIZE) {
    flushLogs();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, FLUSH_INTERVAL_MS);
  }
}

// Set up source readers
if (LOG_FILE) {
  console.log(`[ObservabilityOS Sidecar] Tailing file: ${LOG_FILE}`);
  // Check if file exists, if not, create it
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "");
  }

  let filePosition = fs.statSync(LOG_FILE).size;

  fs.watch(LOG_FILE, (eventType) => {
    if (eventType === "change") {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size < filePosition) {
        // File was truncated
        filePosition = 0;
      }
      
      const stream = fs.createReadStream(LOG_FILE, {
        start: filePosition,
        end: stats.size,
        encoding: "utf8"
      });

      filePosition = stats.size;

      const rl = readline.createInterface({
        input: stream,
        terminal: false
      });

      rl.on("line", (line) => {
        processLine(line);
      });
    }
  });
} else {
  console.log("[ObservabilityOS Sidecar] Reading logs from standard input (stdin)...");
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on("line", (line) => {
    processLine(line);
  });
}

// Clean flush on shutdown
process.on("SIGINT", async () => {
  console.log("[ObservabilityOS Sidecar] Shutting down, flushing buffer...");
  await flushLogs();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[ObservabilityOS Sidecar] Terminated, flushing buffer...");
  await flushLogs();
  process.exit(0);
});
