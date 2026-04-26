import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { disablePushTokenApi, upsertPushTokenApi } from "./api/pushTokenApi";
import { getTypicalSmokingHour } from "./analytics";

const DAILY_KIND = "daily_checkin";
const NUDGE_KIND = "no_log_nudge";
const SMART_NUDGE_KIND = "smart_nudge";
const WEEKLY_SUMMARY_KIND = "weekly_summary";
const isExpoGo = Constants.appOwnership === "expo";
const getNotificationsModule = async () => (isExpoGo ? null : await import("expo-notifications"));
const getDevicePushTokenState = async () => String((await AsyncStorage.getItem(STORAGE_KEYS.LAST_PUSH_TOKEN)) || "").trim();
const setDevicePushTokenState = async (token) => {
  if (!token) {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_PUSH_TOKEN);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_PUSH_TOKEN, token);
};

const isTodayLocal = (ts) => {
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const toMin = ({ hour, minute }) => hour * 60 + minute;
export const isWithinQuietHours = (date, settings) => {
  if (!settings.quietHoursEnabled) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const start = toMin(settings.quietStart);
  const end = toMin(settings.quietEnd);
  if (start === end) return true;
  return start < end ? now >= start && now < end : now >= start || now < end;
};
const todayAt = ({ hour, minute }) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

export const registerNotificationChannelAsync = async () => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync("smoke-tracker-reminders", {
    name: "Smoke Tracker reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};
export const getNotificationPermissionStatusAsync = async () => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "denied";
  return (await Notifications.getPermissionsAsync()).status;
};
export const requestNotificationPermissionAsync = async () => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "denied";
  return (await Notifications.requestPermissionsAsync()).status;
};

export const syncDevicePushTokenAsync = async ({ permissionStatus }) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications || permissionStatus !== "granted") return null;
  if (Platform.OS !== "android") return null;
  const tokenResult = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = String(tokenResult?.data || "").trim();
  if (!expoPushToken) return null;

  const previousToken = await getDevicePushTokenState();
  if (previousToken === expoPushToken) return expoPushToken;

  await upsertPushTokenApi({ expoPushToken, platform: "android" });
  await setDevicePushTokenState(expoPushToken);
  return expoPushToken;
};

export const disableDevicePushTokenAsync = async () => {
  const token = await getDevicePushTokenState();
  if (!token) return;
  try {
    await disablePushTokenApi({ expoPushToken: token });
  } finally {
    await setDevicePushTokenState("");
  }
};

const cancelTaggedNotificationsAsync = async (kind) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const tagged = all.filter((n) => n.content?.data?.kind === kind);
  await Promise.all(tagged.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
};

const scheduleDailyCheckinAsync = async (settings) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: "Smoke Tracker", body: "Quick check-in: want to log today?", data: { kind: DAILY_KIND } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: settings.dailyTime.hour, minute: settings.dailyTime.minute },
  });
};
const scheduleNoLogNudgeAsync = async (settings, entries) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  if (entries.some((e) => isTodayLocal(e.timestamp))) return null;
  const candidate = todayAt(settings.dailyTime);
  const now = new Date();
  if (candidate <= now) return null;
  if (isWithinQuietHours(candidate, settings)) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Smoke Tracker",
      body: "No log yet today. Add one if you want to keep your streak updated.",
      data: { kind: NUDGE_KIND },
    },
    trigger: candidate,
  });
};
const scheduleSmartNudgeAsync = async (settings, entries) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  if (entries.some((e) => isTodayLocal(e.timestamp))) return null;
  const peakHour = getTypicalSmokingHour(entries);
  if (peakHour == null) return null;
  const hour = Math.max(0, Math.min(23, peakHour));
  const minute = 30;
  const candidate = todayAt({ hour, minute });
  const now = new Date();
  if (candidate <= now) return null;
  if (isWithinQuietHours(candidate, settings)) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Smoke Tracker",
      body: "You are near your usual smoking window. Pause and decide intentionally.",
      data: { kind: SMART_NUDGE_KIND },
    },
    trigger: candidate,
  });
};

const scheduleWeeklySummaryAsync = async (settings, entries) => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisWeekEntries = entries.filter((e) => e.timestamp >= thisWeekStart.getTime());
  const previousWeekEntries = entries.filter(
    (e) => e.timestamp >= previousWeekStart.getTime() && e.timestamp < thisWeekStart.getTime()
  );
  const thisWeekCount = thisWeekEntries.length;
  const thisWeekSmokes = thisWeekEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  const previousWeekSmokes = previousWeekEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  const trendText =
    previousWeekSmokes === 0
      ? "Keep building your baseline."
      : thisWeekSmokes <= previousWeekSmokes
        ? `Down ${Math.max(0, previousWeekSmokes - thisWeekSmokes)} smokes vs last week.`
        : `Up ${Math.max(0, thisWeekSmokes - previousWeekSmokes)} smokes vs last week.`;
  const weekday = 1;
  const triggerHour = settings.dailyTime.hour;
  const triggerMinute = settings.dailyTime.minute;
  const weeklyCandidate = new Date(now);
  const daysUntilTarget = (weekday - now.getDay() + 7) % 7;
  weeklyCandidate.setDate(now.getDate() + daysUntilTarget);
  weeklyCandidate.setHours(triggerHour, triggerMinute, 0, 0);
  if (weeklyCandidate <= now) weeklyCandidate.setDate(weeklyCandidate.getDate() + 7);
  if (isWithinQuietHours(weeklyCandidate, settings)) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Smoke Tracker weekly summary",
      body: `${thisWeekSmokes} smokes in ${thisWeekCount} logs this week. ${trendText}`,
      data: { kind: WEEKLY_SUMMARY_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour: triggerHour,
      minute: triggerMinute,
    },
  });
};

export const syncNotificationSchedulesAsync = async ({ settings, entries, permissionStatus }) => {
  await cancelTaggedNotificationsAsync(DAILY_KIND);
  await cancelTaggedNotificationsAsync(NUDGE_KIND);
  await cancelTaggedNotificationsAsync(SMART_NUDGE_KIND);
  await cancelTaggedNotificationsAsync(WEEKLY_SUMMARY_KIND);
  if (permissionStatus !== "granted") return;
  await registerNotificationChannelAsync();
  if (settings.enabledDailyCheckin) await scheduleDailyCheckinAsync(settings);
  if (settings.enabledNoLogNudge) await scheduleNoLogNudgeAsync(settings, entries);
  if (settings.enabledSmartNudges) await scheduleSmartNudgeAsync(settings, entries);
  if (settings.enabledWeeklySummary) await scheduleWeeklySummaryAsync(settings, entries);
};
