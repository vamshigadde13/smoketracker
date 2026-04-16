import mongoose from "mongoose";

const pushTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        platform: {
            type: String,
            enum: ["android", "unknown"],
            default: "unknown"
        },
        expoPushToken: {
            type: String,
            required: true,
            trim: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        lastSeenAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

pushTokenSchema.index({ userId: 1, expoPushToken: 1 }, { unique: true });
pushTokenSchema.index({ expoPushToken: 1 });

export default mongoose.model("PushToken", pushTokenSchema);
