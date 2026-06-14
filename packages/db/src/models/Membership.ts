import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IMembership {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "admin" | "member" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipDocument = IMembership & Document;

const MembershipSchema = new Schema<IMembership>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      required: true,
      default: "member",
    },
  },
  { timestamps: true },
);

// A user can only have one membership per project
MembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const Membership: Model<IMembership> =
  models.Membership || model<IMembership>("Membership", MembershipSchema);
export default Membership;
