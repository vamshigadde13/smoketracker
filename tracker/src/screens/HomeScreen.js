import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StreakBadge } from "../components/StreakBadge";
import { getAnalyticsSummary } from "../services/analytics";
import { computeLoggingHighlights, computeLoggingStreak, formatDayKeyShort, formatTime, isYesterday } from "../utils/date";
import { formatMoney, normalizeCost } from "../utils/money";

const qty = (e) => Number(e.quantity) || 0;

export function HomeScreen({ entries, presets, profile, onOpenAddModal, onQuickLog, onRefresh }) {
  const { todayTotal, todayLogCount, todaySpend, weekTotal, allTimeSpend } = getAnalyticsSummary(entries);
  const greetName = profile?.alias?.trim() || profile?.name?.trim() || null;
  const totalLogged = entries.reduce((s, e) => s + qty(e), 0);
  const latestEntry = entries[0];
  const yesterdayTotal = entries.filter((e) => isYesterday(e.timestamp)).reduce((s, e) => s + qty(e), 0);
  const delta = todayTotal - yesterdayTotal;
  const topPresets = presets.slice(0, 4);
  const recentEntries = entries.slice(0, 5);
  const recentBrands = Array.from(
    new Set(entries.map((e) => String(e.brand || "").trim()).filter(Boolean))
  ).slice(0, 5);
  const streak = useMemo(() => computeLoggingStreak(entries), [entries]);
  const highlights = useMemo(() => computeLoggingHighlights(entries), [entries]);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);
  const todaySubline = todayTotal === 0 && yesterdayTotal === 0 ? "No logs yet today or yesterday" : delta === 0 ? "Same smoke total as yesterday" : `${Math.abs(delta)} smokes ${delta > 0 ? "above" : "below"} yesterday`;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              {greetName ? (<><Text className="text-2xl font-bold text-gray-900">Hi, {greetName}</Text><Text className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">Smoke Tracker</Text></>) : <Text className="text-2xl font-bold text-gray-900">Smoke Tracker</Text>}
            </View>
            <StreakBadge variant={streak.variant} count={streak.count} />
          </View>
          {streak.variant === "at_risk" ? <Text className="mt-2.5 text-center text-xs font-medium text-amber-800">Log today to keep your {streak.count}-day streak alive.</Text> : null}
        </View>

        <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-start">
            <View className="mr-3 rounded-xl bg-amber-50 p-2.5"><Ionicons name="sunny-outline" size={22} color="#ca8a04" /></View>
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Today</Text>
              <Text className="mt-1 text-4xl font-bold text-gray-900">{todayTotal}</Text>
              <Text className="text-sm text-gray-500">smokes logged</Text>
              <Text className="mt-2 text-sm text-gray-600">{todaySubline}</Text>
              {todayLogCount > 0 ? <Text className="mt-1 text-xs text-gray-500">{todayLogCount} {todayLogCount === 1 ? "log" : "logs"} today</Text> : null}
              {todaySpend > 0 ? <Text className="mt-2 text-sm font-semibold text-emerald-800">{formatMoney(todaySpend)} today</Text> : null}
            </View>
          </View>
          <View className="mt-4 border-t border-gray-100 pt-3"><Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">This week</Text><Text className="mt-0.5 text-sm font-medium text-gray-800">{weekTotal} smokes (Sun–today)</Text></View>
        </View>

        <Pressable onPress={onOpenAddModal} className="mb-4 flex-row items-center justify-center rounded-2xl bg-gray-900 py-4 active:bg-gray-800"><Ionicons name="add-circle-outline" size={22} color="#fff" /><Text className="ml-2 text-lg font-semibold text-white">Log smoke</Text></Pressable>

        {topPresets.length > 0 ? (
          <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
            <View className="mb-3 flex-row items-center">
              <Ionicons name="flash-outline" size={16} color="#6b7280" />
              <Text className="ml-2 text-base font-semibold text-gray-900">Quick presets</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {topPresets.map((preset) => (
                <Pressable key={preset.id} className="mr-2 rounded-2xl bg-gray-900 px-4 py-3 active:bg-gray-800" onPress={() => { const u = normalizeCost(preset.costPerSmoke); const cost = u !== undefined ? Math.round(u * preset.quantity * 100) / 100 : undefined; onQuickLog({ brand: preset.brand, quantity: preset.quantity, cost }); }}>
                  <Text className="text-center text-sm font-semibold text-white">{preset.brand}</Text>
                  <Text className="mt-0.5 text-center text-xs text-gray-300">{preset.quantity} {preset.quantity === 1 ? "smoke" : "smokes"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {recentBrands.length > 0 ? (
          <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
            <View className="mb-1 flex-row items-center">
              <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
              <Text className="ml-2 text-base font-semibold text-gray-900">Recent brands</Text>
            </View>
            <Text className="mb-3 text-xs text-gray-500">
              Tap to log 1 smoke quickly.
            </Text>
            <View className="flex-row flex-wrap">
              {recentBrands.map((brand) => (
                <Pressable
                  key={brand}
                  onPress={() => onQuickLog({ brand, quantity: 1 })}
                  className="mb-2 mr-2 rounded-full border border-gray-300 bg-white px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-gray-700">{brand}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View className="rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-3 text-base font-semibold text-gray-900">At a glance</Text>
          <View className="mb-4 flex-row"><View className="mr-2 flex-1 rounded-xl bg-gray-50 p-3"><Text className="text-xs text-gray-500">All-time smokes</Text><Text className="mt-1 text-lg font-bold text-gray-900">{totalLogged}</Text></View><View className="ml-2 flex-1 rounded-xl bg-gray-50 p-3"><Text className="text-xs text-gray-500">Tracked spend</Text><Text className="mt-1 text-lg font-bold text-gray-900">{allTimeSpend > 0 ? formatMoney(allTimeSpend) : "—"}</Text></View></View>
          <View className="mb-4 flex-row"><View className="mr-2 flex-1 rounded-xl bg-gray-50 p-3"><Text className="text-xs text-gray-500">Longest streak</Text><Text className="mt-1 text-lg font-bold text-gray-900">{highlights.longestStreak}</Text><Text className="text-xs text-gray-500">days</Text></View><View className="ml-2 flex-1 rounded-xl bg-gray-50 p-3"><Text className="text-xs text-gray-500">Best day</Text><Text className="mt-1 text-sm font-bold text-gray-900">{highlights.bestDayAmount > 0 ? `${highlights.bestDayAmount} smokes` : "—"}</Text><Text className="text-xs text-gray-500">{highlights.bestDayAmount > 0 ? formatDayKeyShort(highlights.bestDayKey) : "No logs yet"}</Text></View></View>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Last log</Text>
          <Text className="mb-3 text-sm text-gray-800">{latestEntry ? `${latestEntry.brand} · ${formatTime(latestEntry.timestamp)} · ${qty(latestEntry)} ${qty(latestEntry) === 1 ? "smoke" : "smokes"}` : "—"}</Text>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Latest logs</Text>
          {recentEntries.length === 0 ? (
            <Text className="text-sm text-gray-500">No entries yet. Tap Log smoke to start.</Text>
          ) : (
            recentEntries.map((entry) => (
              <View key={entry.id} className="mb-2 flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-semibold text-gray-900">{entry.brand}</Text>
                  <Text className="text-xs text-gray-500">
                    {formatTime(entry.timestamp)} · {qty(entry)} {qty(entry) === 1 ? "smoke" : "smokes"}
                    {entry.cost != null ? ` · ${formatMoney(entry.cost)}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

