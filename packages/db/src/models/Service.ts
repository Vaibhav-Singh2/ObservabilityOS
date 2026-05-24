import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  environment: "prod" | "staging" | "dev";
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceDocument = IService & Document;

const ServiceSchema = new Schema<IService>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    environment: {
      type: String,
      enum: ["prod", "staging", "dev"],
      required: true,
      default: "prod",
    },
  },
  { timestamps: true }
);

// Ensure name is unique per project and environment
ServiceSchema.index({ projectId: 1, name: 1, environment: 1 }, { unique: true });

export const Service: Model<IService> = models.Service || model<IService>("Service", ServiceSchema);
export default Service;
