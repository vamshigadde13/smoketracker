import Entry from "../models/entryModel.js";

const dayKeyLocal = (dateValue) => {
    const d = new Date(dateValue);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

const buildStreakFromDayKeys = (dayKeys) => {
    if (!dayKeys.length) return { currentStreak: 0, bestStreak: 0, lastLoggedAt: null };
    let bestStreak = 1;
    let run = 1;
    for (let i = 1; i < dayKeys.length; i += 1) {
        const prev = dayKeys[i - 1];
        const curr = dayKeys[i];
        if (curr - prev === 24 * 60 * 60 * 1000) {
            run += 1;
            if (run > bestStreak) bestStreak = run;
        } else {
            run = 1;
        }
    }

    let currentStreak = 1;
    for (let i = dayKeys.length - 1; i > 0; i -= 1) {
        const curr = dayKeys[i];
        const prev = dayKeys[i - 1];
        if (curr - prev === 24 * 60 * 60 * 1000) currentStreak += 1;
        else break;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = dayKeys[dayKeys.length - 1];
    if (today.getTime() - lastDay > 24 * 60 * 60 * 1000) {
        currentStreak = 0;
    }

    return {
        currentStreak,
        bestStreak,
        lastLoggedAt: new Date(lastDay)
    };
};

export const getUserStreaksMap = async (userIds = []) => {
    const cleanIds = [...new Set(userIds.map(String).filter(Boolean))];
    if (!cleanIds.length) return new Map();

    const entries = await Entry.find({ userId: { $in: cleanIds } })
        .select("userId timestamp")
        .sort({ timestamp: 1 });

    const byUser = new Map();
    entries.forEach((entry) => {
        const key = String(entry.userId);
        if (!byUser.has(key)) byUser.set(key, new Set());
        byUser.get(key).add(dayKeyLocal(entry.timestamp));
    });

    const output = new Map();
    cleanIds.forEach((id) => {
        const dayKeys = [...(byUser.get(id) || new Set())].sort((a, b) => a - b);
        output.set(id, buildStreakFromDayKeys(dayKeys));
    });
    return output;
};

export const getCircleStreak = async (circleId) => {
    const entries = await Entry.find({
        shareToCircle: true,
        $or: [{ circleId }, { shareCircleIds: circleId }]
    })
        .select("timestamp")
        .sort({ timestamp: 1 });
    const dayKeys = [...new Set(entries.map((e) => dayKeyLocal(e.timestamp)))].sort((a, b) => a - b);
    return buildStreakFromDayKeys(dayKeys);
};

export const getFriendPairStreak = async ({ userA, userB }) => {
    if (!userA || !userB) return { currentStreak: 0, bestStreak: 0, lastLoggedAt: null };
    const a = String(userA);
    const b = String(userB);
    const entries = await Entry.find({
        shareToCircle: true,
        $or: [
            { userId: a, shareFriendIds: b },
            { userId: b, shareFriendIds: a }
        ]
    })
        .select("timestamp")
        .sort({ timestamp: 1 });
    const dayKeys = [...new Set(entries.map((e) => dayKeyLocal(e.timestamp)))].sort((x, y) => x - y);
    return buildStreakFromDayKeys(dayKeys);
};
