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
import { getDayKey } from "../utils/date";
import { formatMoney } from "../utils/money";

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function HistoryScreen({ entries, brands, onDeleteEntry, onUpdateEntry }) {
  const [tab, setTab] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [editTargetEntry, setEditTargetEntry] = useState(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState(null);

  const normalized = searchQuery.trim().toLowerCase();
  const matchesBrandSearch = (entry) =>
    !normalized || String(entry.brand || "").toLowerCase().includes(normalized);
  const filteredEntries = useMemo(() => entries.filter(matchesBrandSearch), [entries, normalized]);

  const todayEntries = useMemo(
    () => filteredEntries.filter((e) => getDayKey(e.timestamp) === getDayKey(Date.now())),
    [filteredEntries]
  );

  const monthEntriesForCalendar = useMemo(
    () =>
      filteredEntries.filter((e) => {
        const d = new Date(e.timestamp);
        return (
          d.getFullYear() === monthCursor.year &&
          d.getMonth() === monthCursor.month
        );
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
  const rangeEntries = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const s = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const e = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return monthEntriesForCalendar.filter((item) => {
      const k = getDayKey(item.timestamp);
      return k >= s && k <= e;
    });
  }, [monthEntriesForCalendar, rangeStart, rangeEnd]);

  const totalRangeSmokes = rangeEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  const totalRangeSpend = rangeEntries.reduce(
    (sum, e) => sum + (Number.isFinite(Number(e.cost)) ? Number(e.cost) : 0),
    0
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <View className="flex-1 px-5 pb-5 pt-2">
        <ScreenHeader title="History" icon="time-outline" />
        <FilterTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: "Today", value: "today" },
            { label: "Month", value: "month" },
          ]}
        />
        <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm">
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search brand" className="flex-1 py-2.5 text-sm text-gray-800" />
          {searchQuery ? <Pressable onPress={() => setSearchQuery("")}><Text className="text-xs font-semibold text-gray-500">Clear</Text></Pressable> : null}
        </View>

        {tab === "today" ? (
          <FlatList
            data={todayEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EntryCard
                entry={item}
                onEdit={(entry) => setEditTargetEntry(entry)}
                onDelete={(id) => setPendingDeleteEntry(todayEntries.find((e) => e.id === id))}
              />
            )}
            ListEmptyComponent={
              <View className="mt-12 items-center px-4">
                <Ionicons name="document-text-outline" size={24} color="#9ca3af" />
                <Text className="mt-3 text-center text-base font-medium text-gray-600">{normalized ? "No logs match this brand search" : "No logs today yet"}</Text>
              </View>
            }
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
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
              <Text className="font-semibold text-gray-900">
                {monthLabel(monthCursor.year, monthCursor.month)}
              </Text>
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
                if (!rangeStart || (rangeStart && rangeEnd)) {
                  setRangeStart(dayKey);
                  setRangeEnd(null);
                } else {
                  setRangeEnd(dayKey);
                }
              }}
            />
            <View className="mt-3 rounded-xl bg-white p-4 shadow-sm">
              <View className="mb-1 flex-row items-center">
                <Ionicons name="stats-chart-outline" size={14} color="#6b7280" />
                <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Selected range
                </Text>
              </View>
              <Text className="mt-1 text-sm text-gray-800">
                {rangeStart && rangeEnd
                  ? `${rangeStart} → ${rangeEnd}`
                  : "Tap two days to compare a range"}
              </Text>
              <Text className="mt-2 text-sm text-gray-700">
                {totalRangeSmokes} smokes · {formatMoney(totalRangeSpend)}
              </Text>
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
                <Text className="mt-4 text-center text-sm text-gray-500">
                  No logs on selected day
                </Text>
              ) : null}
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
              ? `Remove ${pendingDeleteEntry.brand} (${pendingDeleteEntry.quantity}) from history?`
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

