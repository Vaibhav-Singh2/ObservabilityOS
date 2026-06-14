import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface ISavedQuery {
  name: string;
  query: string;
  level: string;
  serviceId: string;
  environment: string;
  timeRange: string;
}

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
  plan: "free" | "pro";
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "none";
  billingProvider: "stripe" | "razorpay" | "manual" | "none";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  savedQueries?: ISavedQuery[];
}

export type ProjectDocument = IProject & Document;

const SavedQuerySchema = new Schema<ISavedQuery>({
  name: { type: String, required: true },
  query: { type: String, default: "" },
  level: { type: String, default: "all" },
  serviceId: { type: String, default: "all" },
  environment: { type: String, default: "all" },
  timeRange: { type: String, default: "24h" },
});

const ProjectSchema = new Schema<IProject>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    slackWebhookUrl: { type: String, default: "" },
    discordWebhookUrl: { type: String, default: "" },
    teamsWebhookUrl: { type: String, default: "" },
    minErrorCount: { type: Number, default: 3 },
    zScoreThreshold: { type: Number, default: 3.0 },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "none"],
      default: "none",
    },
    billingProvider: {
      type: String,
      enum: ["stripe", "razorpay", "manual", "none"],
      default: "none",
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    razorpayCustomerId: { type: String },
    razorpaySubscriptionId: { type: String },
    savedQueries: { type: [SavedQuerySchema], default: [] },
  },
  { timestamps: true },
);

export const Project: Model<IProject> =
  models.Project || model<IProject>("Project", ProjectSchema);
export default Project;
