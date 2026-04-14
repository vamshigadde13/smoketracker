import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function ScreenHeader({ title, subtitle = "Smoke Tracker", icon }) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-2xl font-bold text-gray-900">{title}</Text>
        {subtitle ? <Text className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">{subtitle}</Text> : null}
      </View>
      {icon ? (
        <View className="rounded-2xl bg-gray-900 p-3">
          <Ionicons name={icon} size={26} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
