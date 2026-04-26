import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { normalizeCost } from "../utils/money";
import { createBrandApi, deleteBrandApi, fetchBrandsApi } from "./api/brandsApi";
import {
  addCircleMemberApi,
  createCircleApi,
  fetchCirclesApi,
  removeCircleMemberApi,
  saveCircleSettingsApi,
} from "./api/circlesApi";
import { createEntryApi, deleteEntryApi, fetchEntriesApi, updateEntryApi } from "./api/entriesApi";
import {
  acceptFriendRequestApi,
  addFriendByCodeApi,
  fetchFriendsApi,
  rejectFriendRequestApi,
} from "./api/friendsApi";
import {
  fetchNotificationSettingsApi,
  normalizeNotificationSettingsApi,
  saveNotificationSettingsApi,
} from "./api/notificationSettingsApi";
import { createPresetApi, deletePresetApi, fetchPresetsApi, updatePresetApi } from "./api/presetsApi";
import { clearProfileApi, fetchProfileApi, saveProfileApi } from "./api/profileApi";
import { clearQueue, enqueueOperation, flushQueue, getSyncState } from "./syncQueue";

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const normalizeBrand = (brand) => String(brand || "").trim().toLowerCase();
const buildLocalId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const buildShortName = (brand) => {
  const clean = String(brand || "").trim();
  if (!clean) return "";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  if (words.length === 2) {
    const [a, b] = words;
    if (b.length <= 3) return `${a.slice(0, 1)} ${b}`.toUpperCase();
    return `${a.slice(0, 1)} ${b.slice(0, 3)}`.toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};
const STARTER_PRESETS = [
  { brand: "Marlboro Advance", shortName: "ADV", quantity: 1, costPerSmoke: 25 },
  { brand: "Manchester Red", shortName: "M Red", quantity: 1, costPerSmoke: 25 },
  { brand: "Double Shift", shortName: "Db Shift", quantity: 1, costPerSmoke: 22 },
  { brand: "Marlboro Red", shortName: "Red", quantity: 1, costPerSmoke: 25 },
  { brand: "Pan", shortName: "Pan", quantity: 1, costPerSmoke: 22 },
];
const isSamePresetBrand = (a, b) => normalizeBrand(a?.brand) === normalizeBrand(b?.brand);

const readLocalEntries = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.SMOKE_ENTRIES), []);
const readLocalBrands = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.BRANDS), []);
const readLocalPresets = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PRESETS), []);
const readLocalProfile = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PROFILE), {});
const readLocalNotificationSettings = async () =>
  safeParse(await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS), {});
const readLocalFriends = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS), []);
const readLocalPendingFriends = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PENDING_FRIENDS), []);
const readLocalCircles = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.CIRCLES), []);
const readLocalGoalSettings = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.GOAL_SETTINGS), {});
const readLocalOnboarding = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING), {});

export const saveSmokeEntries = async (entries) =>
  AsyncStorage.setItem(STORAGE_KEYS.SMOKE_ENTRIES, JSON.stringify(entries));
export const saveBrands = async (brands) => AsyncStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
export const savePresets = async (presets) => AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
export const saveFriends = async (friends) => AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
export const savePendingFriends = async (pending) =>
  AsyncStorage.setItem(STORAGE_KEYS.PENDING_FRIENDS, JSON.stringify(pending));
export const saveCircles = async (circles) => AsyncStorage.setItem(STORAGE_KEYS.CIRCLES, JSON.stringify(circles));
export const saveGoalSettings = async (settings) =>
  AsyncStorage.setItem(STORAGE_KEYS.GOAL_SETTINGS, JSON.stringify(settings));
export const saveOnboardingState = async (state) =>
  AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(state));

const queueHandlers = {
  entries: {
    create: (payload) => createEntryApi(payload),
    update: (payload) => updateEntryApi(payload),
    delete: (payload) => deleteEntryApi(payload.id),
  },
  brands: {
    create: (payload) => createBrandApi(payload.name),
    delete: (payload) => deleteBrandApi(payload.id),
  },
  presets: {
    create: (payload) => createPresetApi(payload),
    update: (payload) => updatePresetApi(payload),
    delete: (payload) => deletePresetApi(payload.id),
  },
  profile: {
    upsert: (payload) => saveProfileApi(payload),
    clear: () => clearProfileApi(),
  },
  notifications: {
    upsert: (payload) => saveNotificationSettingsApi(payload),
  },
  friends: {
    request: (payload) => addFriendByCodeApi(payload.code),
    accept: (payload) => acceptFriendRequestApi(payload.requestId),
    reject: (payload) => rejectFriendRequestApi(payload.requestId),
  },
  circles: {
    create: (payload) => createCircleApi(payload),
    addMember: (payload) => addCircleMemberApi(payload),
    removeMember: (payload) => removeCircleMemberApi(payload),
    saveSettings: (payload) => saveCircleSettingsApi(payload.circleId, payload.liveNotificationsEnabled),
  },
};

export const flushSyncQueue = async () => flushQueue({ handlers: queueHandlers });
export const getSyncStatus = async () => getSyncState();
export const clearSyncQueue = async () => clearQueue();

export const getSmokeEntries = async () => {
  try {
    const entries = await fetchEntriesApi();
    await saveSmokeEntries(entries);
    return entries;
  } catch {
    return [...(await readLocalEntries())].sort((a, b) => b.timestamp - a.timestamp);
  }
};

export const getBrands = async () => {
  try {
    const brands = await fetchBrandsApi();
    await saveBrands(brands);
    return brands;
  } catch {
    return readLocalBrands();
  }
};

export const getPresets = async () => {
  const seedIfNeeded = async () => {
    const seeded = (await AsyncStorage.getItem(STORAGE_KEYS.PRESETS_SEEDED)) === "1";
    const local = await readLocalPresets();
    if (seeded || local.length) return local;
    const starter = STARTER_PRESETS.map((preset) => ({ id: buildLocalId(), ...preset }));
    await savePresets(starter);
    await AsyncStorage.setItem(STORAGE_KEYS.PRESETS_SEEDED, "1");
    return starter;
  };
  try {
    const presets = await fetchPresetsApi();
    if (!presets.length) return seedIfNeeded();
    await savePresets(presets);
    await AsyncStorage.setItem(STORAGE_KEYS.PRESETS_SEEDED, "1");
    return presets;
  } catch {
    return seedIfNeeded();
  }
};
export const getLocalPresets = async () => {
  const seeded = (await AsyncStorage.getItem(STORAGE_KEYS.PRESETS_SEEDED)) === "1";
  const local = await readLocalPresets();
  if (seeded || local.length) return local;
  const starter = STARTER_PRESETS.map((preset) => ({ id: buildLocalId(), ...preset }));
  await savePresets(starter);
  await AsyncStorage.setItem(STORAGE_KEYS.PRESETS_SEEDED, "1");
  return starter;
};

export const saveStarterPresets = async () => {
  const existing = await readLocalPresets();
  const missing = STARTER_PRESETS.filter(
    (starter) => !existing.some((item) => isSamePresetBrand(item, starter))
  ).map((preset) => ({ id: buildLocalId(), ...preset }));
  if (!missing.length) return { added: 0 };
  const next = [...existing, ...missing];
  await savePresets(next);
  await AsyncStorage.setItem(STORAGE_KEYS.PRESETS_SEEDED, "1");

  await Promise.allSettled(
    missing.map(async (preset) => {
      try {
        const remote = await createPresetApi(preset);
        const current = await readLocalPresets();
        await savePresets(current.map((p) => (p.id === preset.id ? remote : p)));
      } catch {
        await enqueueOperation({ entity: "presets", op: "create", payload: preset });
      }
    })
  );
  return { added: missing.length };
};

export const addPreset = async ({ brand, shortName, quantity, costPerSmoke }) => {
  const presets = await readLocalPresets();
  const unit = normalizeCost(costPerSmoke);
  const cleanBrand = String(brand || "").trim();
  if (presets.some((item) => normalizeBrand(item.brand) === normalizeBrand(cleanBrand))) {
    throw new Error("Preset already exists for this brand.");
  }
  const cleanShortName = String(shortName || "").trim() || buildShortName(cleanBrand);
  const localPreset = {
    id: buildLocalId(),
    brand: cleanBrand,
    ...(cleanShortName ? { shortName: cleanShortName } : {}),
    quantity: Number(quantity) || 1,
    ...(unit !== undefined ? { costPerSmoke: unit } : {}),
  };
  await savePresets([localPreset, ...presets]);

  try {
    const remote = await createPresetApi(localPreset);
    const next = [remote, ...presets];
    await savePresets(next);
    return remote;
  } catch {
    await enqueueOperation({ entity: "presets", op: "create", payload: localPreset });
    return localPreset;
  }
};

export const updatePreset = async ({ id, brand, shortName, quantity, costPerSmoke }) => {
  const presets = await readLocalPresets();
  const unit = normalizeCost(costPerSmoke);
  const cleanBrand = String(brand || "").trim();
  if (presets.some((item) => item.id !== id && normalizeBrand(item.brand) === normalizeBrand(cleanBrand))) {
    throw new Error("Another preset already exists for this brand.");
  }
  const cleanShortName = String(shortName || "").trim() || buildShortName(cleanBrand);
  const payload = {
    id,
    brand: cleanBrand,
    ...(cleanShortName ? { shortName: cleanShortName } : {}),
    quantity: Number(quantity) || 1,
    ...(unit !== undefined ? { costPerSmoke: unit } : {}),
  };
  const next = presets.map((p) => (p.id !== id ? p : { ...p, ...payload }));
  await savePresets(next);
  try {
    await updatePresetApi(payload);
  } catch {
    await enqueueOperation({ entity: "presets", op: "update", payload });
  }
};

export const deletePreset = async (id) => {
  await savePresets((await readLocalPresets()).filter((p) => p.id !== id));
  try {
    await deletePresetApi(id);
  } catch {
    await enqueueOperation({ entity: "presets", op: "delete", payload: { id } });
  }
};

export const addSmokeEntry = async ({ brand, quantity, timestamp, cost, trigger, shareToCircle, circleId, shareCircleIds, shareFriendIds }) => {
  const [entries, brands] = await Promise.all([readLocalEntries(), readLocalBrands()]);
  const cleanBrand = String(brand || "").trim();
  const payload = {
    brand: cleanBrand,
    quantity: Number(quantity) || 1,
    timestamp: Number(timestamp) || Date.now(),
    shareToCircle: Boolean(shareToCircle),
    shareCircleIds: Array.isArray(shareCircleIds) ? shareCircleIds.map(String) : [],
    shareFriendIds: Array.isArray(shareFriendIds) ? shareFriendIds.map(String) : [],
    ...(circleId ? { circleId } : {}),
    ...(normalizeCost(cost) !== undefined ? { cost: normalizeCost(cost) } : {}),
    ...(String(trigger || "").trim() ? { trigger: String(trigger).trim() } : {}),
  };
  const localEntry = { id: buildLocalId(), ...payload };
  await saveSmokeEntries([localEntry, ...entries]);

  if (!brands.some((b) => normalizeBrand(b.name || b) === normalizeBrand(cleanBrand))) {
    const normalized = brands.map((b) => (typeof b === "string" ? { id: b, name: b } : b));
    const localBrand = { id: buildLocalId(), name: cleanBrand };
    await saveBrands([...normalized, localBrand]);
    try {
      await createBrandApi(cleanBrand);
    } catch {
      await enqueueOperation({ entity: "brands", op: "create", payload: { name: cleanBrand } });
    }
  }

  try {
    const remote = await createEntryApi(payload);
    await saveSmokeEntries([remote, ...entries]);
    return remote;
  } catch {
    await enqueueOperation({ entity: "entries", op: "create", payload });
    return localEntry;
  }
};

export const deleteSmokeEntry = async (id) => {
  await saveSmokeEntries((await readLocalEntries()).filter((e) => e.id !== id));
  try {
    await deleteEntryApi(id);
  } catch {
    await enqueueOperation({ entity: "entries", op: "delete", payload: { id } });
  }
};

export const updateSmokeEntry = async ({ id, brand, quantity, timestamp, cost, trigger, shareToCircle, circleId, shareCircleIds, shareFriendIds }) => {
  const payload = {
    id,
    brand: String(brand || "").trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    timestamp: Number(timestamp) || Date.now(),
    ...(shareToCircle === undefined ? {} : { shareToCircle: Boolean(shareToCircle) }),
    ...(shareCircleIds === undefined ? {} : { shareCircleIds: Array.isArray(shareCircleIds) ? shareCircleIds.map(String) : [] }),
    ...(shareFriendIds === undefined ? {} : { shareFriendIds: Array.isArray(shareFriendIds) ? shareFriendIds.map(String) : [] }),
    ...(circleId ? { circleId } : {}),
    ...(normalizeCost(cost) !== undefined ? { cost: normalizeCost(cost) } : {}),
    ...(String(trigger || "").trim() ? { trigger: String(trigger).trim() } : {}),
  };
  const entries = await readLocalEntries();
  await saveSmokeEntries(entries.map((e) => (e.id !== id ? e : { ...e, ...payload })));
  try {
    await updateEntryApi(payload);
  } catch {
    await enqueueOperation({ entity: "entries", op: "update", payload });
  }
};

export const DEFAULT_PROFILE = { name: "", alias: "", bio: "" };
const normalizeProfileFields = (o) => ({
  name: String(o?.name ?? "").trim(),
  alias: String(o?.alias ?? "").trim(),
  bio: String(o?.bio ?? "").trim(),
});
export const getProfile = async () => {
  try {
    const profile = normalizeProfileFields(await fetchProfileApi());
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    return { ...DEFAULT_PROFILE, ...profile };
  } catch {
    return { ...DEFAULT_PROFILE, ...normalizeProfileFields(await readLocalProfile()) };
  }
};
export const saveProfile = async (profile) => {
  const next = normalizeProfileFields(profile);
  await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
  try {
    const remote = normalizeProfileFields(await saveProfileApi(next));
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(remote));
    return remote;
  } catch {
    await enqueueOperation({ entity: "profile", op: "upsert", payload: next });
    return next;
  }
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabledDailyCheckin: false,
  enabledNoLogNudge: false,
  enabledSmartNudges: false,
  enabledWeeklySummary: false,
  dailyTime: { hour: 20, minute: 0 },
  quietHoursEnabled: true,
  quietStart: { hour: 22, minute: 0 },
  quietEnd: { hour: 8, minute: 0 },
  permissionAsked: false,
};
const normalizeClockTime = (raw, fallback) => ({
  hour: Number.isFinite(Number(raw?.hour)) ? Math.min(23, Math.max(0, Math.floor(Number(raw.hour)))) : fallback.hour,
  minute: Number.isFinite(Number(raw?.minute)) ? Math.min(59, Math.max(0, Math.floor(Number(raw.minute)))) : fallback.minute,
});
const normalizeNotificationSettings = (o = {}) => ({
  enabledDailyCheckin: Boolean(o.enabledDailyCheckin),
  enabledNoLogNudge: Boolean(o.enabledNoLogNudge),
  enabledSmartNudges: Boolean(o.enabledSmartNudges),
  enabledWeeklySummary: Boolean(o.enabledWeeklySummary),
  dailyTime: normalizeClockTime(o.dailyTime, DEFAULT_NOTIFICATION_SETTINGS.dailyTime),
  quietHoursEnabled: o.quietHoursEnabled === undefined ? true : Boolean(o.quietHoursEnabled),
  quietStart: normalizeClockTime(o.quietStart, DEFAULT_NOTIFICATION_SETTINGS.quietStart),
  quietEnd: normalizeClockTime(o.quietEnd, DEFAULT_NOTIFICATION_SETTINGS.quietEnd),
  permissionAsked: Boolean(o.permissionAsked),
});
export const getNotificationSettings = async () => {
  const local = normalizeNotificationSettings(await readLocalNotificationSettings());
  try {
    const remote = normalizeNotificationSettings(normalizeNotificationSettingsApi(await fetchNotificationSettingsApi()));
    const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...local, ...remote };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(next));
    return next;
  } catch {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...local,
    };
  }
};
export const saveNotificationSettings = async (settings) => {
  const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...normalizeNotificationSettings(settings) };
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(next));
  try {
    const remote = normalizeNotificationSettings(
      normalizeNotificationSettingsApi(await saveNotificationSettingsApi(next))
    );
    const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...next, ...remote };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(merged));
    return merged;
  } catch {
    await enqueueOperation({ entity: "notifications", op: "upsert", payload: next });
    return next;
  }
};

export const clearLogsAndBrands = async () => {
  const [entries, brands] = await Promise.all([readLocalEntries(), readLocalBrands()]);
  await saveSmokeEntries([]);
  await saveBrands([]);
  await Promise.all(
    entries.map((entry) =>
      deleteEntryApi(entry.id).catch(() =>
        enqueueOperation({ entity: "entries", op: "delete", payload: { id: entry.id } })
      )
    )
  );
  await Promise.all(
    brands.map((brand) =>
      deleteBrandApi(brand.id).catch(() =>
        enqueueOperation({ entity: "brands", op: "delete", payload: { id: brand.id } })
      )
    )
  );
};
export const clearAllPresetsStorage = async () => {
  const presets = await readLocalPresets();
  await savePresets([]);
  await Promise.all(
    presets.map((preset) =>
      deletePresetApi(preset.id).catch(() =>
        enqueueOperation({ entity: "presets", op: "delete", payload: { id: preset.id } })
      )
    )
  );
};
export const clearProfileStorage = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
  try {
    await clearProfileApi();
  } catch {
    await enqueueOperation({ entity: "profile", op: "clear", payload: {} });
  }
};
export const clearAllAppStorage = async () => AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));

export const DEFAULT_GOAL_SETTINGS = {
  dailyLimit: 0,
  weeklyLimit: 0,
};
const normalizeGoalSettings = (raw = {}) => ({
  dailyLimit: Math.max(0, Number(raw.dailyLimit) || 0),
  weeklyLimit: Math.max(0, Number(raw.weeklyLimit) || 0),
});
export const getGoalSettings = async () => ({
  ...DEFAULT_GOAL_SETTINGS,
  ...normalizeGoalSettings(await readLocalGoalSettings()),
});
export const saveGoalSettingsWithMerge = async (partial) => {
  const current = await getGoalSettings();
  const next = { ...current, ...normalizeGoalSettings(partial) };
  await saveGoalSettings(next);
  return next;
};

export const DEFAULT_ONBOARDING_STATE = {
  seenFirstLoginOnboarding: false,
  completedPreset: false,
  completedReminders: false,
  completedQuietHours: false,
  completedGoal: false,
};
export const getOnboardingState = async () => ({
  ...DEFAULT_ONBOARDING_STATE,
  ...(await readLocalOnboarding()),
});
export const saveOnboardingStateWithMerge = async (partial) => {
  const current = await getOnboardingState();
  const next = { ...current, ...partial };
  await saveOnboardingState(next);
  return next;
};

export const getFriendsData = async () => {
  try {
    const remote = await fetchFriendsApi();
    await Promise.all([saveFriends(remote.friends), savePendingFriends(remote.pending)]);
    return remote;
  } catch {
    return {
      friends: await readLocalFriends(),
      pending: await readLocalPendingFriends(),
    };
  }
};

export const addFriendByCode = async (code) => {
  try {
    await addFriendByCodeApi(code);
  } catch {
    await enqueueOperation({ entity: "friends", op: "request", payload: { code } });
  }
  return getFriendsData();
};

export const acceptFriendRequest = async (requestId) => {
  try {
    await acceptFriendRequestApi(requestId);
  } catch {
    await enqueueOperation({ entity: "friends", op: "accept", payload: { requestId } });
  }
  return getFriendsData();
};

export const rejectFriendRequest = async (requestId) => {
  try {
    await rejectFriendRequestApi(requestId);
  } catch {
    await enqueueOperation({ entity: "friends", op: "reject", payload: { requestId } });
  }
  return getFriendsData();
};

export const getCircles = async () => {
  try {
    const circles = await fetchCirclesApi();
    await saveCircles(circles);
    return circles;
  } catch {
    return readLocalCircles();
  }
};

export const createCircle = async ({ name, memberIds }) => {
  const circles = await readLocalCircles();
  try {
    const remote = await createCircleApi({ name, memberIds });
    await saveCircles([remote, ...circles.filter((c) => c.id !== remote.id)]);
    return remote;
  } catch {
    const local = {
      id: buildLocalId(),
      name: String(name || "").trim(),
      members: [],
      settings: { liveNotificationsEnabled: false },
      createdBy: "local",
    };
    await saveCircles([local, ...circles]);
    await enqueueOperation({ entity: "circles", op: "create", payload: { name, memberIds } });
    return local;
  }
};

export const setCircleLiveNotifications = async ({ circleId, liveNotificationsEnabled }) => {
  const circles = await readLocalCircles();
  const next = circles.map((circle) =>
    circle.id !== circleId
      ? circle
      : { ...circle, settings: { ...(circle.settings || {}), liveNotificationsEnabled: Boolean(liveNotificationsEnabled) } }
  );
  await saveCircles(next);
  try {
    await saveCircleSettingsApi(circleId, liveNotificationsEnabled);
  } catch {
    await enqueueOperation({
      entity: "circles",
      op: "saveSettings",
      payload: { circleId, liveNotificationsEnabled: Boolean(liveNotificationsEnabled) },
    });
  }
};

export const buildExportPayload = async () => ({
  app: "Smoke Tracker",
  exportedAt: new Date().toISOString(),
  entries: await getSmokeEntries(),
  brands: await getBrands(),
  presets: await getPresets(),
  profile: await getProfile(),
  goals: await getGoalSettings(),
});

const normalizeImportEntry = (entry) => {
  const brand = String(entry?.brand || "").trim();
  if (!brand) return null;
  const quantity = Math.max(1, Number(entry?.quantity) || 1);
  const timestamp = Number(entry?.timestamp) || Date.now();
  const cost = normalizeCost(entry?.cost);
  const trigger = String(entry?.trigger || "").trim();
  return {
    id: String(entry?.id || buildLocalId()),
    brand,
    quantity,
    timestamp,
    ...(cost !== undefined ? { cost } : {}),
    ...(trigger ? { trigger } : {}),
  };
};

const normalizeImportPreset = (preset) => {
  const brand = String(preset?.brand || "").trim();
  if (!brand) return null;
  const quantity = Math.max(1, Number(preset?.quantity) || 1);
  const costPerSmoke = normalizeCost(preset?.costPerSmoke);
  const shortName = String(preset?.shortName || "").trim();
  return {
    id: String(preset?.id || buildLocalId()),
    brand,
    ...(shortName ? { shortName } : {}),
    quantity,
    ...(costPerSmoke !== undefined ? { costPerSmoke } : {}),
  };
};

const normalizeImportBrand = (brand) => {
  const name = String(brand?.name || brand || "").trim();
  if (!name) return null;
  return { id: String(brand?.id || buildLocalId()), name };
};

export const importBackupPayload = async (payload) => {
  const entries = Array.isArray(payload?.entries)
    ? payload.entries.map(normalizeImportEntry).filter(Boolean)
    : [];
  const presets = Array.isArray(payload?.presets)
    ? payload.presets.map(normalizeImportPreset).filter(Boolean)
    : [];
  const brandsFromPayload = Array.isArray(payload?.brands)
    ? payload.brands.map(normalizeImportBrand).filter(Boolean)
    : [];
  const profile = { ...DEFAULT_PROFILE, ...normalizeProfileFields(payload?.profile || {}) };
  const goals = { ...DEFAULT_GOAL_SETTINGS, ...normalizeGoalSettings(payload?.goals || {}) };

  const brandsFromEntries = Array.from(
    new Set(entries.map((entry) => normalizeBrand(entry.brand)))
  ).map((key) => ({ id: buildLocalId(), name: key }));
  const mergedBrandsMap = new Map();
  [...brandsFromPayload, ...brandsFromEntries].forEach((brand) => {
    mergedBrandsMap.set(normalizeBrand(brand.name), { ...brand, name: String(brand.name || "").trim() });
  });
  const brands = Array.from(mergedBrandsMap.values()).filter((brand) => brand.name);

  await Promise.all([
    saveSmokeEntries(entries.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))),
    savePresets(presets),
    saveBrands(brands),
    AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)),
    AsyncStorage.setItem(STORAGE_KEYS.GOAL_SETTINGS, JSON.stringify(goals)),
  ]);

  await Promise.allSettled(
    brands.map(async (brand) => {
      try {
        await createBrandApi(brand.name);
      } catch {
        await enqueueOperation({ entity: "brands", op: "create", payload: { name: brand.name } });
      }
    })
  );
  await Promise.allSettled(
    presets.map(async (preset) => {
      const p = {
        brand: preset.brand,
        ...(String(preset.shortName || "").trim() ? { shortName: String(preset.shortName).trim() } : {}),
        quantity: preset.quantity,
        ...(preset.costPerSmoke !== undefined ? { costPerSmoke: preset.costPerSmoke } : {}),
      };
      try {
        await createPresetApi(p);
      } catch {
        await enqueueOperation({ entity: "presets", op: "create", payload: p });
      }
    })
  );
  await Promise.allSettled(
    entries.map(async (entry) => {
      const p = { brand: entry.brand, quantity: entry.quantity, timestamp: entry.timestamp, ...(entry.cost !== undefined ? { cost: entry.cost } : {}) };
      try {
        await createEntryApi(p);
      } catch {
        await enqueueOperation({ entity: "entries", op: "create", payload: p });
      }
    })
  );
  try {
    await saveProfileApi(profile);
  } catch {
    await enqueueOperation({ entity: "profile", op: "upsert", payload: profile });
  }

  return {
    entries: entries.length,
    presets: presets.length,
    brands: brands.length,
  };
};

