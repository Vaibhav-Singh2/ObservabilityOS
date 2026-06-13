export interface ExportableLog {
  timestamp: Date | string;
  level: string;
  message: string;
  traceId?: string | null;
  metadata?: any;
  service?: {
    name: string;
    environment: string;
  } | null;
}

export function exportLogsToCSV(logs: ExportableLog[]): string {
  const headers = ["Timestamp", "Level", "Service", "Environment", "Message", "Trace ID", "Metadata"];
  
  const rows = logs.map((log) => {
    const serviceName = log.service ? log.service.name : "N/A";
    const env = log.service ? log.service.environment : "N/A";
    const trace = log.traceId || "";
    const metaStr = log.metadata ? JSON.stringify(log.metadata) : "";
    
    // Escapes cell values to be CSV-compliant (handles double quotes, commas, newlines)
    const escape = (val: string) => {
      const escaped = val.replace(/"/g, '""');
      if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n") || escaped.includes("\r")) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    return [
      escape(new Date(log.timestamp).toISOString()),
      escape(log.level),
      escape(serviceName),
      escape(env),
      escape(log.message),
      escape(trace),
      escape(metaStr),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function exportLogsToJSON(logs: ExportableLog[]): string {
  const formatted = logs.map((log) => ({
    timestamp: new Date(log.timestamp).toISOString(),
    level: log.level,
    service: log.service ? { name: log.service.name, environment: log.service.environment } : null,
    message: log.message,
    traceId: log.traceId || null,
    metadata: log.metadata || {},
  }));

  return JSON.stringify(formatted, null, 2);
}
