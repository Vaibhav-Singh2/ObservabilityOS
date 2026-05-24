import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IIncident {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  summary: string;
  rootCause: string;
  impact: string;
  suggestedFix: string[];
  confidence: number;
  status: "open" | "investigating" | "resolved";
  relatedLogs: Types.ObjectId[];
  deployId?: Types.ObjectId;
  resolvedAt?: Date;
  ttd: number; // Time-to-detect in ms
  ttr?: number; // Time-to-resolve in ms
  createdAt: Date;
  updatedAt: Date;
}

export type IncidentDocument = IIncident & Document;

const IncidentSchema = new Schema<IIncident>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    rootCause: { type: String, required: true },
    impact: { type: String, required: true },
    suggestedFix: { type: [String], default: [] },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved"],
      required: true,
      default: "open",
      index: true,
    },
    relatedLogs: { type: [{ type: Schema.Types.ObjectId, ref: "Log" }], default: [] },
    deployId: { type: Schema.Types.ObjectId, ref: "Deploy", required: false },
    resolvedAt: { type: Date, required: false },
    ttd: { type: Number, required: true },
    ttr: { type: Number, required: false },
  },
  { timestamps: true }
);

IncidentSchema.index({ projectId: 1, createdAt: -1 });

export const Incident: Model<IIncident> = models.Incident || model<IIncident>("Incident", IncidentSchema);
export default Incident;
