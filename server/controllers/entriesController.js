import Entry from "../models/entryModel.js";
import CircleMember from "../models/circleMemberModel.js";
import CircleSettings from "../models/circleSettingsModel.js";
import Friend from "../models/friendModel.js";
import { notifyCircleMembersExceptSender } from "../services/liveNotificationsService.js";

const normalizeEntryResponse = (entry) => ({
    ...entry.toObject(),
    shareToCircle: Boolean(entry.shareToCircle),
    circleId: entry.circleId || null,
    shareCircleIds: Array.isArray(entry.shareCircleIds) ? entry.shareCircleIds : [],
    shareFriendIds: Array.isArray(entry.shareFriendIds) ? entry.shareFriendIds : []
});

const normalizeIdList = (raw) => [...new Set((Array.isArray(raw) ? raw : []).map(String).filter(Boolean))];

const validateShareTargets = async ({ userId, shareToCircle, circleId, shareCircleIds, shareFriendIds }) => {
    const circleTargets = normalizeIdList([...(shareCircleIds || []), ...(circleId ? [circleId] : [])]);
    const friendTargets = normalizeIdList(shareFriendIds);
    if (!shareToCircle) {
        return { shareToCircle: false, circleId: null, shareCircleIds: [], shareFriendIds: [] };
    }
    if (!circleTargets.length && !friendTargets.length) {
        throw new Error("Select at least one circle or friend to share this log");
    }

    if (circleTargets.length) {
        const memberships = await CircleMember.find({ circleId: { $in: circleTargets }, userId }).select("circleId");
        const allowed = new Set(memberships.map((m) => String(m.circleId)));
        if (!circleTargets.every((id) => allowed.has(String(id)))) {
            throw new Error("You are not a member of one or more selected circles");
        }
    }

    if (friendTargets.length) {
        const acceptedRelations = await Friend.find({
            status: "accepted",
            $or: [
                { userId, friendUserId: { $in: friendTargets } },
                { userId: { $in: friendTargets }, friendUserId: userId }
            ]
        }).select("userId friendUserId");
        const friendSet = new Set();
        acceptedRelations.forEach((r) => {
            if (String(r.userId) === String(userId)) friendSet.add(String(r.friendUserId));
            if (String(r.friendUserId) === String(userId)) friendSet.add(String(r.userId));
        });
        if (!friendTargets.every((id) => friendSet.has(String(id)))) {
            throw new Error("One or more selected friends are not accepted friends");
        }
    }

    return {
        shareToCircle: true,
        circleId: circleTargets[0] || null,
        shareCircleIds: circleTargets,
        shareFriendIds: friendTargets
    };
};

const maybeNotifySharedEntry = async ({ entry, senderName }) => {
    if (!entry.shareToCircle) return;
    const circleIds = normalizeIdList([...(entry.shareCircleIds || []), ...(entry.circleId ? [entry.circleId] : [])]);
    for (const targetCircleId of circleIds) {
        const settings = await CircleSettings.findOne({ circleId: targetCircleId });
        if (!settings?.liveNotificationsEnabled) continue;
        await notifyCircleMembersExceptSender({
            circleId: targetCircleId,
            senderId: entry.userId,
            message: `${senderName} just logged a smoke`
        });
    }
};

const getEntries = async (req, res) => {
    try {
        const entries = await Entry.find({ userId: req.user._id }).sort({ timestamp: -1 });
        res.status(200).json({
            success: true,
            count: entries.length,
            entries: entries.map(normalizeEntryResponse)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch entries",
            error: error.message
        });
    }
};

const createEntry = async (req, res) => {
    try {
        const { brand, quantity = 1, timestamp, cost, shareToCircle = false, circleId = null, shareCircleIds = [], shareFriendIds = [] } = req.body;

        if (!brand || typeof brand !== "string") {
            return res.status(400).json({
                success: false,
                message: "Brand is required"
            });
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1"
            });
        }

        const parsedCost = cost === undefined || cost === null ? null : Number(cost);
        if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
            return res.status(400).json({
                success: false,
                message: "Cost must be a positive number"
            });
        }

        const sharing = await validateShareTargets({
            userId: req.user._id,
            shareToCircle: Boolean(shareToCircle),
            circleId,
            shareCircleIds,
            shareFriendIds
        });

        const entry = await Entry.create({
            userId: req.user._id,
            brand: brand.trim(),
            quantity: parsedQuantity,
            cost: parsedCost,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            ...sharing
        });
        await maybeNotifySharedEntry({
            entry,
            senderName: req.user.displayName || req.user.username || "Someone"
        });

        res.status(201).json({
            success: true,
            entry: normalizeEntryResponse(entry)
        });
    } catch (error) {
        if (error.message?.includes("circle") || error.message?.includes("friend")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create entry",
            error: error.message
        });
    }
};

const deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Entry.findOneAndDelete({ _id: id, userId: req.user._id });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Entry not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Entry deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete entry",
            error: error.message
        });
    }
};

const updateEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};

        if (req.body.brand !== undefined) {
            const brand = String(req.body.brand || "").trim();
            if (!brand) {
                return res.status(400).json({ success: false, message: "Brand is required" });
            }
            updates.brand = brand;
        }
        if (req.body.quantity !== undefined) {
            const q = Number(req.body.quantity);
            if (!Number.isFinite(q) || q < 1) {
                return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
            }
            updates.quantity = q;
        }
        if (req.body.cost !== undefined) {
            const raw = req.body.cost;
            const cost = raw === null || raw === "" ? null : Number(raw);
            if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
                return res.status(400).json({ success: false, message: "Cost must be a positive number" });
            }
            updates.cost = cost;
        }
        if (req.body.timestamp !== undefined) {
            updates.timestamp = new Date(req.body.timestamp);
        }
        if (
            req.body.shareToCircle !== undefined ||
            req.body.circleId !== undefined ||
            req.body.shareCircleIds !== undefined ||
            req.body.shareFriendIds !== undefined
        ) {
            const sharing = await validateShareTargets({
                userId: req.user._id,
                shareToCircle: Boolean(req.body.shareToCircle),
                circleId: req.body.circleId || null,
                shareCircleIds: req.body.shareCircleIds || [],
                shareFriendIds: req.body.shareFriendIds || []
            });
            updates.shareToCircle = sharing.shareToCircle;
            updates.circleId = sharing.circleId;
            updates.shareCircleIds = sharing.shareCircleIds;
            updates.shareFriendIds = sharing.shareFriendIds;
        }

        const entry = await Entry.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            updates,
            { new: true }
        );
        if (!entry) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        await maybeNotifySharedEntry({
            entry,
            senderName: req.user.displayName || req.user.username || "Someone"
        });
        res.status(200).json({ success: true, entry: normalizeEntryResponse(entry) });
    } catch (error) {
        if (error.message?.includes("circle") || error.message?.includes("friend")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: "Failed to update entry", error: error.message });
    }
};

export { getEntries, createEntry, updateEntry, deleteEntry };
