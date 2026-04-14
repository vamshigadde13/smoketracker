import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { MessageModal } from "../components/MessageModal";
import { computeLoggingHighlights, formatDayKeyShort } from "../utils/date";
import { shareSmokeTrackerCsv, shareSmokeTrackerSpreadsheet } from "../utils/exportSpreadsheet";
import {
  DEFAULT_PROFILE,
  buildExportPayload,
  clearAllPresetsStorage,
  clearAllAppStorage,
  clearLogsAndBrands,
  clearProfileStorage,
  getProfile,
  saveProfile,
} from "../services/storage";
import { clearStoredAuthToken } from "../services/authProfile";

export function ProfileScreen({
  onProfileSaved,
  onLoggedOut,
  syncStatus,
  onSyncNow,
  entries = [],
  notificationSettings,
  notificationPermissionStatus = "undetermined",
  onUpdateNotificationSettings,
  onRequestNotificationPermission,
  logCount = 0,
  presetCount = 0,
  brandCount = 0,
}) {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedVisible, setSavedVisible] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoggedOutInfo, setShowLoggedOutInfo] = useState(false);
  const [showClearedInfo, setShowClearedInfo] = useState(false);
  const [exportError, setExportError] = useState(null);
  const highlights = useMemo(() => computeLoggingHighlights(entries), [entries]);
  const notificationsEnabled = Boolean(notificationSettings?.enabledDailyCheckin || notificationSettings?.enabledNoLogNudge);
  const hasNotifPermission = notificationPermissionStatus === "granted";

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      console.log("[ProfileNameDebug][ProfileScreen] loaded profile:", p);
      console.log("[ProfileNameDebug][ProfileScreen] loaded profile name:", p?.name);
      setForm(p);
      setDraft(p);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    console.log("[ProfileNameDebug][ProfileScreen] form.name changed:", form?.name);
  }, [form?.name]);

  const startEditAbout = () => {
    setDraft(form);
    setAboutEditing(true);
  };
  const cancelEditAbout = () => setAboutEditing(false);
  const saveAbout = async () => {
    const next = await saveProfile({ ...draft, name: form.name });
    setForm(next);
    setAboutEditing(false);
    setSavedVisible(true);
    onProfileSaved?.();
    setTimeout(() => setSavedVisible(false), 1200);
  };

  const handleExport = async () => {
    try {
      const payload = await buildExportPayload();
      try {
        await shareSmokeTrackerSpreadsheet(payload);
      } catch {
        await shareSmokeTrackerCsv(payload);
      }
    } catch (e) {
      setExportError(e?.message ? String(e.message) : "Export failed.");
    }
  };
  const runDangerAction = async () => {
    if (!pendingDangerAction) return;
    if (pendingDangerAction.kind === "logs") {
      await clearLogsAndBrands();
    } else if (pendingDangerAction.kind === "presets") {
      await clearAllPresetsStorage();
    } else if (pendingDangerAction.kind === "profile") {
      await clearProfileStorage();
      setForm(DEFAULT_PROFILE);
      setDraft(DEFAULT_PROFILE);
    } else {
      await clearAllAppStorage();
      setForm(DEFAULT_PROFILE);
      setDraft(DEFAULT_PROFILE);
    }
    onProfileSaved?.();
    setPendingDangerAction(null);
    setShowClearedInfo(true);
  };
  const updateNotif = useCallback(
    (partial) => notificationSettings && onUpdateNotificationSettings?.({ ...notificationSettings, ...partial }),
    [notificationSettings, onUpdateNotificationSettings]
  );
  const handleLogout = async () => {
    if (onLoggedOut) {
      await onLoggedOut();
    } else {
      await clearStoredAuthToken();
    }
    setShowLogoutConfirm(false);
    setShowLoggedOutInfo(true);
    onProfileSaved?.();
  };

  if (loading) return <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-gray-50"><Text className="text-gray-500">Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-5 pt-2" contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader title="Profile" subtitle="On this device" icon="person-outline" />
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-500">About you</Text>
            {!aboutEditing ? (
              <Pressable className="rounded-lg bg-gray-100 px-3 py-2" onPress={startEditAbout}>
                <Text className="text-sm font-semibold text-gray-800">Edit</Text>
              </Pressable>
            ) : null}
          </View>
          {!aboutEditing ? (
            <>
              <AboutReadRow label="Name" value={form.name} />
              <AboutReadRow label="Alias" value={form.alias} sub="Shown on Home when set" />
              <AboutReadRow label="Bio" value={form.bio} multiline />
            </>
          ) : (
            <>
              <Text className="mb-1 text-sm font-medium text-gray-600">Name</Text>
              <View className="mb-3 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3">
                <Text className="text-gray-700">{form.name?.trim() ? form.name : "—"}</Text>
                <Text className="mt-1 text-xs text-gray-500">Registration name cannot be changed.</Text>
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Alias</Text>
              <TextInput value={draft.alias} onChangeText={(t) => setDraft((p) => ({ ...p, alias: t }))} className="mb-3 rounded-xl border border-gray-200 px-3 py-3 text-gray-900" />
              <Text className="mb-1 text-sm font-medium text-gray-600">Bio (optional)</Text>
              <TextInput value={draft.bio} onChangeText={(t) => setDraft((p) => ({ ...p, bio: t }))} multiline className="mb-4 min-h-[100px] rounded-xl border border-gray-200 px-3 py-3 text-gray-900" />
              <View className="flex-row gap-3">
                <Pressable className="flex-1 rounded-xl border border-gray-300 bg-white py-3.5" onPress={cancelEditAbout}>
                  <Text className="text-center font-semibold text-gray-800">Cancel</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-gray-900 py-3.5" onPress={saveAbout}>
                  <Text className="text-center font-semibold text-white">Save</Text>
                </Pressable>
              </View>
            </>
          )}
          {savedVisible ? <Text className="mt-2 text-center text-sm font-medium text-emerald-700">Saved</Text> : null}
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Your data</Text>
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center">
            <View className="rounded-lg bg-sky-50 p-2">
              <Ionicons name="stats-chart-outline" size={16} color="#0284c7" />
            </View>
            <View className="ml-2 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</Text>
              <Text className="text-sm text-gray-700">Your progress and key highlights.</Text>
            </View>
          </View>
          <View className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <Text className="text-sm text-gray-600"><Text className="font-semibold text-gray-900">{logCount}</Text> logs · <Text className="font-semibold text-gray-900">{brandCount}</Text> brands · <Text className="font-semibold text-gray-900">{presetCount}</Text> presets</Text>
          </View>
          <View className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <Text className="text-sm text-gray-600">Longest streak: <Text className="font-semibold text-gray-900">{highlights.longestStreak} days</Text></Text>
            <Text className="mt-1 text-sm text-gray-600">Best day: <Text className="font-semibold text-gray-900">{highlights.bestDayAmount > 0 ? `${highlights.bestDayAmount} on ${formatDayKeyShort(highlights.bestDayKey)}` : "No logs yet"}</Text></Text>
          </View>
          <Text className="mb-3 mt-3 text-xs leading-5 text-gray-500">
            Exports Excel (.xlsx) first; CSV fallback if needed.
          </Text>
          <Pressable className="rounded-xl border border-gray-300 bg-white py-3" onPress={handleExport}>
            <Text className="text-center font-semibold text-gray-900">Export Excel / CSV</Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Notifications</Text>
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center">
            <View className="rounded-lg bg-indigo-50 p-2">
              <Ionicons name="notifications-outline" size={16} color="#4f46e5" />
            </View>
            <View className="ml-2 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reminders</Text>
              <Text className="text-sm text-gray-700">Optional, low-pressure nudges.</Text>
            </View>
          </View>

          <View className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <SettingToggleRow
              label="Daily check-in"
              sub="One reminder each day"
              value={Boolean(notificationSettings?.enabledDailyCheckin)}
              onToggle={(next) => updateNotif({ enabledDailyCheckin: next })}
            />
            <SettingToggleRow
              label="No-log nudge"
              sub="Only if no log today"
              value={Boolean(notificationSettings?.enabledNoLogNudge)}
              onToggle={(next) => updateNotif({ enabledNoLogNudge: next })}
            />
          </View>

          <View className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <SettingToggleRow
              label="Quiet hours"
              sub="Pause reminders overnight"
              value={Boolean(notificationSettings?.quietHoursEnabled)}
              onToggle={(next) => updateNotif({ quietHoursEnabled: next })}
            />
            <TimeAdjustRow
              label="Reminder time"
              value={notificationSettings?.dailyTime}
              onChange={(time) => updateNotif({ dailyTime: time })}
            />
            <TimeAdjustRow
              label="Quiet start"
              value={notificationSettings?.quietStart}
              disabled={!notificationSettings?.quietHoursEnabled}
              onChange={(time) => updateNotif({ quietStart: time })}
            />
            <TimeAdjustRow
              label="Quiet end"
              value={notificationSettings?.quietEnd}
              disabled={!notificationSettings?.quietHoursEnabled}
              onChange={(time) => updateNotif({ quietEnd: time })}
            />
          </View>

          {!hasNotifPermission && notificationsEnabled ? (
            <Pressable className="self-start rounded-lg bg-amber-100 px-3 py-2" onPress={onRequestNotificationPermission}>
              <Text className="font-semibold text-amber-900">Enable notifications</Text>
            </Pressable>
          ) : null}
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sync status</Text>
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center">
            <View className="rounded-lg bg-emerald-50 p-2">
              <Ionicons name="sync-outline" size={16} color="#059669" />
            </View>
            <View className="ml-2 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">Offline queue</Text>
              <Text className="text-sm text-gray-700">Queued writes auto-sync when app is active.</Text>
            </View>
          </View>
          <View className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <Text className="text-sm text-gray-700">
              Pending: <Text className="font-semibold text-gray-900">{Number(syncStatus?.queuedCount || 0)}</Text>
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Last success: {syncStatus?.lastSuccessAt ? new Date(syncStatus.lastSuccessAt).toLocaleString() : "Not synced yet"}
            </Text>
            {syncStatus?.lastError ? (
              <Text className="mt-1 text-xs text-red-600">Last error: {syncStatus.lastError}</Text>
            ) : null}
          </View>
          <Pressable className="mt-3 self-start rounded-lg bg-gray-100 px-3 py-2" onPress={onSyncNow}>
            <Text className="font-semibold text-gray-700">Sync now</Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">Danger zone</Text>
        <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <Text className="mb-3 text-sm text-red-900">Choose what to clear from this device.</Text>
          <View className="gap-2">
            <Pressable
              className="rounded-xl border border-red-200 bg-white py-3"
              onPress={() =>
                setPendingDangerAction({
                  kind: "logs",
                  title: "Clear logs and brands?",
                  message: "This removes all smoke logs and learned brands from this device.",
                  confirmText: "Clear logs",
                })
              }
            >
              <Text className="text-center font-semibold text-red-700">Clear logs + brands</Text>
            </Pressable>
            <Pressable
              className="rounded-xl border border-red-200 bg-white py-3"
              onPress={() =>
                setPendingDangerAction({
                  kind: "presets",
                  title: "Clear presets?",
                  message: "This removes all saved quick presets.",
                  confirmText: "Clear presets",
                })
              }
            >
              <Text className="text-center font-semibold text-red-700">Clear presets</Text>
            </Pressable>
            <Pressable
              className="rounded-xl border border-red-200 bg-white py-3"
              onPress={() =>
                setPendingDangerAction({
                  kind: "profile",
                  title: "Clear profile?",
                  message: "This removes your name, alias, and bio on this device.",
                  confirmText: "Clear profile",
                })
              }
            >
              <Text className="text-center font-semibold text-red-700">Clear profile</Text>
            </Pressable>
          </View>
          <Pressable
            className="mt-3 flex-row items-center justify-center rounded-xl bg-red-600 py-3.5"
            onPress={() =>
              setPendingDangerAction({
                kind: "all",
                title: "Delete all app data?",
                message: "This will remove logs, presets, brands, profile, and notification settings from this device.",
                confirmText: "Delete all",
              })
            }
          >
            <Ionicons name="skull-outline" size={16} color="#fff" />
            <Text className="ml-2 text-center font-semibold text-white">Delete all app data</Text>
          </Pressable>
        </View>
        <Pressable
          className="mt-4 mb-2 flex-row items-center justify-center rounded-xl border border-gray-300 bg-white py-3.5"
          onPress={() => setShowLogoutConfirm(true)}
        >
          <Ionicons name="log-out-outline" size={16} color="#374151" />
          <Text className="ml-2 text-center font-semibold text-gray-700">Logout</Text>
        </Pressable>
      </ScrollView>
      <MessageModal
        visible={Boolean(pendingDangerAction)}
        title={pendingDangerAction?.title || "Confirm action"}
        message={pendingDangerAction?.message || ""}
        cancelText="Cancel"
        confirmText={pendingDangerAction?.confirmText || "Confirm"}
        destructive
        onClose={() => setPendingDangerAction(null)}
        onConfirm={runDangerAction}
      />
      <MessageModal
        visible={showLogoutConfirm}
        title="Logout?"
        message="You will be signed out on this device."
        cancelText="Cancel"
        confirmText="Logout"
        destructive
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
      <MessageModal
        visible={showLoggedOutInfo}
        title="Logged out"
        message="You have been signed out on this device."
        confirmText="OK"
        onClose={() => setShowLoggedOutInfo(false)}
        onConfirm={() => setShowLoggedOutInfo(false)}
      />
      <MessageModal
        visible={showClearedInfo}
        title="Data removed"
        message="All local Smoke Tracker data has been deleted."
        confirmText="OK"
        onClose={() => setShowClearedInfo(false)}
        onConfirm={() => setShowClearedInfo(false)}
      />
      <MessageModal
        visible={exportError != null}
        title="Export failed"
        message={exportError || "Something went wrong."}
        confirmText="OK"
        onClose={() => setExportError(null)}
        onConfirm={() => setExportError(null)}
      />
    </SafeAreaView>
  );
}

function AboutReadRow({ label, value, sub, multiline }) {
  const empty = !value?.trim();
  return (
    <View className={multiline ? "mb-4" : "mb-3"}>
      <Text className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</Text>
      {sub ? <Text className="mb-1 text-[10px] text-gray-400">{sub}</Text> : null}
      <Text className={`text-base ${empty ? "text-gray-400" : "text-gray-900"}`} numberOfLines={multiline ? undefined : 2}>
        {empty ? "—" : value.trim()}
      </Text>
    </View>
  );
}

function SettingToggleRow({ label, sub, value, onToggle }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="mr-3 flex-1"><Text className="text-sm font-semibold text-gray-900">{label}</Text><Text className="text-xs text-gray-500">{sub}</Text></View>
      <Pressable className={`rounded-full px-3 py-1.5 ${value ? "bg-emerald-600" : "bg-gray-300"}`} onPress={() => onToggle(!value)}><Text className={`text-xs font-semibold ${value ? "text-white" : "text-gray-700"}`}>{value ? "On" : "Off"}</Text></Pressable>
    </View>
  );
}

function TimeAdjustRow({ label, value, onChange, disabled }) {
  const hour = Number(value?.hour ?? 0);
  const minute = Number(value?.minute ?? 0);
  const update = (deltaHour = 0, deltaMinute = 0) => {
    const total = ((hour * 60 + minute + deltaHour * 60 + deltaMinute) % 1440 + 1440) % 1440;
    onChange?.({ hour: Math.floor(total / 60), minute: total % 60 });
  };
  return (
    <View className={`mb-3 flex-row items-center justify-between ${disabled ? "opacity-50" : ""}`}>
      <Text className="text-sm font-semibold text-gray-900">{label}</Text>
      <View className="flex-row items-center">
        <Pressable disabled={disabled} onPress={() => update(-1, 0)} className="rounded-md bg-gray-100 px-2 py-1"><Text className="text-xs font-semibold text-gray-700">-1h</Text></Pressable>
        <Pressable disabled={disabled} onPress={() => update(0, -15)} className="ml-1 rounded-md bg-gray-100 px-2 py-1"><Text className="text-xs font-semibold text-gray-700">-15m</Text></Pressable>
        <Text className="mx-2 text-sm font-semibold text-gray-900">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}</Text>
        <Pressable disabled={disabled} onPress={() => update(0, 15)} className="mr-1 rounded-md bg-gray-100 px-2 py-1"><Text className="text-xs font-semibold text-gray-700">+15m</Text></Pressable>
        <Pressable disabled={disabled} onPress={() => update(1, 0)} className="rounded-md bg-gray-100 px-2 py-1"><Text className="text-xs font-semibold text-gray-700">+1h</Text></Pressable>
      </View>
    </View>
  );
}

