import { apiRequest } from "./client";

const normalizeFriend = (item) => ({
  id: String(item?.id || item?._id || ""),
  status: String(item?.status || "pending"),
  isOutgoing: Boolean(item?.isOutgoing),
  friend: {
    id: String(item?.friend?.id || item?.friend?._id || ""),
    username: String(item?.friend?.username || ""),
    displayName: String(item?.friend?.displayName || ""),
    uniqueCode: String(item?.friend?.uniqueCode || ""),
    avatarUrl: String(item?.friend?.avatarUrl || ""),
    streak: {
      currentStreak: Number(item?.friend?.streak?.currentStreak || 0),
      bestStreak: Number(item?.friend?.streak?.bestStreak || 0),
      lastLoggedAt: item?.friend?.streak?.lastLoggedAt || null,
      lastActiveAt: item?.friend?.streak?.lastActiveAt || item?.friend?.streak?.lastLoggedAt || null,
    },
  },
  createdAt: item?.createdAt || null,
});

export const fetchFriendsApi = async () => {
  const data = await apiRequest("/api/v1/friends");
  return {
    friends: (data?.friends || []).map(normalizeFriend),
    pending: (data?.pending || []).map(normalizeFriend),
  };
};

export const addFriendByCodeApi = async (code) =>
  apiRequest("/api/v1/friends/add-by-code", { method: "POST", body: { code } });

export const acceptFriendRequestApi = async (requestId) =>
  apiRequest("/api/v1/friends/accept", { method: "POST", body: { requestId } });

export const rejectFriendRequestApi = async (requestId) =>
  apiRequest("/api/v1/friends/reject", { method: "POST", body: { requestId } });
