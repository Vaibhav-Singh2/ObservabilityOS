export interface PostMortemIncident {
  id: string;
  title: string;
  summary: string;
  rootCause: string;
  impact: string;
  suggestedFix: string[];
  confidence: number;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  ttd: number;
  ttr: number | null;
  service: {
    name: string;
    environment: string;
  } | null;
  deploy: {
    commitSha: string;
    commitMessage: string;
    branch: string;
    deployedAt: string | null;
  } | null;
}

export interface PostMortemLog {
  timestamp: string;
  level: string;
  message: string;
  traceId: string | null;
  metadata: any;
}

export interface PostMortemComment {
  content: string;
  createdAt: string;
  user: {
    username: string;
    email?: string;
  } | null;
}

export function generatePostMortemMarkdown(
  incident: PostMortemIncident,
  logs: PostMortemLog[],
  comments: PostMortemComment[]
): string {
  const createdDate = new Date(incident.createdAt).toLocaleString();
  const resolvedDate = incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : "Unresolved";
  const detectionDelay = `${Math.round(incident.ttd / 1000)} seconds`;
  const resolutionTime = incident.ttr
    ? `${Math.round(incident.ttr / 1000 / 60)} minutes ${Math.round((incident.ttr / 1000) % 60)} seconds`
    : "N/A";

  const suggestedFixes = incident.suggestedFix.length > 0
    ? incident.suggestedFix.map((step) => `- [ ] ${step}`).join("\n")
    : "*No suggested fixes provided by AI.*";

  const deploymentsInfo = incident.deploy
    ? `### Deployment Details
- **Commit SHA**: \`${incident.deploy.commitSha.slice(0, 7)}\` (\`${incident.deploy.commitSha}\`)
- **Commit Message**: ${incident.deploy.commitMessage}
- **Branch**: ${incident.deploy.branch}
- **Deployed At**: ${incident.deploy.deployedAt ? new Date(incident.deploy.deployedAt).toLocaleString() : "N/A"}`
    : "*No software deployment events were recorded close to the onset of this anomaly.*";

  const logRows = logs.length > 0
    ? logs
        .map((log) => {
          const logTime = new Date(log.timestamp).toLocaleTimeString();
          const traceStr = log.traceId ? `\`${log.traceId.slice(0, 8)}\`` : "-";
          // Escape markdown pipes in messages
          const cleanMessage = log.message.replace(/\|/g, "\\|");
          return `| ${logTime} | ${log.level.toUpperCase()} | ${traceStr} | ${cleanMessage} |`;
        })
        .join("\n")
    : "| - | - | - | No anomalous logs recorded |";

  const commentsTimeline = comments.length > 0
    ? comments
        .map((c) => {
          const author = c.user ? c.user.username : "Unknown User";
          const emailStr = c.user?.email ? ` (${c.user.email})` : "";
          const commentTime = new Date(c.createdAt).toLocaleString();
          return `### ${author}${emailStr} — *${commentTime}*\n${c.content}`;
        })
        .join("\n\n---\n\n")
    : "*No collaboration comments have been posted on this incident.*";

  return `# Post-Mortem Report: ${incident.title}

## Incident Metadata
- **Incident ID**: \`${incident.id}\`
- **Service Affected**: \`${incident.service ? incident.service.name : "N/A"}\`
- **Environment**: \`${incident.service ? incident.service.environment.toUpperCase() : "N/A"}\`
- **Current Status**: \`${incident.status.toUpperCase()}\`
- **Detected At**: ${createdDate}
- **Resolved At**: ${resolvedDate}
- **Detection Delay**: ${detectionDelay}
- **Time to Resolve**: ${resolutionTime}
- **AI Classification Confidence**: ${Math.round(incident.confidence * 100)}%

---

## 1. AI Analysis & Narrative Summary

### Summary
${incident.summary}

### Impact Analysis
${incident.impact}

---

## 2. Root Cause & Correlation

### Root Cause Analysis
${incident.rootCause}

${deploymentsInfo}

---

## 3. Anomalous Log Stream Timeline
*The following ${logs.length} error logs occurred in the anomalous window.*

| Local Time | Level | Trace ID | Message |
| --- | --- | --- | --- |
${logRows}

---

## 4. Troubleshooting Checklist & Action Plan
*Suggested steps followed or planned during isolation and resolution:*

${suggestedFixes}

---

## 5. Collaboration Timeline & Notes
*SRE collaboration thread during active investigation:*

${commentsTimeline}
`;
}
