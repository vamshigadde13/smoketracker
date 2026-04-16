import { apiRequest } from "./client";

export const upsertPushTokenApi = async ({ expoPushToken, platform }) => {
  const data = await apiRequest("/api/v1/push-tokens", {
    method: "PUT",
    body: { expoPushToken, platform },
  });
  return data?.token || null;
};

export const disablePushTokenApi = async ({ expoPushToken }) => {
  await apiRequest("/api/v1/push-tokens", {
    method: "DELETE",
    body: { expoPushToken },
  });
};
