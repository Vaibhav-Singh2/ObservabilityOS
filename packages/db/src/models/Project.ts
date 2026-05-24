import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export const Project: Model<IProject> = models.Project || model<IProject>("Project", ProjectSchema);
export default Project;
