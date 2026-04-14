import { Pressable, Text, View } from "react-native";

const getMonthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
};
const dayKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getHeatClasses = (total) => {
  if (total >= 15) return "border-rose-300 bg-rose-200";
  if (total >= 10) return "border-orange-300 bg-orange-200";
  if (total >= 6) return "border-amber-300 bg-amber-200";
  if (total >= 3) return "border-lime-300 bg-lime-200";
  if (total >= 1) return "border-emerald-200 bg-emerald-100";
  return "border-gray-100 bg-gray-50";
};

export function MonthCalendar({ year, month, quantityByDay, selectedDayKey, rangeStart, rangeEnd, onSelectDay }) {
  const cells = getMonthGrid(year, month);
  const inRange = (key) => rangeStart && rangeEnd && key >= rangeStart && key <= rangeEnd;
  const now = new Date();
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  return (
    <View className="rounded-2xl bg-white p-4">
      <View className="mb-2 flex-row justify-between">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
          <Text key={`${d}-${idx}`} className="w-[14.2%] text-center text-xs font-semibold text-gray-400">{d}</Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((d, idx) => {
          if (!d) return <View key={`empty-${idx}`} className="w-[14.2%] p-1" />;
          const k = dayKey(year, month, d);
          const total = quantityByDay.get(k) || 0;
          const active = selectedDayKey === k;
          const ranged = inRange(k);
          const isToday = k === todayKey;
          const heat = getHeatClasses(total);
          return (
            <View key={k} className="w-[14.2%] p-1">
              <Pressable
                onPress={() => onSelectDay(k)}
                className={`min-h-[44px] items-center justify-center rounded-lg border ${
                  active
                    ? "border-gray-900 bg-gray-900"
                    : ranged
                      ? "border-sky-300 bg-sky-100"
                      : heat
                } ${isToday && !active ? "border-2 border-sky-600" : ""}`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-800"}`}>{d}</Text>
                {total > 0 ? (
                  <Text className={`text-[10px] ${active ? "text-gray-200" : "text-gray-500"}`}>{total}</Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
      <View className="mt-3 flex-row flex-wrap items-center">
        <Text className="mr-2 text-[10px] font-semibold text-gray-500">Intensity:</Text>
        <View className="mr-1 h-2.5 w-2.5 rounded-full bg-emerald-200" />
        <Text className="mr-2 text-[10px] text-gray-500">0-2</Text>
        <View className="mr-1 h-2.5 w-2.5 rounded-full bg-lime-300" />
        <Text className="mr-2 text-[10px] text-gray-500">3-5</Text>
        <View className="mr-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
        <Text className="mr-2 text-[10px] text-gray-500">6-9</Text>
        <View className="mr-1 h-2.5 w-2.5 rounded-full bg-orange-300" />
        <Text className="mr-2 text-[10px] text-gray-500">10-14</Text>
        <View className="mr-1 h-2.5 w-2.5 rounded-full bg-rose-300" />
        <Text className="text-[10px] text-gray-500">15+</Text>
      </View>
    </View>
  );
}
