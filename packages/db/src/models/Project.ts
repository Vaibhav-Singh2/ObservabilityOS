import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IProject {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
  slackWebhookUrl?: string;
  minErrorCount?: number;
  zScoreThreshold?: number;
}

export type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema<IProject>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    slackWebhookUrl: { type: String, default: "" },
    minErrorCount: { type: Number, default: 3 },
    zScoreThreshold: { type: Number, default: 3.0 },
  },
  { timestamps: true }
);

export const Project: Model<IProject> = models.Project || model<IProject>("Project", ProjectSchema);
export default Project;
