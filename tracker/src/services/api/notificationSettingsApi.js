import { apiRequest } from "./client";

const defaultClock = { hour: 0, minute: 0 };
const normalizeClock = (value, fallback) => ({
  hour: Number.isFinite(Number(value?.hour)) ? Math.min(23, Math.max(0, Math.floor(Number(value.hour)))) : fallback.hour,
  minute: Number.isFinite(Number(value?.minute)) ? Math.min(59, Math.max(0, Math.floor(Number(value.minute)))) : fallback.minute,
});

export const normalizeNotificationSettingsApi = (settings = {}) => ({
  enabledDailyCheckin: Boolean(settings.enabledDailyCheckin),
  enabledNoLogNudge: Boolean(settings.enabledNoLogNudge),
  dailyTime: normalizeClock(settings.dailyTime, { hour: 20, minute: 0 }),
  quietHoursEnabled: settings.quietHoursEnabled === undefined ? true : Boolean(settings.quietHoursEnabled),
  quietStart: normalizeClock(settings.quietStart, { hour: 22, minute: 0 }),
  quietEnd: normalizeClock(settings.quietEnd, { hour: 8, minute: 0 }),
  permissionAsked: Boolean(settings.permissionAsked),
  _meta: settings?._meta || {},
  _id: settings?._id,
  userId: settings?.userId,
  createdAt: settings?.createdAt,
  updatedAt: settings?.updatedAt,
});

export const fetchNotificationSettingsApi = async () => {
  const data = await apiRequest("/api/v1/notification-settings");
  return normalizeNotificationSettingsApi(data?.settings || defaultClock);
};

export const saveNotificationSettingsApi = async (settings) => {
  const data = await apiRequest("/api/v1/notification-settings", {
    method: "PUT",
    body: settings,
  });
  return normalizeNotificationSettingsApi(data?.settings || defaultClock);
};
