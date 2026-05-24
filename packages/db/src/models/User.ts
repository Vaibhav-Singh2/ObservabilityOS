import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  githubId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = IUser & Document;

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    email: { type: String },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);
export default User;
