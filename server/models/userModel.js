import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        uniqueCode: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        displayName: {
            type: String,
            default: "",
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        avatarUrl: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);

