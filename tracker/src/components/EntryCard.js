import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateTime } from "../utils/date";
import { formatMoney } from "../utils/money";

export function EntryCard({ entry, onEdit, onDelete }) {
  return (
    <View className="mb-2 rounded-xl border border-gray-100 bg-white p-4">
      <Text className="text-base font-semibold text-gray-900">{entry.brand}</Text>
      <Text className="mt-0.5 text-sm text-gray-600">
        {formatDateTime(entry.timestamp)} · {entry.quantity} {entry.quantity === 1 ? "smoke" : "smokes"}
      </Text>
      <Text className="mt-1 text-xs text-gray-500">
        Cost: {entry.cost != null ? formatMoney(entry.cost) : "—"}
      </Text>
      <View className="mt-3 flex-row">
        <Pressable onPress={() => onEdit?.(entry)} className="mr-2 flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Ionicons name="create-outline" size={14} color="#374151" />
          <Text className="ml-1 text-xs font-semibold text-gray-700">Edit log</Text>
        </Pressable>
        <Pressable onPress={() => onDelete?.(entry.id)} className="flex-row items-center rounded-lg bg-red-50 px-3 py-2">
          <Ionicons name="trash-outline" size={14} color="#b91c1c" />
          <Text className="ml-1 text-xs font-semibold text-red-700">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
