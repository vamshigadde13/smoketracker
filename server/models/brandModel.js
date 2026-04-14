import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

brandSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model("Brand", brandSchema);
