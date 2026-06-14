import { connectToDatabase, AuditLog } from "@repo/db";

interface AuditEventParams {
  projectId: string;
  userId: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent({
  projectId,
  userId,
  action,
  targetEntity,
  targetId,
  metadata,
}: AuditEventParams) {
  try {
    await connectToDatabase();
    await AuditLog.create({
      projectId,
      userId,
      action,
      targetEntity,
      targetId,
      metadata,
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
