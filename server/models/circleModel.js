import mongoose from "mongoose";

const circleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

export default mongoose.model("Circle", circleSchema);
