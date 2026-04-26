import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { FilterTabs } from "../components/FilterTabs";
import { EntryCard } from "../components/EntryCard";
import { MonthCalendar } from "../components/MonthCalendar";
import { EditEntryModal } from "../components/EditEntryModal";
import { MessageModal } from "../components/MessageModal";
import { getDayKey, isToday, isYesterday } from "../utils/date";
import { formatMoney } from "../utils/money";
import {
  getAnalyticsSummary,
  getBrandCostInsights,
  getTriggerInsights,
} from "../services/analytics";

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function JournalScreen({ entries, brands, onDeleteEntry, onUpdateEntry }) {
  const [segment, setSegment] = useState("logs");

  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [isRangeSelectionMode, setIsRangeSelectionMode] = useState(false);
  const [editTargetEntry, setEditTargetEntry] = useState(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState(null);

  const [insightsSearchQuery, setInsightsSearchQuery] = useState("");
  const [insightsFilter, setInsightsFilter] = useState("all");

  const filteredEntries = entries;
  const monthEntriesForCalendar = useMemo(
    () =>
      filteredEntries.filter((e) => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month;
      }),
    [filteredEntries, monthCursor]
  );
  const quantityByDay = useMemo(() => {
    const map = new Map();
    monthEntriesForCalendar.forEach((e) => {
      const k = getDayKey(e.timestamp);
      map.set(k, (map.get(k) || 0) + (Number(e.quantity) || 0));
    });
    return map;
  }, [monthEntriesForCalendar]);
  const selectedDayEntries = useMemo(
    () =>
      selectedDayKey
        ? monthEntriesForCalendar.filter((e) => getDayKey(e.timestamp) === selectedDayKey)
        : [],
    [monthEntriesForCalendar, selectedDayKey]
  );
  const logsRangeEntries = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const s = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const e = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return monthEntriesForCalendar.filter((item) => {
      const k = getDayKey(item.timestamp);
      return k >= s && k <= e;
    });
  }, [monthEntriesForCalendar, rangeStart, rangeEnd]);
  const totalLogsRangeSmokes = logsRangeEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  const totalLogsRangeSpend = logsRangeEntries.reduce(
    (sum, e) => sum + (Number.isFinite(Number(e.cost)) ? Number(e.cost) : 0),
    0
  );
  const normalizedRangeStart = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd) : null;
  const normalizedRangeEnd = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart) : null;
  const hasRangeSelection = Boolean(rangeStart || rangeEnd);
  const hasCompletedRange = Boolean(normalizedRangeStart && normalizedRangeEnd);
  const rangeSelectionLabel = !isRangeSelectionMode
    ? hasCompletedRange
      ? "Edit range"
      : "Pick date range"
    : !rangeStart
      ? "Pick start date"
      : rangeEnd
        ? "Range selected"
        : "Pick end date";
  const rangeDayCount =
    normalizedRangeStart && normalizedRangeEnd
      ? Math.floor((new Date(`${normalizedRangeEnd}T00:00:00`).getTime() - new Date(`${normalizedRangeStart}T00:00:00`).getTime()) / 86400000) + 1
      : 0;
  const rangeBrandMap = logsRangeEntries.reduce((map, entry) => {
    const key = String(entry.brand || "Unknown");
    map.set(key, (map.get(key) || 0) + (Number(entry.quantity) || 0));
    return map;
  }, new Map());
  const topRangeBrand =
    Array.from(rangeBrandMap.entries()).sort((a, b) => b[1] - a[1])[0] || null;
  const avgSmokesPerDay = rangeDayCount > 0 ? totalLogsRangeSmokes / rangeDayCount : 0;

  const normalizedInsightsSearch = insightsSearchQuery.trim().toLowerCase();
  const insightsRangeEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const brandMatch =
          !normalizedInsightsSearch ||
          String(entry.brand || "").toLowerCase().includes(normalizedInsightsSearch);
        const hasCost = Number.isFinite(Number(entry.cost)) && Number(entry.cost) > 0;
        const costMatch =
          insightsFilter === "all" ? true : insightsFilter === "cost_only" ? hasCost : !hasCost;
        return brandMatch && costMatch;
      }),
    [entries, normalizedInsightsSearch, insightsFilter]
  );
  const todayInsightEntries = useMemo(() => entries.filter((entry) => isToday(entry.timestamp)), [entries]);
  const yesterdayInsightEntries = useMemo(
    () => entries.filter((entry) => isYesterday(entry.timestamp)),
    [entries]
  );
  const todaySmokes = todayInsightEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const todayLogs = todayInsightEntries.length;
  const todaySpend = todayInsightEntries.reduce((sum, entry) => sum + (Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : 0), 0);
  const yesterdaySmokes = yesterdayInsightEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const delta = todaySmokes - yesterdaySmokes;
  const totalRangeSmokes = insightsRangeEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const totalRangeLogs = insightsRangeEntries.length;
  const totalRangeSpend = insightsRangeEntries.reduce((sum, entry) => sum + (Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : 0), 0);
  const brandCost = useMemo(() => getBrandCostInsights(insightsRangeEntries), [insightsRangeEntries]);
  const summary = getAnalyticsSummary(entries);
  const triggerInsights = useMemo(() => getTriggerInsights(entries), [entries]);
  const rangeLabel = "Overall";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <View className="flex-1 px-5 pb-5 pt-2">
        <ScreenHeader title="Journal" icon="book-outline" />
        <FilterTabs
          value={segment}
          onChange={setSegment}
          tabs={[
            { label: "Logs", value: "logs" },
            { label: "Insights", value: "insights" },
          ]}
        />

        {segment === "logs" ? (
          <>
            <ScrollView showsVerticalScrollIndicator={false}>
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
              <View className="mb-3 flex-row items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
                <Pressable
                  onPress={() =>
                    setMonthCursor((prev) =>
                      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 }
                    )
                  }
                >
                  <Text className="font-semibold text-gray-700">Prev</Text>
                </Pressable>
                <Text className="font-semibold text-gray-900">{monthLabel(monthCursor.year, monthCursor.month)}</Text>
                <Pressable
                  onPress={() =>
                    setMonthCursor((prev) =>
                      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 }
                    )
                  }
                >
                  <Text className="font-semibold text-gray-700">Next</Text>
                </Pressable>
              </View>
              <MonthCalendar
                year={monthCursor.year}
                month={monthCursor.month}
                quantityByDay={quantityByDay}
                selectedDayKey={selectedDayKey}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onSelectDay={(dayKey) => {
                  setSelectedDayKey(dayKey);
                  if (!isRangeSelectionMode) return;
                  if (!rangeStart || rangeEnd) {
                    setRangeStart(dayKey);
                    setRangeEnd(null);
                  } else {
                    setRangeEnd(dayKey);
                    setIsRangeSelectionMode(false);
                  }
                }}
              />
              <View className="mt-3 rounded-xl bg-white p-4 shadow-sm">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="funnel-outline" size={14} color="#6b7280" />
                    <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Range filter
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => {
                        const next = !isRangeSelectionMode;
                        setIsRangeSelectionMode(next);
                      }}
                      className={`rounded-full px-3 py-1 ${isRangeSelectionMode ? "bg-sky-100" : "bg-gray-100"}`}
                    >
                      <Text className={`text-xs font-semibold ${isRangeSelectionMode ? "text-sky-700" : "text-gray-600"}`}>
                        {rangeSelectionLabel}
                      </Text>
                    </Pressable>
                    {hasRangeSelection ? (
                      <Pressable
                        onPress={() => {
                          setRangeStart(null);
                          setRangeEnd(null);
                          setIsRangeSelectionMode(false);
                        }}
                        className="ml-2"
                      >
                        <Text className="text-xs font-semibold text-gray-500">Reset</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {normalizedRangeStart && normalizedRangeEnd ? (
                  <>
                    <Text className="text-sm font-semibold text-gray-900">
                      {normalizedRangeStart} to {normalizedRangeEnd}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      {rangeDayCount} day range
                    </Text>
                    <View className="mt-3 flex-row">
                      <View className="mr-2 flex-1 rounded-lg bg-gray-50 p-3">
                        <Text className="text-[11px] uppercase tracking-wide text-gray-500">Smokes</Text>
                        <Text className="mt-1 text-base font-bold text-gray-900">{totalLogsRangeSmokes}</Text>
                      </View>
                      <View className="mx-1 flex-1 rounded-lg bg-gray-50 p-3">
                        <Text className="text-[11px] uppercase tracking-wide text-gray-500">Logs</Text>
                        <Text className="mt-1 text-base font-bold text-gray-900">{logsRangeEntries.length}</Text>
                      </View>
                      <View className="ml-2 flex-1 rounded-lg bg-gray-50 p-3">
                        <Text className="text-[11px] uppercase tracking-wide text-gray-500">Spend</Text>
                        <Text className="mt-1 text-base font-bold text-gray-900">{formatMoney(totalLogsRangeSpend)}</Text>
                      </View>
                    </View>
                    <View className="mt-2 rounded-lg bg-emerald-50 p-3">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Range insights</Text>
                      <Text className="mt-1 text-sm text-emerald-900">
                        Avg/day: {avgSmokesPerDay.toFixed(1)} smokes
                      </Text>
                      <Text className="mt-1 text-sm text-emerald-900">
                        Top brand: {topRangeBrand ? `${topRangeBrand[0]} (${topRangeBrand[1]})` : "N/A"}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text className="text-sm text-gray-700">
                    {!isRangeSelectionMode
                      ? hasRangeSelection
                        ? "Tap 'Edit range' to continue selecting dates."
                        : "Tap 'Pick date range' to choose start and end dates."
                      : rangeStart
                        ? "Now tap an end date to finish your range."
                        : "Tap a start date on the calendar to begin."}
                  </Text>
                )}
              </View>
              <View className="mt-3">
                {selectedDayEntries.map((item) => (
                  <EntryCard
                    key={item.id}
                    entry={item}
                    onEdit={(entry) => setEditTargetEntry(entry)}
                    onDelete={(id) =>
                      setPendingDeleteEntry(monthEntriesForCalendar.find((e) => e.id === id))
                    }
                  />
                ))}
                {selectedDayKey && selectedDayEntries.length === 0 ? (
                  <Text className="mt-4 text-center text-sm text-gray-500">No logs on selected day</Text>
                ) : null}
              </View>
            </ScrollView>
          </>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm">
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput
                value={insightsSearchQuery}
                onChangeText={setInsightsSearchQuery}
                placeholder="Search brand in insights"
                className="flex-1 py-2.5 text-sm text-gray-800"
              />
              {insightsSearchQuery ? (
                <Pressable onPress={() => setInsightsSearchQuery("")}>
                  <Text className="text-xs font-semibold text-gray-500">Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="mb-4 rounded-2xl bg-white p-2 shadow-sm">
              <FilterTabs
                value={insightsFilter}
                onChange={setInsightsFilter}
                tabs={[
                  { label: "All", value: "all" },
                  { label: "Cost only", value: "cost_only" },
                  { label: "No cost", value: "no_cost" },
                ]}
              />
            </View>

            <View className="rounded-2xl bg-white p-4 shadow-sm">
              <View className="mb-3 flex-row items-center">
                <View className="rounded-lg bg-emerald-50 p-2">
                  <Ionicons name="wallet-outline" size={16} color="#047857" />
                </View>
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cost intelligence</Text>
                  <Text className="text-sm text-gray-700">Overall spend patterns and cost efficiency.</Text>
                </View>
              </View>
              <Text className="mb-3 text-xs text-gray-500">INR · includes logs with a cost only.</Text>
              <View className="mb-3 flex-row">
                <View className="mr-2 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <Text className="text-[11px] uppercase tracking-wide text-gray-500">Today</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">{formatMoney(todaySpend)}</Text>
                </View>
                <View className="mx-1 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <Text className="text-[11px] uppercase tracking-wide text-gray-500">{rangeLabel}</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">{formatMoney(totalRangeSpend)}</Text>
                </View>
                <View className="ml-2 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <Text className="text-[11px] uppercase tracking-wide text-gray-500">All-time</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">{formatMoney(summary.allTimeSpend)}</Text>
                </View>
              </View>
              <View className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Efficiency</Text>
                <Text className="mt-1 text-sm font-semibold text-emerald-900">
                  Avg cost per smoke ({rangeLabel}): {formatMoney(brandCost.avgCostPerSmokeOverall)}
                </Text>
                <Text className="mt-1 text-xs text-emerald-800">
                  Cost-bearing logs in range: {brandCost.costEntryCount}
                </Text>
              </View>
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
            <View className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="sparkles-outline" size={14} color="#6b7280" />
                <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Trigger insights
                </Text>
              </View>
              <Text className="mb-2 text-xs text-gray-500">
                Tagged logs: {triggerInsights.totalTaggedLogs}
              </Text>
              {triggerInsights.top.length ? (
                triggerInsights.top.map((item) => (
                  <View key={item.trigger} className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-gray-800">
                        {item.trigger.replace("_", " ")}
                      </Text>
                      <Text className="text-xs font-semibold text-gray-600">{item.smokes} smokes</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-sm text-gray-500">No trigger tags yet.</Text>
              )}
            </View>
          </ScrollView>
        )}

        <EditEntryModal
          visible={Boolean(editTargetEntry)}
          entry={editTargetEntry}
          brands={brands}
          onClose={() => setEditTargetEntry(null)}
          onSave={async (payload) => {
            await onUpdateEntry?.(payload);
            setEditTargetEntry(null);
          }}
        />
        <MessageModal
          visible={Boolean(pendingDeleteEntry)}
          title="Delete log?"
          message={
            pendingDeleteEntry
              ? `Remove ${pendingDeleteEntry.brand} (${pendingDeleteEntry.quantity}) from journal?`
              : ""
          }
          cancelText="Cancel"
          confirmText="Delete"
          destructive
          onClose={() => setPendingDeleteEntry(null)}
          onConfirm={async () => {
            if (pendingDeleteEntry) await onDeleteEntry?.(pendingDeleteEntry.id);
            setPendingDeleteEntry(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
