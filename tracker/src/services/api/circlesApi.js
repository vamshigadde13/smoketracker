import { apiRequest } from "./client";

const normalizeCircle = (circle) => ({
  id: String(circle?.id || circle?._id || ""),
  name: String(circle?.name || ""),
  createdBy: String(circle?.createdBy || ""),
  members: (circle?.members || []).map((member) => ({
    id: String(member?.id || member?._id || ""),
    role: String(member?.role || "member"),
    user: {
      id: String(member?.user?.id || member?.user?._id || ""),
      username: String(member?.user?.username || ""),
      displayName: String(member?.user?.displayName || ""),
      uniqueCode: String(member?.user?.uniqueCode || ""),
      avatarUrl: String(member?.user?.avatarUrl || ""),
    },
  })),
  settings: {
    liveNotificationsEnabled: Boolean(circle?.settings?.liveNotificationsEnabled),
  },
  streak: {
    currentStreak: Number(circle?.streak?.currentStreak || 0),
    bestStreak: Number(circle?.streak?.bestStreak || 0),
    lastLoggedAt: circle?.streak?.lastLoggedAt || null,
    lastActiveAt: circle?.streak?.lastActiveAt || circle?.streak?.lastLoggedAt || null,
  },
  createdAt: circle?.createdAt || null,
});

export const fetchCirclesApi = async () => {
  const data = await apiRequest("/api/v1/circles");
  return (data?.circles || []).map(normalizeCircle);
};

export const createCircleApi = async ({ name, memberIds }) => {
  const data = await apiRequest("/api/v1/circles/create", {
    method: "POST",
    body: { name, memberIds: memberIds || [] },
  });
  return normalizeCircle(data?.circle || {});
};

export const addCircleMemberApi = async ({ circleId, memberUserId }) => {
  const data = await apiRequest("/api/v1/circles/add-member", {
    method: "POST",
    body: { circleId, memberUserId },
  });
  return normalizeCircle(data?.circle || {});
};

export const removeCircleMemberApi = async ({ circleId, memberUserId }) => {
  const data = await apiRequest("/api/v1/circles/remove-member", {
    method: "POST",
    body: { circleId, memberUserId },
  });
  return normalizeCircle(data?.circle || {});
};

export const fetchCircleSettingsApi = async (circleId) => {
  const data = await apiRequest(`/api/v1/circles/${circleId}/settings`);
  return {
    circleId: String(data?.settings?.circleId || circleId),
    liveNotificationsEnabled: Boolean(data?.settings?.liveNotificationsEnabled),
  };
};

export const saveCircleSettingsApi = async (circleId, liveNotificationsEnabled) => {
  const data = await apiRequest(`/api/v1/circles/${circleId}/settings`, {
    method: "POST",
    body: { liveNotificationsEnabled: Boolean(liveNotificationsEnabled) },
  });
  return {
    circleId: String(data?.settings?.circleId || circleId),
    liveNotificationsEnabled: Boolean(data?.settings?.liveNotificationsEnabled),
  };
};
