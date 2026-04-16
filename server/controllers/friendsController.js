import Friend from "../models/friendModel.js";
import User from "../models/userModel.js";
import { getFriendPairStreak } from "../services/streaksService.js";

const normalizeStreak = (raw) => ({
    currentStreak: Number(raw?.currentStreak || 0),
    bestStreak: Number(raw?.bestStreak || 0),
    lastLoggedAt: raw?.lastLoggedAt || null,
    lastActiveAt: raw?.lastLoggedAt || null
});

const toFriendDto = (relation, currentUserId, streak = { currentStreak: 0, bestStreak: 0, lastLoggedAt: null }) => {
    const isOutgoing = String(relation.userId?._id || relation.userId) === String(currentUserId);
    const friendUser = isOutgoing ? relation.friendUserId : relation.userId;
    const friendId = String(friendUser?._id || friendUser);
    return {
        id: String(relation._id),
        status: relation.status,
        isOutgoing,
        friend: {
            id: friendId,
            username: String(friendUser?.username || ""),
            displayName: String(friendUser?.displayName || ""),
            uniqueCode: String(friendUser?.uniqueCode || ""),
            avatarUrl: String(friendUser?.avatarUrl || ""),
            streak: normalizeStreak(streak)
        },
        createdAt: relation.createdAt
    };
};

export const addFriendByCode = async (req, res) => {
    try {
        const requesterId = req.user._id;
        const code = String(req.body?.code || "").trim().toLowerCase();
        if (!code || !code.includes("#")) {
            return res.status(400).json({ success: false, message: "Invalid friend code" });
        }

        const target = await User.findOne({ uniqueCode: code });
        if (!target) {
            return res.status(404).json({ success: false, message: "Friend code not found" });
        }
        if (String(target._id) === String(requesterId)) {
            return res.status(400).json({ success: false, message: "You cannot add yourself" });
        }

        const [existingOutgoing, existingIncoming] = await Promise.all([
            Friend.findOne({ userId: requesterId, friendUserId: target._id }),
            Friend.findOne({ userId: target._id, friendUserId: requesterId })
        ]);

        const existing = existingOutgoing || existingIncoming;
        if (existing?.status === "accepted") {
            return res.status(409).json({ success: false, message: "You are already friends" });
        }
        if (existing?.status === "pending") {
            return res.status(409).json({ success: false, message: "Friend request already pending" });
        }
        if (existing?.status === "blocked") {
            return res.status(403).json({ success: false, message: "Friend request is blocked" });
        }

        const request = await Friend.create({
            userId: requesterId,
            friendUserId: target._id,
            status: "pending"
        });
        return res.status(201).json({ success: true, message: "Friend request sent", request });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to send friend request", error: error.message });
    }
};

export const getFriends = async (req, res) => {
    try {
        const userId = req.user._id;
        const relations = await Friend.find({
            $or: [{ userId }, { friendUserId: userId }]
        })
            .populate("userId", "username displayName uniqueCode avatarUrl")
            .populate("friendUserId", "username displayName uniqueCode avatarUrl")
            .sort({ createdAt: -1 });
        const streakByRelationId = new Map();
        await Promise.all(
            relations.map(async (relation) => {
                const isOutgoing = String(relation.userId?._id || relation.userId) === String(userId);
                const friendUser = isOutgoing ? relation.friendUserId : relation.userId;
                const friendId = String(friendUser?._id || friendUser);
                const streak = await getFriendPairStreak({ userA: userId, userB: friendId });
                streakByRelationId.set(String(relation._id), streak);
            })
        );

        return res.status(200).json({
            success: true,
            friends: relations
                .filter((r) => r.status === "accepted")
                .map((r) => toFriendDto(r, userId, streakByRelationId.get(String(r._id)))),
            pending: relations
                .filter((r) => r.status === "pending")
                .map((r) => toFriendDto(r, userId, streakByRelationId.get(String(r._id))))
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch friends", error: error.message });
    }
};

export const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const requestId = String(req.body?.requestId || "").trim();
        const request = await Friend.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Friend request not found" });
        }
        if (String(request.friendUserId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Only recipient can accept request" });
        }
        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        request.status = "accepted";
        await request.save();
        return res.status(200).json({ success: true, message: "Friend request accepted" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to accept request", error: error.message });
    }
};

export const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const requestId = String(req.body?.requestId || "").trim();
        const request = await Friend.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Friend request not found" });
        }
        if (String(request.friendUserId) !== String(userId) && String(request.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "You cannot reject this request" });
        }
        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        request.status = "rejected";
        await request.save();
        return res.status(200).json({ success: true, message: "Friend request rejected" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to reject request", error: error.message });
    }
};
