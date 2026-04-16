import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        friendUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "blocked", "rejected"],
            default: "pending"
        }
    },
    { timestamps: true }
);

friendSchema.index({ userId: 1, friendUserId: 1 }, { unique: true });

export default mongoose.model("Friend", friendSchema);
