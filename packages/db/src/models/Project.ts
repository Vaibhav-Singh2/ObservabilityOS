import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface IProject {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  teamsWebhookUrl?: string;
  minErrorCount?: number;
  zScoreThreshold?: number;
  plan: 'free' | 'pro';
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  billingProvider: 'stripe' | 'razorpay' | 'manual' | 'none';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
}

export type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema<IProject>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    slackWebhookUrl: { type: String, default: "" },
    discordWebhookUrl: { type: String, default: "" },
    teamsWebhookUrl: { type: String, default: "" },
    minErrorCount: { type: Number, default: 3 },
    zScoreThreshold: { type: Number, default: 3.0 },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    subscriptionStatus: { type: String, enum: ["active", "trialing", "past_due", "canceled", "none"], default: "none" },
    billingProvider: { type: String, enum: ["stripe", "razorpay", "manual", "none"], default: "none" },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    razorpayCustomerId: { type: String },
    razorpaySubscriptionId: { type: String },
  },
  { timestamps: true }
);

export const Project: Model<IProject> = models.Project || model<IProject>("Project", ProjectSchema);
export default Project;
