import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
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
        }
    },
    { timestamps: true }
);

export default mongoose.model("Entry", entrySchema);
