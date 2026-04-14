import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StreakBadge({ variant, count }) {
  const iconName = variant === "active" || variant === "at_risk" ? "flame" : "flame-outline";
  const flameColor = variant === "active" ? "#fb923c" : variant === "at_risk" ? "#fbbf24" : "#6b7280";
  return (
    <View className="min-w-[76px] flex-row items-center rounded-2xl bg-gray-900 px-3 py-2">
      <Ionicons name={iconName} size={24} color={flameColor} />
      <View className="ml-2">
        <Text className="text-xl font-bold text-white">{count}</Text>
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">streak</Text>
      </View>
    </View>
  );
}
