import { Schema, model, models, Document, Types, Model } from "mongoose";
import { IProject } from "./Project";
import { IService } from "./Service";

export interface IDeploy {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  serviceId: Types.ObjectId;
  commitSha: string;
  commitMessage: string;
  branch: string;
  environment: "prod" | "staging" | "dev";
  deployedAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type DeployDocument = IDeploy & Document;

const DeploySchema = new Schema<IDeploy>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    commitSha: { type: String, required: true },
    commitMessage: { type: String, required: true },
    branch: { type: String, required: true },
    environment: {
      type: String,
      enum: ["prod", "staging", "dev"],
      required: true,
      default: "prod",
    },
    deployedAt: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

DeploySchema.index({
  projectId: 1,
  serviceId: 1,
  environment: 1,
  deployedAt: -1,
});

export const Deploy: Model<IDeploy> =
  models.Deploy || model<IDeploy>("Deploy", DeploySchema);
export default Deploy;
