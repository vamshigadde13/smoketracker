import mongoose from "mongoose";

const circleSettingsSchema = new mongoose.Schema(
    {
        circleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Circle",
            required: true,
            unique: true,
            index: true
        },
        liveNotificationsEnabled: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

export default mongoose.model("CircleSettings", circleSettingsSchema);
