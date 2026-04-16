import mongoose from "mongoose";

const circleMemberSchema = new mongoose.Schema(
    {
        circleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Circle",
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member"
        }
    },
    { timestamps: true }
);

circleMemberSchema.index({ circleId: 1, userId: 1 }, { unique: true });

export default mongoose.model("CircleMember", circleMemberSchema);
