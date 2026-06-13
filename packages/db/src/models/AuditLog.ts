import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IAuditLog {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  targetEntity: string;
  targetId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type AuditLogDocument = IAuditLog & Document;

const AuditLogSchema = new Schema<IAuditLog>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    targetEntity: { type: String, required: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Optimize sorting index on projectId and createdAt
AuditLogSchema.index({ projectId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
