import { Schema, model, models, Document, Model } from "mongoose";

export interface IMigration {
  name: string;
  runAt: Date;
}

export type MigrationDocument = IMigration & Document;

const MigrationSchema = new Schema<IMigration>({
  name: { type: String, required: true, unique: true },
  runAt: { type: Date, required: true, default: Date.now },
});

export const Migration: Model<IMigration> =
  models.Migration || model<IMigration>("Migration", MigrationSchema);
export default Migration;
