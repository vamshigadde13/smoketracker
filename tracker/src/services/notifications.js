import Constants from "expo-constants";

const DAILY_KIND = "daily_checkin";
const NUDGE_KIND = "no_log_nudge";
const isExpoGo = Constants.appOwnership === "expo";
const getNotificationsModule = async () => (isExpoGo ? null : await import("expo-notifications"));

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
  if (candidate <= new Date() || isWithinQuietHours(candidate, settings)) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Smoke Tracker",
      body: "No log yet today. Add one if you want to keep your streak updated.",
      data: { kind: NUDGE_KIND },
    },
    trigger: candidate,
  });
};

export const syncNotificationSchedulesAsync = async ({ settings, entries, permissionStatus }) => {
  await cancelTaggedNotificationsAsync(DAILY_KIND);
  await cancelTaggedNotificationsAsync(NUDGE_KIND);
  if (permissionStatus !== "granted") return;
  await registerNotificationChannelAsync();
  if (settings.enabledDailyCheckin) await scheduleDailyCheckinAsync(settings);
  if (settings.enabledNoLogNudge) await scheduleNoLogNudgeAsync(settings, entries);
};
