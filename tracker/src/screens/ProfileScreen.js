import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
  importBackupPayload,
  saveProfile,
} from "../services/storage";
import { clearStoredAuthToken, deleteAccountOnServer } from "../services/authProfile";

export function ProfileScreen({
  username = "",
  uniqueCode = "",
  onProfileSaved,
  onLoggedOut,
  syncStatus,
  onSyncNow,
  entries = [],
  notificationSettings,
  notificationPermissionStatus = "undetermined",
  onUpdateNotificationSettings,
  goals,
  onUpdateGoals,
  onRequestNotificationPermission,
  logCount = 0,
  presetCount = 0,
  brandCount = 0,
  presets = [],
  onOpenPresetsManager,
  onAddStarterPresets,
}) {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedVisible, setSavedVisible] = useState(false);
  const [copiedCodeVisible, setCopiedCodeVisible] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoggedOutInfo, setShowLoggedOutInfo] = useState(false);
  const [showClearedInfo, setShowClearedInfo] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [goalDraft, setGoalDraft] = useState({ dailyLimit: "0", weeklyLimit: "0" });
  const [activeSectionModal, setActiveSectionModal] = useState(null);
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
  useEffect(() => {
    setGoalDraft({
      dailyLimit: String(goals?.dailyLimit ?? 0),
      weeklyLimit: String(goals?.weeklyLimit ?? 0),
    });
  }, [goals?.dailyLimit, goals?.weeklyLimit]);

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
  const handleExportJson = async () => {
    try {
      const payload = await buildExportPayload();
      await Clipboard.setStringAsync(JSON.stringify(payload, null, 2));
      setImportSuccess("Backup JSON copied to clipboard.");
    } catch (e) {
      setExportError(e?.message ? String(e.message) : "Export failed.");
    }
  };
  const handleImportJsonFromClipboard = async () => {
    try {
      const raw = await Clipboard.getStringAsync();
      const parsed = JSON.parse(String(raw || "{}"));
      const result = await importBackupPayload(parsed);
      onProfileSaved?.();
      setImportSuccess(`Imported ${result.entries} logs, ${result.presets} presets, ${result.brands} brands.`);
    } catch (e) {
      setImportError(e?.message ? String(e.message) : "Import failed. Copy a valid JSON backup and try again.");
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
    async (partial) => {
      if (!notificationSettings || notifSaving) return;
      setNotifSaving(true);
      try {
        await onUpdateNotificationSettings?.({ ...notificationSettings, ...partial });
      } finally {
        setNotifSaving(false);
      }
    },
    [notificationSettings, onUpdateNotificationSettings, notifSaving]
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
  const handleCopyUniqueCode = async () => {
    const value = String(uniqueCode || "").trim();
    if (!value) return;
    await Clipboard.setStringAsync(value);
    setCopiedCodeVisible(true);
    setTimeout(() => setCopiedCodeVisible(false), 1200);
  };
  const handleDeleteAccount = async () => {
    try {
      await deleteAccountOnServer({ reason: deleteReason });
      await clearAllAppStorage();
      await clearStoredAuthToken();
      setShowDeleteAccountConfirm(false);
      setDeleteReason("");
      if (onLoggedOut) {
        await onLoggedOut();
      }
      setShowLoggedOutInfo(true);
    } catch (e) {
      setDeleteAccountError(
        e?.message ? String(e.message) : "Could not delete account. Please try again."
      );
    }
  };
  const sectionTitleMap = {
    data: "Your data",
    notifications: "Notifications",
    goals: "Goal settings",
    presets: "Presets",
    sync: "Sync status",
    danger: "Danger zone",
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
              <AboutReadRow label="Username" value={username} sub="Registration username" />
              <View className="mb-3">
                <Text className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Unique code</Text>
                <Text className="mb-1 text-[10px] text-gray-400">Used by friends to add you</Text>
                <View className="flex-row items-center justify-between">
                  <Text className={`mr-3 flex-1 text-base ${uniqueCode?.trim() ? "text-gray-900" : "text-gray-400"}`} numberOfLines={2}>
                    {uniqueCode?.trim() ? uniqueCode.trim() : "—"}
                  </Text>
                  <Pressable
                    disabled={!uniqueCode?.trim()}
                    className={`rounded-lg px-3 py-1.5 ${uniqueCode?.trim() ? "bg-gray-100" : "bg-gray-200"}`}
                    onPress={handleCopyUniqueCode}
                  >
                    <Text className={`text-xs font-semibold ${uniqueCode?.trim() ? "text-gray-800" : "text-gray-500"}`}>
                      {copiedCodeVisible ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <AboutReadRow label="Alias" value={form.alias} sub="Shown on Home when set" />
              <AboutReadRow label="Bio" value={form.bio} multiline />
            </>
          ) : (
            <>
              <Text className="mb-1 text-sm font-medium text-gray-600">Username</Text>
              <View className="mb-3 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3">
                <Text className="text-gray-700">{username?.trim() ? username : "—"}</Text>
                <Text className="mt-1 text-xs text-gray-500">Username cannot be changed.</Text>
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Unique code</Text>
              <View className="mb-3 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3">
                <Text className="text-gray-700">{uniqueCode?.trim() ? uniqueCode : "—"}</Text>
                <Text className="mt-1 text-xs text-gray-500">Your code is fixed and cannot be changed.</Text>
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

        <SectionCard
          title="Your data"
          subtitle={`${logCount} logs · ${brandCount} brands · ${presetCount} presets`}
          icon="stats-chart-outline"
          onPress={() => setActiveSectionModal("data")}
        />
        <SectionCard
          title="Notifications"
          subtitle={`${notificationsEnabled ? "Enabled" : "Disabled"} · quiet hours ${notificationSettings?.quietHoursEnabled ? "on" : "off"}`}
          icon="notifications-outline"
          onPress={() => setActiveSectionModal("notifications")}
        />
        <SectionCard
          title="Goal settings"
          subtitle={`Daily ${goals?.dailyLimit || 0} · Weekly ${goals?.weeklyLimit || 0}`}
          icon="flag-outline"
          onPress={() => setActiveSectionModal("goals")}
        />
        <SectionCard
          title="Presets"
          subtitle={`${presetCount} saved presets`}
          icon="bookmark-outline"
          onPress={() => setActiveSectionModal("presets")}
        />
        <SectionCard
          title="Sync status"
          subtitle={`Pending ${Number(syncStatus?.queuedCount || 0)}`}
          icon="sync-outline"
          onPress={() => setActiveSectionModal("sync")}
        />
        <SectionCard
          title="Danger zone"
          subtitle="Reset and account controls"
          icon="warning-outline"
          danger
          onPress={() => setActiveSectionModal("danger")}
        />
        <Pressable
          className="mt-4 mb-2 flex-row items-center justify-center rounded-xl border border-gray-300 bg-white py-3.5"
          onPress={() => setShowLogoutConfirm(true)}
        >
          <Ionicons name="log-out-outline" size={16} color="#374151" />
          <Text className="ml-2 text-center font-semibold text-gray-700">Logout</Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={Boolean(activeSectionModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSectionModal(null)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="max-h-[88%] rounded-t-3xl bg-white p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">{sectionTitleMap[activeSectionModal] || "Details"}</Text>
              <Pressable onPress={() => setActiveSectionModal(null)} className="rounded-lg bg-gray-100 px-3 py-1.5">
                <Text className="text-xs font-semibold text-gray-700">Close</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {activeSectionModal === "data" ? (
                <>
                  <View className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <Text className="text-sm text-gray-600"><Text className="font-semibold text-gray-900">{logCount}</Text> logs · <Text className="font-semibold text-gray-900">{brandCount}</Text> brands · <Text className="font-semibold text-gray-900">{presetCount}</Text> presets</Text>
                  </View>
                  <View className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <Text className="text-sm text-gray-600">Longest streak: <Text className="font-semibold text-gray-900">{highlights.longestStreak} days</Text></Text>
                    <Text className="mt-1 text-sm text-gray-600">Best day: <Text className="font-semibold text-gray-900">{highlights.bestDayAmount > 0 ? `${highlights.bestDayAmount} on ${formatDayKeyShort(highlights.bestDayKey)}` : "No logs yet"}</Text></Text>
                  </View>
                  <View className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-2">
                    <View className="flex-row gap-2">
                      <Pressable className="flex-1 rounded-lg border border-gray-300 bg-white py-3" onPress={handleExport}>
                        <Text className="text-center text-xs font-semibold text-gray-900">Export Excel / CSV</Text>
                      </Pressable>
                      <Pressable className="flex-1 rounded-lg border border-gray-300 bg-white py-3" onPress={handleExportJson}>
                        <Text className="text-center text-xs font-semibold text-gray-900">Copy Backup JSON</Text>
                      </Pressable>
                    </View>
                    <Pressable className="mt-2 rounded-lg bg-gray-900 py-3" onPress={handleImportJsonFromClipboard}>
                      <Text className="text-center font-semibold text-white">Import JSON Backup</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
              {activeSectionModal === "notifications" ? (
                <>
                  <SettingToggleRow label="Daily check-in" sub="One reminder each day" value={Boolean(notificationSettings?.enabledDailyCheckin)} disabled={notifSaving} onToggle={(next) => updateNotif({ enabledDailyCheckin: next })} />
                  <SettingToggleRow label="No-log nudge" sub="Only if no log today" value={Boolean(notificationSettings?.enabledNoLogNudge)} disabled={notifSaving} onToggle={(next) => updateNotif({ enabledNoLogNudge: next })} />
                  <SettingToggleRow label="Smart nudge" sub="Near your usual smoking time" value={Boolean(notificationSettings?.enabledSmartNudges)} disabled={notifSaving} onToggle={(next) => updateNotif({ enabledSmartNudges: next })} />
                  <SettingToggleRow label="Weekly summary" sub="Weekly progress update" value={Boolean(notificationSettings?.enabledWeeklySummary)} disabled={notifSaving} onToggle={(next) => updateNotif({ enabledWeeklySummary: next })} />
                  <View className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <SettingToggleRow label="Quiet hours" sub="Pause reminders overnight" value={Boolean(notificationSettings?.quietHoursEnabled)} disabled={notifSaving} onToggle={(next) => updateNotif({ quietHoursEnabled: next })} />
                    {notificationSettings?.quietHoursEnabled ? <><QuietHoursPresets disabled={notifSaving} onSelect={(preset) => updateNotif({ quietStart: preset.start, quietEnd: preset.end })} /><QuietHoursEditor start={notificationSettings?.quietStart} end={notificationSettings?.quietEnd} disabled={notifSaving} onChangeStart={(time) => updateNotif({ quietStart: time })} onChangeEnd={(time) => updateNotif({ quietEnd: time })} /></> : null}
                    <TimeAdjustRow label="Reminder time" value={notificationSettings?.dailyTime} disabled={notifSaving} onChange={(time) => updateNotif({ dailyTime: time })} />
                  </View>
                </>
              ) : null}
              {activeSectionModal === "goals" ? (
                <>
                  <Text className="mb-1 text-sm font-medium text-gray-600">Daily limit</Text>
                  <TextInput value={goalDraft.dailyLimit} onChangeText={(t) => setGoalDraft((prev) => ({ ...prev, dailyLimit: t.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" className="mb-3 rounded-xl border border-gray-200 px-3 py-3 text-gray-900" placeholder="e.g. 8" />
                  <Text className="mb-1 text-sm font-medium text-gray-600">Weekly limit</Text>
                  <TextInput value={goalDraft.weeklyLimit} onChangeText={(t) => setGoalDraft((prev) => ({ ...prev, weeklyLimit: t.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" className="mb-3 rounded-xl border border-gray-200 px-3 py-3 text-gray-900" placeholder="e.g. 50" />
                  <Pressable className="rounded-xl bg-gray-900 py-3" onPress={() => onUpdateGoals?.({ dailyLimit: Number(goalDraft.dailyLimit) || 0, weeklyLimit: Number(goalDraft.weeklyLimit) || 0 })}>
                    <Text className="text-center font-semibold text-white">Save goals</Text>
                  </Pressable>
                </>
              ) : null}
              {activeSectionModal === "presets" ? (
                <>
                  {presets.length ? <View className="mb-3 flex-row flex-wrap">{presets.slice(0, 10).map((preset) => <View key={preset.id} className="mb-2 mr-2 rounded-full border border-gray-300 bg-white px-3 py-2"><Text className="text-xs font-semibold text-gray-700">{(preset.shortName || preset.brand)} ({preset.quantity})</Text></View>)}</View> : <Text className="mb-3 text-sm text-gray-500">No presets yet.</Text>}
                  <Pressable className="mb-2 rounded-xl border border-amber-300 bg-amber-50 py-3" onPress={onAddStarterPresets}>
                    <Text className="text-center font-semibold text-amber-800">Add recommended presets</Text>
                  </Pressable>
                  <Pressable className="rounded-xl bg-gray-900 py-3" onPress={onOpenPresetsManager}>
                    <Text className="text-center font-semibold text-white">Manage presets</Text>
                  </Pressable>
                </>
              ) : null}
              {activeSectionModal === "sync" ? (
                <>
                  <View className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <Text className="text-sm text-gray-700">Pending: <Text className="font-semibold text-gray-900">{Number(syncStatus?.queuedCount || 0)}</Text></Text>
                    <Text className="mt-1 text-xs text-gray-500">Last success: {syncStatus?.lastSuccessAt ? new Date(syncStatus.lastSuccessAt).toLocaleString() : "Not synced yet"}</Text>
                    {syncStatus?.lastError ? <Text className="mt-1 text-xs text-red-600">Last error: {syncStatus.lastError}</Text> : null}
                  </View>
                  <Pressable className="mt-3 self-start rounded-lg bg-gray-100 px-3 py-2" onPress={onSyncNow}>
                    <Text className="font-semibold text-gray-700">Sync now</Text>
                  </Pressable>
                </>
              ) : null}
              {activeSectionModal === "danger" ? (
                <>
                  <View className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <View className="flex-row gap-2">
                      <Pressable className="flex-1 rounded-lg border border-rose-200 bg-white py-2.5" onPress={() => setPendingDangerAction({ kind: "logs", title: "Clear logs and brands?", message: "This removes all smoke logs and learned brands from this device.", confirmText: "Clear logs" })}><Text className="text-center text-xs font-semibold text-rose-700">Logs + brands</Text></Pressable>
                      <Pressable className="flex-1 rounded-lg border border-rose-200 bg-white py-2.5" onPress={() => setPendingDangerAction({ kind: "presets", title: "Clear presets?", message: "This removes all saved quick presets.", confirmText: "Clear presets" })}><Text className="text-center text-xs font-semibold text-rose-700">Presets</Text></Pressable>
                    </View>
                    <View className="mt-2 flex-row gap-2">
                      <Pressable className="flex-1 rounded-lg border border-rose-200 bg-white py-2.5" onPress={() => setPendingDangerAction({ kind: "profile", title: "Clear profile?", message: "This removes your name, alias, and bio on this device.", confirmText: "Clear profile" })}><Text className="text-center text-xs font-semibold text-rose-700">Profile only</Text></Pressable>
                      <Pressable className="flex-1 rounded-lg border border-rose-300 bg-rose-50 py-2.5" onPress={() => setPendingDangerAction({ kind: "all", title: "Delete all app data?", message: "This will remove logs, presets, brands, profile, and notification settings from this device.", confirmText: "Delete all" })}><Text className="text-center text-xs font-semibold text-rose-800">Delete all local</Text></Pressable>
                    </View>
                  </View>
                  <View className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <Text className="mb-2 text-xs text-rose-700">Deletes your backend account and logs out from this device.</Text>
                    <Pressable className="flex-row items-center justify-center rounded-lg bg-rose-600 py-3.5 active:bg-rose-700" onPress={() => setShowDeleteAccountConfirm(true)}>
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text className="ml-2 text-center font-semibold text-white">Delete account permanently</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      <MessageModal
        visible={importError != null}
        title="Import failed"
        message={importError || "Something went wrong."}
        confirmText="OK"
        onClose={() => setImportError(null)}
        onConfirm={() => setImportError(null)}
      />
      <MessageModal
        visible={importSuccess != null}
        title="Import ready"
        message={importSuccess || "Done."}
        confirmText="OK"
        onClose={() => setImportSuccess(null)}
        onConfirm={() => setImportSuccess(null)}
      />
      <Modal
        visible={showDeleteAccountConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountConfirm(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-gray-900">Delete account permanently?</Text>
            <Text className="mt-2 text-sm text-gray-600">
              This removes your account on backend and signs you out. This action cannot be undone.
            </Text>
            <Text className="mt-3 text-sm font-medium text-gray-700">Reason for deleting (optional)</Text>
            <TextInput
              value={deleteReason}
              onChangeText={setDeleteReason}
              placeholder="Tell us what made you leave..."
              multiline
              className="mt-2 min-h-[80px] rounded-xl border border-gray-200 px-3 py-3 text-gray-900"
            />
            <View className="mt-4 flex-row justify-end">
              <Pressable
                onPress={() => {
                  setShowDeleteAccountConfirm(false);
                  setDeleteReason("");
                }}
                className="mr-2 rounded-lg bg-gray-100 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDeleteAccount} className="rounded-lg bg-red-600 px-4 py-2">
                <Text className="text-sm font-semibold text-white">Delete account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <MessageModal
        visible={deleteAccountError != null}
        title="Delete account failed"
        message={deleteAccountError || "Something went wrong."}
        confirmText="OK"
        onClose={() => setDeleteAccountError(null)}
        onConfirm={() => setDeleteAccountError(null)}
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

function SettingToggleRow({ label, sub, value, onToggle, disabled }) {
  return (
    <View className={`mb-3 flex-row items-center justify-between ${disabled ? "opacity-60" : ""}`}>
      <View className="mr-3 flex-1"><Text className="text-sm font-semibold text-gray-900">{label}</Text><Text className="text-xs text-gray-500">{sub}</Text></View>
      <Pressable
        disabled={disabled}
        className={`rounded-full px-3 py-1.5 ${value ? "bg-emerald-600" : "bg-gray-300"}`}
        onPress={() => onToggle(!value)}
      ><Text className={`text-xs font-semibold ${value ? "text-white" : "text-gray-700"}`}>{value ? "On" : "Off"}</Text></Pressable>
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

function formatClock(value) {
  const hour = Number(value?.hour ?? 0);
  const minute = Number(value?.minute ?? 0);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function shiftTime(value, deltaMinutes) {
  const hour = Number(value?.hour ?? 0);
  const minute = Number(value?.minute ?? 0);
  const total = ((hour * 60 + minute + deltaMinutes) % 1440 + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

function QuietHoursPresets({ onSelect, disabled }) {
  const presets = [
    { id: "p1", label: "10 PM - 8 AM", start: { hour: 22, minute: 0 }, end: { hour: 8, minute: 0 } },
    { id: "p2", label: "11 PM - 7 AM", start: { hour: 23, minute: 0 }, end: { hour: 7, minute: 0 } },
    { id: "p3", label: "12 AM - 8 AM", start: { hour: 0, minute: 0 }, end: { hour: 8, minute: 0 } },
  ];

  return (
    <View className={`mb-3 ${disabled ? "opacity-60" : ""}`}>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Quick presets</Text>
      <View className="flex-row flex-wrap">
        {presets.map((preset) => (
          <Pressable
            key={preset.id}
            disabled={disabled}
            className="mb-2 mr-2 rounded-full border border-gray-300 bg-white px-3 py-2"
            onPress={() => onSelect?.(preset)}
          >
            <Text className="text-xs font-semibold text-gray-700">{preset.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function QuietHoursEditor({ start, end, onChangeStart, onChangeEnd, disabled }) {
  return (
    <View className={`mb-3 rounded-xl border border-gray-200 bg-white p-3 ${disabled ? "opacity-60" : ""}`}>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom quiet hours</Text>
      <Text className="mb-3 text-sm text-gray-700">
        {formatClock(start)} to {formatClock(end)}
      </Text>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-900">Start</Text>
        <View className="flex-row items-center">
          <Pressable
            disabled={disabled}
            onPress={() => onChangeStart?.(shiftTime(start, -15))}
            className="rounded-md bg-gray-100 px-2 py-1"
          >
            <Text className="text-xs font-semibold text-gray-700">-15m</Text>
          </Pressable>
          <Text className="mx-2 text-sm font-semibold text-gray-900">{formatClock(start)}</Text>
          <Pressable
            disabled={disabled}
            onPress={() => onChangeStart?.(shiftTime(start, 15))}
            className="rounded-md bg-gray-100 px-2 py-1"
          >
            <Text className="text-xs font-semibold text-gray-700">+15m</Text>
          </Pressable>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-900">End</Text>
        <View className="flex-row items-center">
          <Pressable
            disabled={disabled}
            onPress={() => onChangeEnd?.(shiftTime(end, -15))}
            className="rounded-md bg-gray-100 px-2 py-1"
          >
            <Text className="text-xs font-semibold text-gray-700">-15m</Text>
          </Pressable>
          <Text className="mx-2 text-sm font-semibold text-gray-900">{formatClock(end)}</Text>
          <Pressable
            disabled={disabled}
            onPress={() => onChangeEnd?.(shiftTime(end, 15))}
            className="rounded-md bg-gray-100 px-2 py-1"
          >
            <Text className="text-xs font-semibold text-gray-700">+15m</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SectionCard({ title, subtitle, icon, onPress, danger = false }) {
  return (
    <Pressable
      className={`mb-3 rounded-2xl border bg-white p-4 shadow-sm ${danger ? "border-rose-200" : "border-gray-200"}`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className={`rounded-lg p-2 ${danger ? "bg-rose-50" : "bg-gray-100"}`}>
          <Ionicons name={icon} size={16} color={danger ? "#be123c" : "#374151"} />
        </View>
        <View className="ml-2 flex-1">
          <Text className={`text-sm font-semibold ${danger ? "text-rose-900" : "text-gray-900"}`}>{title}</Text>
          <Text className={`text-xs ${danger ? "text-rose-700" : "text-gray-600"}`}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={danger ? "#be123c" : "#9ca3af"} />
      </View>
    </Pressable>
  );
}

