import PushToken from "../models/pushTokenModel.js";

const normalizePlatform = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "android") return raw;
    return "unknown";
};

export const upsertPushToken = async (req, res) => {
    try {
        const userId = req.user._id;
        const expoPushToken = String(req.body?.expoPushToken || "").trim();
        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: "expoPushToken is required" });
        }

        const platform = normalizePlatform(req.body?.platform);
        const saved = await PushToken.findOneAndUpdate(
            { userId, expoPushToken },
            {
                $set: {
                    platform,
                    enabled: true,
                    lastSeenAt: new Date()
                },
                $setOnInsert: { userId, expoPushToken }
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            token: {
                id: String(saved._id),
                userId: String(saved.userId),
                platform: saved.platform,
                enabled: saved.enabled,
                lastSeenAt: saved.lastSeenAt,
                expoPushToken: saved.expoPushToken
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to register push token", error: error.message });
    }
};

export const disablePushToken = async (req, res) => {
    try {
        const userId = req.user._id;
        const expoPushToken = String(req.body?.expoPushToken || "").trim();
        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: "expoPushToken is required" });
        }

        await PushToken.findOneAndUpdate(
            { userId, expoPushToken },
            { $set: { enabled: false, lastSeenAt: new Date() } }
        );
        return res.status(200).json({ success: true, message: "Push token disabled" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to disable push token", error: error.message });
    }
};
