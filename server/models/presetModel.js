import mongoose from "mongoose";

const presetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    costPerSmoke: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Preset", presetSchema);
