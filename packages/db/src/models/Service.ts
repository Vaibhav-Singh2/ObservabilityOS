import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface ISlo {
  name: string;
  type: "availability" | "latency";
  target: number; // e.g. 99.0
  windowDays: number; // e.g. 7 or 30
  latencyThresholdMs?: number; // only required for latency type
  status?: "healthy" | "warning" | "breached";
}

export interface IService {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  environment: "prod" | "staging" | "dev";
  slos?: ISlo[];
  runbookUrl?: string;
  troubleshootingSteps?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceDocument = IService & Document;

const SloSchema = new Schema<ISlo>({
  name: { type: String, required: true },
  type: { type: String, enum: ["availability", "latency"], required: true },
  target: { type: Number, required: true },
  windowDays: { type: Number, required: true, default: 30 },
  latencyThresholdMs: { type: Number },
  status: {
    type: String,
    enum: ["healthy", "warning", "breached"],
    default: "healthy",
  },
});

const ServiceSchema = new Schema<IService>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    environment: {
      type: String,
      enum: ["prod", "staging", "dev"],
      required: true,
      default: "prod",
    },
    slos: { type: [SloSchema], default: [] },
    runbookUrl: { type: String, required: false },
    troubleshootingSteps: { type: String, required: false },
  },
  { timestamps: true },
);

// Ensure name is unique per project and environment
ServiceSchema.index(
  { projectId: 1, name: 1, environment: 1 },
  { unique: true },
);

export const Service: Model<IService> =
  models.Service || model<IService>("Service", ServiceSchema);
export default Service;
