import CircleMember from "../models/circleMemberModel.js";
import PushToken from "../models/pushTokenModel.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
};

const isInvalidTokenError = (details) => {
    const code = String(details?.error || details?.code || "");
    return code === "DeviceNotRegistered";
};

export const notifyCircleMembersExceptSender = async ({ circleId, senderId, message }) => {
    const members = await CircleMember.find({ circleId, userId: { $ne: senderId } }).select("userId");
    if (!members.length) {
        console.log("[LiveNotification] no recipients", { circleId: String(circleId) });
        return 0;
    }

    const recipientIds = members.map((m) => m.userId);
    const activeTokens = await PushToken.find({
        userId: { $in: recipientIds },
        enabled: true
    }).select("_id userId expoPushToken");

    if (!activeTokens.length) {
        console.log("[LiveNotification] recipients have no active push tokens", {
            circleId: String(circleId),
            recipients: recipientIds.length
        });
        return 0;
    }

    const payloads = activeTokens.map((tokenDoc) => ({
        to: tokenDoc.expoPushToken,
        sound: "default",
        title: "Circle activity",
        body: message,
        data: {
            type: "circle_live_entry",
            circleId: String(circleId),
            senderId: String(senderId),
            userId: String(tokenDoc.userId)
        }
    }));

    const batches = chunkArray(payloads, BATCH_SIZE);
    const invalidTokenIds = new Set();
    let deliveredCount = 0;
    let failedCount = 0;

    for (const batch of batches) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(batch)
            });
            const data = await response.json().catch(() => ({}));
            const tickets = Array.isArray(data?.data) ? data.data : [];

            tickets.forEach((ticket, idx) => {
                if (ticket?.status === "ok") {
                    deliveredCount += 1;
                    return;
                }
                failedCount += 1;
                const mapped = activeTokens.find((doc) => doc.expoPushToken === batch[idx]?.to);
                if (mapped && isInvalidTokenError(ticket?.details)) invalidTokenIds.add(String(mapped._id));
                console.log("[LiveNotification] ticket failure", {
                    circleId: String(circleId),
                    token: batch[idx]?.to,
                    details: ticket?.details || null,
                    message: ticket?.message || "unknown"
                });
            });
        } catch (error) {
            failedCount += batch.length;
            console.log("[LiveNotification] batch send error", {
                circleId: String(circleId),
                batchSize: batch.length,
                error: error.message
            });
        }
    }

    if (invalidTokenIds.size > 0) {
        await PushToken.updateMany(
            { _id: { $in: [...invalidTokenIds] } },
            { $set: { enabled: false, lastSeenAt: new Date() } }
        );
    }

    console.log("[LiveNotification] delivery summary", {
        circleId: String(circleId),
        attempted: payloads.length,
        deliveredCount,
        failedCount,
        invalidDisabled: invalidTokenIds.size
    });

    return deliveredCount;
};
