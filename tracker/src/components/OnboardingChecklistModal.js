import { Modal, Pressable, ScrollView, Text, View } from "react-native";

export function OnboardingChecklistModal({
  visible,
  onClose,
  onboarding,
  notificationSettings,
  goalSettings,
  presetCount,
  onUpdateOnboarding,
}) {
  const checklist = [
    { key: "completedPreset", label: "Create your first preset", done: Number(presetCount || 0) > 0 || onboarding?.completedPreset },
    {
      key: "completedReminders",
      label: "Enable at least one reminder",
      done:
        Boolean(notificationSettings?.enabledDailyCheckin || notificationSettings?.enabledNoLogNudge) ||
        onboarding?.completedReminders,
    },
    {
      key: "completedQuietHours",
      label: "Set quiet hours",
      done: Boolean(notificationSettings?.quietHoursEnabled) || onboarding?.completedQuietHours,
    },
    {
      key: "completedGoal",
      label: "Set your first goal",
      done: Number(goalSettings?.dailyLimit || 0) > 0 || Number(goalSettings?.weeklyLimit || 0) > 0 || onboarding?.completedGoal,
    },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);
  const nextTask = checklist.find((item) => !item.done);
  const weekTips = [
    "Log immediately after each smoke to avoid missing data.",
    "Use presets for your common brand to reduce logging time.",
    "Review your trend every evening and adjust tomorrow's goal.",
  ];

  return (
    <Modal visible={Boolean(visible)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="max-h-[86%] w-full rounded-2xl bg-white p-5">
          <Text className="text-xl font-bold text-gray-900">Week 1 setup guide</Text>
          <Text className="mt-1 text-sm text-gray-600">Build your baseline with a few quick steps.</Text>
          <View className="mt-3 rounded-xl bg-gray-50 p-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500">Progress</Text>
              <Text className="text-xs font-semibold text-gray-700">{completedCount}/{checklist.length}</Text>
            </View>
            <View className="h-2 rounded-full bg-gray-200">
              <View className="h-2 rounded-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
            </View>
            <Text className="mt-1 text-xs text-gray-600">
              {nextTask ? `Next focus: ${nextTask.label}` : "Excellent start. Setup complete."}
            </Text>
          </View>
          <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
            {checklist.map((item) => (
              <Pressable
                key={item.key}
                className={`mb-2 rounded-xl border px-3 py-3 ${item.done ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}
                onPress={() => onUpdateOnboarding?.({ [item.key]: true })}
              >
                <Text className={`font-semibold ${item.done ? "text-emerald-700" : "text-gray-800"}`}>
                  {item.done ? "Done - " : "Mark done - "}{item.label}
                </Text>
                <Text className={`mt-0.5 text-xs ${item.done ? "text-emerald-700" : "text-gray-500"}`}>
                  {item.done ? "Auto-detected or confirmed." : "Complete this in Profile or Home, then tap here."}
                </Text>
              </Pressable>
            ))}

            <View className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                First-week guidance
              </Text>
              {weekTips.map((tip) => (
                <Text key={tip} className="mb-1 text-xs text-indigo-900">
                  - {tip}
                </Text>
              ))}
            </View>
          </ScrollView>
          <View className="mt-3 flex-row gap-2">
            <Pressable className="flex-1 rounded-xl border border-gray-300 bg-white py-3" onPress={onClose}>
              <Text className="text-center font-semibold text-gray-700">Not now</Text>
            </Pressable>
            <Pressable className="flex-1 rounded-xl bg-gray-900 py-3" onPress={onClose}>
              <Text className="text-center font-semibold text-white">
                {completedCount === checklist.length ? "Finish setup" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
