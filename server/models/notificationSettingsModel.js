import mongoose from "mongoose";

const clockTimeSchema = new mongoose.Schema(
  {
    hour: { type: Number, min: 0, max: 23, required: true },
    minute: { type: Number, min: 0, max: 59, required: true },
  },
  { _id: false }
);

const notificationSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    enabledDailyCheckin: { type: Boolean, default: false },
    enabledNoLogNudge: { type: Boolean, default: false },
    dailyTime: {
      type: clockTimeSchema,
      default: () => ({ hour: 20, minute: 0 }),
    },
    quietHoursEnabled: { type: Boolean, default: true },
    quietStart: {
      type: clockTimeSchema,
      default: () => ({ hour: 22, minute: 0 }),
    },
    quietEnd: {
      type: clockTimeSchema,
      default: () => ({ hour: 8, minute: 0 }),
    },
    permissionAsked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("NotificationSettings", notificationSettingsSchema);
