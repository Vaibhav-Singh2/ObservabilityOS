import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = IComment & Document;

const CommentSchema = new Schema<IComment>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// Add index on incidentId and createdAt to optimize retrieval of a thread
CommentSchema.index({ incidentId: 1, createdAt: 1 });

export const Comment: Model<IComment> = models.Comment || model<IComment>("Comment", CommentSchema);
export default Comment;
