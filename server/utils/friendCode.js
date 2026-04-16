import User from "../models/userModel.js";

const randomSuffix = () => String(Math.floor(1000 + Math.random() * 9000));

export const buildFriendCode = (username) => `${String(username || "").trim().toLowerCase()}#${randomSuffix()}`;

export const generateUniqueFriendCode = async (username, maxAttempts = 20) => {
    const base = String(username || "").trim().toLowerCase();
    if (!base) {
        throw new Error("Username is required to generate friend code");
    }

    for (let i = 0; i < maxAttempts; i += 1) {
        const candidate = buildFriendCode(base);
        const exists = await User.exists({ uniqueCode: candidate });
        if (!exists) return candidate;
    }

    throw new Error("Unable to generate unique friend code");
};

export const generateUniqueCode = generateUniqueFriendCode;
