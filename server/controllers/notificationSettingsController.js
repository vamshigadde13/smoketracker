import NotificationSettings from "../models/notificationSettingsModel.js";

const DEFAULTS = {
  enabledDailyCheckin: false,
  enabledNoLogNudge: false,
  dailyTime: { hour: 20, minute: 0 },
  quietHoursEnabled: true,
  quietStart: { hour: 22, minute: 0 },
  quietEnd: { hour: 8, minute: 0 },
  permissionAsked: false,
};

const sanitizeClock = (value, fallback) => {
  const hour = Number.isFinite(Number(value?.hour)) ? Math.min(23, Math.max(0, Math.floor(Number(value.hour)))) : fallback.hour;
  const minute = Number.isFinite(Number(value?.minute)) ? Math.min(59, Math.max(0, Math.floor(Number(value.minute)))) : fallback.minute;
  return { hour, minute };
};

const normalizeSettings = (raw = {}) => ({
  enabledDailyCheckin: Boolean(raw.enabledDailyCheckin),
  enabledNoLogNudge: Boolean(raw.enabledNoLogNudge),
  dailyTime: sanitizeClock(raw.dailyTime, DEFAULTS.dailyTime),
  quietHoursEnabled: raw.quietHoursEnabled === undefined ? true : Boolean(raw.quietHoursEnabled),
  quietStart: sanitizeClock(raw.quietStart, DEFAULTS.quietStart),
  quietEnd: sanitizeClock(raw.quietEnd, DEFAULTS.quietEnd),
  permissionAsked: Boolean(raw.permissionAsked),
});

const getNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.findOne({ userId: req.user._id });
    res.status(200).json({
      success: true,
      settings: settings ? { ...DEFAULTS, ...settings.toObject() } : DEFAULTS,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notification settings", error: error.message });
  }
};

const upsertNotificationSettings = async (req, res) => {
  try {
    const settings = normalizeSettings(req.body || {});
    const saved = await NotificationSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $set: settings, $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, settings: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save notification settings", error: error.message });
  }
};

export { getNotificationSettings, upsertNotificationSettings };
