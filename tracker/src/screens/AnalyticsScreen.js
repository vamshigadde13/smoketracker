import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  getAnalyticsSummary,
  getBrandCostInsights,
  getCoachingInsights,
  getDailyTotalsForRange,
  getEntriesForRange,
} from "../services/analytics";
import { isToday, isYesterday } from "../utils/date";
import { formatMoney } from "../utils/money";

export function AnalyticsScreen({ entries }) {
  const [rangeKey, setRangeKey] = useState("30d");
  const rangeEntries = useMemo(() => getEntriesForRange(entries, rangeKey), [entries, rangeKey]);
  const dailySeries = useMemo(() => getDailyTotalsForRange(entries, rangeKey), [entries, rangeKey]);
  const maxDaily = useMemo(
    () => Math.max(1, ...dailySeries.map((item) => item.total)),
    [dailySeries]
  );
  const todayEntries = useMemo(() => entries.filter((entry) => isToday(entry.timestamp)), [entries]);
  const yesterdayEntries = useMemo(
    () => entries.filter((entry) => isYesterday(entry.timestamp)),
    [entries]
  );
  const todaySmokes = todayEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const todayLogs = todayEntries.length;
  const todaySpend = todayEntries.reduce((sum, entry) => sum + (Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : 0), 0);
  const yesterdaySmokes = yesterdayEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const delta = todaySmokes - yesterdaySmokes;
  const totalRangeSmokes = rangeEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const totalRangeLogs = rangeEntries.length;
  const totalRangeSpend = rangeEntries.reduce((sum, entry) => sum + (Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : 0), 0);
  const brandCost = useMemo(() => getBrandCostInsights(rangeEntries), [rangeEntries]);
  const coaching = useMemo(() => getCoachingInsights(rangeEntries), [rangeEntries]);
  const s = getAnalyticsSummary(entries);

  const rangeLabel =
    rangeKey === "7d" ? "Last 7 days" : rangeKey === "30d" ? "Last 30 days" : rangeKey === "90d" ? "Last 90 days" : "All time";

  if (!entries.length) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
        <View className="px-5 pt-2"><ScreenHeader title="Insights" icon="bar-chart-outline" /></View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-gray-800">No insights yet</Text>
          <Text className="mt-2 text-sm text-gray-500">Add logs from Home first.</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <ScreenHeader title="Insights" icon="bar-chart-outline" />
        <View className="mb-4 rounded-2xl bg-white p-2 shadow-sm">
          <View className="flex-row rounded-xl bg-gray-100 p-1">
            {[
              { key: "7d", label: "7D" },
              { key: "30d", label: "30D" },
              { key: "90d", label: "90D" },
              { key: "all", label: "All" },
            ].map((option) => {
              const active = option.key === rangeKey;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setRangeKey(option.key)}
                  className={`flex-1 rounded-lg py-2 ${active ? "bg-white" : ""}`}
                >
                  <Text className={`text-center text-xs font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-start">
            <View className="mr-3 rounded-xl bg-amber-50 p-2.5">
              <Ionicons name="sunny-outline" size={22} color="#ca8a04" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Today snapshot</Text>
              <Text className="mt-1 text-4xl font-bold text-gray-900">{todaySmokes}</Text>
              <Text className="text-sm text-gray-500">smokes logged</Text>
              <Text className="mt-2 text-sm text-gray-600">
                {todaySmokes === 0 && yesterdaySmokes === 0
                  ? "No logs yet today or yesterday"
                  : delta === 0
                    ? "Same smoke total as yesterday"
                    : `${Math.abs(delta)} smokes ${delta > 0 ? "above" : "below"} yesterday`}
              </Text>
              <View className="mt-2 flex-row">
                <View className="mr-2 rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-gray-700">{todayLogs} logs</Text>
                </View>
                <View className="rounded-full bg-emerald-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-emerald-800">{formatMoney(todaySpend)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="trending-up-outline" size={14} color="#6b7280" />
              <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Trend</Text>
            </View>
            <Text className="text-xs text-gray-500">{rangeLabel}</Text>
          </View>
          <View className="mb-3 flex-row items-end">
            {dailySeries.length ? (
              dailySeries.map((item) => (
                <View key={item.timestamp} className="mr-1 flex-1 items-center">
                  <View
                    className="w-full rounded-md bg-gray-900/85"
                    style={{ height: Math.max(6, Math.round((item.total / maxDaily) * 56)) }}
                  />
                </View>
              ))
            ) : (
              <Text className="text-sm text-gray-500">No trend data for this range yet.</Text>
            )}
          </View>
          <Text className="text-xs text-gray-500">
            {dailySeries.length
              ? `${dailySeries[0].label} - ${dailySeries[dailySeries.length - 1].label}`
              : "No range selected"}
          </Text>
          <Text className="mt-2 text-sm text-gray-700">
            {totalRangeSmokes} smokes · {totalRangeLogs} logs · {formatMoney(totalRangeSpend)}
          </Text>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="ribbon-outline" size={14} color="#6b7280" />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Brand intelligence
            </Text>
          </View>
          <Text className="mb-2 text-xs text-gray-500">{rangeLabel}</Text>
          {brandCost.topBySmokes.length ? (
            brandCost.topBySmokes.map((brand) => (
              <View key={brand.brand} className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-gray-800">{brand.brand}</Text>
                  <Text className="text-xs font-semibold text-gray-600">{brand.smokes} smokes</Text>
                </View>
                <Text className="mt-0.5 text-xs text-gray-500">{brand.logs} logs</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-500">No brand trends yet.</Text>
          )}
        </View>
        <View className="rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="wallet-outline" size={14} color="#6b7280" />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Cost intelligence</Text>
          </View>
          <Text className="mb-2 text-xs text-gray-500">INR · includes logs with a cost only.</Text>
          <Text className="text-sm text-gray-700">Today: {formatMoney(todaySpend)}</Text>
          <Text className="text-sm text-gray-700">{rangeLabel}: {formatMoney(totalRangeSpend)}</Text>
          <Text className="text-sm text-gray-700">All-time: {formatMoney(s.allTimeSpend)}</Text>
          <Text className="mt-2 text-sm text-gray-700">
            Avg cost per smoke ({rangeLabel}): {formatMoney(brandCost.avgCostPerSmokeOverall)}
          </Text>
          <Text className="text-xs text-gray-500">
            Cost-bearing logs in range: {brandCost.costEntryCount}
          </Text>
          {brandCost.topBySpend.length ? (
            <View className="mt-3">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Top spend brands</Text>
              {brandCost.topBySpend.slice(0, 3).map((brand) => (
                <View key={`spend-${brand.brand}`} className="mb-1 flex-row items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <Text className="text-sm text-gray-800">{brand.brand}</Text>
                  <Text className="text-xs font-semibold text-gray-700">{formatMoney(brand.spend)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="bulb-outline" size={14} color="#6b7280" />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Coaching</Text>
          </View>
          {coaching.tips.map((tip, idx) => (
            <View key={`${idx}-${tip}`} className="mb-2 flex-row rounded-lg bg-amber-50 px-3 py-2">
              <Text className="mr-2 text-xs font-bold text-amber-700">{idx + 1}.</Text>
              <Text className="flex-1 text-sm text-amber-900">{tip}</Text>
            </View>
          ))}
          <View className="mt-1 rounded-lg bg-indigo-50 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Suggested goal</Text>
            <Text className="mt-1 text-sm font-medium text-indigo-900">{coaching.goal}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

