import mongoose from "mongoose";

const objectId = mongoose.Schema.Types.ObjectId;

const entrySchema = new mongoose.Schema(
    {
        userId: {
            type: objectId,
            ref: "User",
            required: true,
            index: true
        },
        brand: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        cost: {
            type: Number,
            min: 0,
            default: null
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        },
        shareToCircle: {
            type: Boolean,
            default: false
        },
        shareCircleIds: {
            type: [objectId],
            ref: "Circle",
            default: []
        },
        shareFriendIds: {
            type: [objectId],
            ref: "User",
            default: []
        },
        circleId: {
            type: objectId,
            ref: "Circle",
            default: null
        }
    },
    { timestamps: true }
);

export default mongoose.model("Entry", entrySchema);
