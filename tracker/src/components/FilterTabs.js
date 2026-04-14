import { Pressable, Text, View } from "react-native";

export function FilterTabs({ value, onChange, tabs }) {
  return (
    <View className="mb-3 flex-row rounded-xl bg-gray-100 p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            className={`flex-1 rounded-lg py-2 ${active ? "bg-white" : ""}`}
          >
            <Text className={`text-center text-sm font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
