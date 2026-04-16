import Circle from "../models/circleModel.js";
import CircleMember from "../models/circleMemberModel.js";
import CircleSettings from "../models/circleSettingsModel.js";
import Friend from "../models/friendModel.js";
import { getCircleStreak, getUserStreaksMap } from "../services/streaksService.js";

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 10;
const normalizeStreak = (raw) => ({
    currentStreak: Number(raw?.currentStreak || 0),
    bestStreak: Number(raw?.bestStreak || 0),
    lastLoggedAt: raw?.lastLoggedAt || null,
    lastActiveAt: raw?.lastLoggedAt || null
});

const getCircleWithMembers = async (circleId) => {
    const [circle, members, settings] = await Promise.all([
        Circle.findById(circleId),
        CircleMember.find({ circleId }).populate("userId", "username displayName uniqueCode avatarUrl"),
        CircleSettings.findOne({ circleId })
    ]);
    if (!circle) return null;
    const memberIds = members.map((m) => String(m.userId?._id || m.userId));
    const [memberStreaks, circleStreak] = await Promise.all([
        getUserStreaksMap(memberIds),
        getCircleStreak(circleId)
    ]);
    return {
        id: String(circle._id),
        name: circle.name,
        createdBy: String(circle.createdBy),
        members: members.map((m) => ({
            id: String(m._id),
            role: m.role,
            user: {
                id: String(m.userId?._id || ""),
                username: String(m.userId?.username || ""),
                displayName: String(m.userId?.displayName || ""),
                uniqueCode: String(m.userId?.uniqueCode || ""),
                avatarUrl: String(m.userId?.avatarUrl || ""),
                streak: normalizeStreak(memberStreaks.get(String(m.userId?._id || m.userId)))
            }
        })),
        settings: {
            liveNotificationsEnabled: Boolean(settings?.liveNotificationsEnabled)
        },
        streak: normalizeStreak(circleStreak),
        createdAt: circle.createdAt
    };
};

const ensureAdmin = async (circleId, userId) => {
    const member = await CircleMember.findOne({ circleId, userId });
    return member?.role === "admin";
};

const areFriends = async (a, b) => {
    const relation = await Friend.findOne({
        status: "accepted",
        $or: [
            { userId: a, friendUserId: b },
            { userId: b, friendUserId: a }
        ]
    });
    return Boolean(relation);
};

export const createCircle = async (req, res) => {
    try {
        const userId = req.user._id;
        const name = String(req.body?.name || "").trim();
        const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(String) : [];
        if (!name) return res.status(400).json({ success: false, message: "Circle name is required" });

        const uniqueMemberIds = Array.from(new Set([String(userId), ...memberIds]));
        if (uniqueMemberIds.length < MIN_MEMBERS) {
            return res.status(400).json({ success: false, message: "Circle must include at least one friend" });
        }
        if (uniqueMemberIds.length > MAX_MEMBERS) {
            return res.status(400).json({ success: false, message: "Circle cannot exceed 10 members" });
        }

        for (const memberId of uniqueMemberIds) {
            if (memberId === String(userId)) continue;
            if (!(await areFriends(userId, memberId))) {
                return res.status(400).json({ success: false, message: "All circle members must be accepted friends" });
            }
        }

        const circle = await Circle.create({ name, createdBy: userId });
        await CircleMember.create(
            uniqueMemberIds.map((memberId) => ({
                circleId: circle._id,
                userId: memberId,
                role: memberId === String(userId) ? "admin" : "member"
            }))
        );
        await CircleSettings.create({ circleId: circle._id, liveNotificationsEnabled: false });

        const payload = await getCircleWithMembers(circle._id);
        return res.status(201).json({ success: true, circle: payload });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create circle", error: error.message });
    }
};

export const getCircles = async (req, res) => {
    try {
        const userId = req.user._id;
        const memberships = await CircleMember.find({ userId }).select("circleId");
        const circleIds = memberships.map((m) => m.circleId);
        const circles = await Promise.all(circleIds.map((circleId) => getCircleWithMembers(circleId)));
        return res.status(200).json({ success: true, circles: circles.filter(Boolean) });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch circles", error: error.message });
    }
};

export const addCircleMember = async (req, res) => {
    try {
        const userId = req.user._id;
        const circleId = String(req.body?.circleId || "").trim();
        const memberUserId = String(req.body?.memberUserId || "").trim();
        if (!circleId || !memberUserId) {
            return res.status(400).json({ success: false, message: "circleId and memberUserId are required" });
        }
        if (!(await ensureAdmin(circleId, userId))) {
            return res.status(403).json({ success: false, message: "Only circle admin can add members" });
        }
        if (!(await areFriends(userId, memberUserId))) {
            return res.status(400).json({ success: false, message: "Only accepted friends can be added" });
        }
        const existingCount = await CircleMember.countDocuments({ circleId });
        if (existingCount >= MAX_MEMBERS) {
            return res.status(400).json({ success: false, message: "Circle cannot exceed 10 members" });
        }
        const existingMember = await CircleMember.findOne({ circleId, userId: memberUserId });
        if (existingMember) {
            return res.status(409).json({ success: false, message: "User is already in this circle" });
        }
        await CircleMember.create({ circleId, userId: memberUserId, role: "member" });
        const circle = await getCircleWithMembers(circleId);
        return res.status(200).json({ success: true, circle });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add member", error: error.message });
    }
};

export const removeCircleMember = async (req, res) => {
    try {
        const userId = req.user._id;
        const circleId = String(req.body?.circleId || "").trim();
        const memberUserId = String(req.body?.memberUserId || "").trim();
        if (!circleId || !memberUserId) {
            return res.status(400).json({ success: false, message: "circleId and memberUserId are required" });
        }
        if (!(await ensureAdmin(circleId, userId))) {
            return res.status(403).json({ success: false, message: "Only circle admin can remove members" });
        }
        const member = await CircleMember.findOne({ circleId, userId: memberUserId });
        if (!member) {
            return res.status(404).json({ success: false, message: "Circle member not found" });
        }
        if (member.role === "admin") {
            return res.status(400).json({ success: false, message: "Admin cannot be removed" });
        }
        const count = await CircleMember.countDocuments({ circleId });
        if (count - 1 < MIN_MEMBERS) {
            return res.status(400).json({ success: false, message: "Circle must retain at least 2 members" });
        }
        await CircleMember.deleteOne({ _id: member._id });
        const circle = await getCircleWithMembers(circleId);
        return res.status(200).json({ success: true, circle });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to remove member", error: error.message });
    }
};

export const getCircleSettings = async (req, res) => {
    try {
        const userId = req.user._id;
        const circleId = String(req.params?.id || "").trim();
        const membership = await CircleMember.findOne({ circleId, userId });
        if (!membership) return res.status(403).json({ success: false, message: "You are not a member of this circle" });
        const settings =
            (await CircleSettings.findOne({ circleId })) ||
            (await CircleSettings.create({ circleId, liveNotificationsEnabled: false }));
        return res.status(200).json({ success: true, settings: { circleId, liveNotificationsEnabled: settings.liveNotificationsEnabled } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch circle settings", error: error.message });
    }
};

export const saveCircleSettings = async (req, res) => {
    try {
        const userId = req.user._id;
        const circleId = String(req.params?.id || "").trim();
        if (!(await ensureAdmin(circleId, userId))) {
            return res.status(403).json({ success: false, message: "Only circle admin can update settings" });
        }
        const liveNotificationsEnabled = Boolean(req.body?.liveNotificationsEnabled);
        const settings = await CircleSettings.findOneAndUpdate(
            { circleId },
            { liveNotificationsEnabled },
            { new: true, upsert: true }
        );
        return res.status(200).json({ success: true, settings: { circleId, liveNotificationsEnabled: settings.liveNotificationsEnabled } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to save circle settings", error: error.message });
    }
};
