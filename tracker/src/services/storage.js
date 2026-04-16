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

const readLocalEntries = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.SMOKE_ENTRIES), []);
const readLocalBrands = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.BRANDS), []);
const readLocalPresets = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PRESETS), []);
const readLocalProfile = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PROFILE), {});
const readLocalNotificationSettings = async () =>
  safeParse(await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS), {});
const readLocalFriends = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS), []);
const readLocalPendingFriends = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.PENDING_FRIENDS), []);
const readLocalCircles = async () => safeParse(await AsyncStorage.getItem(STORAGE_KEYS.CIRCLES), []);

export const saveSmokeEntries = async (entries) =>
  AsyncStorage.setItem(STORAGE_KEYS.SMOKE_ENTRIES, JSON.stringify(entries));
export const saveBrands = async (brands) => AsyncStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
export const savePresets = async (presets) => AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
export const saveFriends = async (friends) => AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
export const savePendingFriends = async (pending) =>
  AsyncStorage.setItem(STORAGE_KEYS.PENDING_FRIENDS, JSON.stringify(pending));
export const saveCircles = async (circles) => AsyncStorage.setItem(STORAGE_KEYS.CIRCLES, JSON.stringify(circles));

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
  try {
    const presets = await fetchPresetsApi();
    await savePresets(presets);
    return presets;
  } catch {
    return readLocalPresets();
  }
};

export const addPreset = async ({ brand, quantity, costPerSmoke }) => {
  const presets = await readLocalPresets();
  const unit = normalizeCost(costPerSmoke);
  const localPreset = {
    id: buildLocalId(),
    brand: String(brand || "").trim(),
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

export const updatePreset = async ({ id, brand, quantity, costPerSmoke }) => {
  const presets = await readLocalPresets();
  const unit = normalizeCost(costPerSmoke);
  const payload = {
    id,
    brand: String(brand || "").trim(),
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

export const addSmokeEntry = async ({ brand, quantity, timestamp, cost, shareToCircle, circleId, shareCircleIds, shareFriendIds }) => {
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

export const updateSmokeEntry = async ({ id, brand, quantity, timestamp, cost, shareToCircle, circleId, shareCircleIds, shareFriendIds }) => {
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
  dailyTime: normalizeClockTime(o.dailyTime, DEFAULT_NOTIFICATION_SETTINGS.dailyTime),
  quietHoursEnabled: o.quietHoursEnabled === undefined ? true : Boolean(o.quietHoursEnabled),
  quietStart: normalizeClockTime(o.quietStart, DEFAULT_NOTIFICATION_SETTINGS.quietStart),
  quietEnd: normalizeClockTime(o.quietEnd, DEFAULT_NOTIFICATION_SETTINGS.quietEnd),
  permissionAsked: Boolean(o.permissionAsked),
});
export const getNotificationSettings = async () => {
  try {
    const remote = normalizeNotificationSettings(normalizeNotificationSettingsApi(await fetchNotificationSettingsApi()));
    const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...remote };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(next));
    return next;
  } catch {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...normalizeNotificationSettings(await readLocalNotificationSettings()),
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
    const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...remote };
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
});

