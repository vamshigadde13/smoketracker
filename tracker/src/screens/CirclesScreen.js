import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/ScreenHeader";

export function CirclesScreen({ circles = [], friends = [], onCreateCircle, onToggleLiveNotifications }) {
  const [name, setName] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const friendOptions = useMemo(() => friends.map((f) => f.friend), [friends]);

  const toggleFriend = (id) =>
    setSelectedFriendIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const handleCreate = async () => {
    const cleanName = String(name || "").trim();
    if (!cleanName || selectedFriendIds.length === 0) return;
    await onCreateCircle?.({ name: cleanName, memberIds: selectedFriendIds });
    setName("");
    setSelectedFriendIds([]);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-5 pt-2" contentContainerStyle={{ paddingBottom: 26 }}>
        <ScreenHeader title="Circles" subtitle="Small private groups" icon="people-circle-outline" />

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-semibold text-gray-700">Create circle</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Circle name"
            className="mb-3 rounded-xl border border-gray-300 px-3 py-3"
          />
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Select friends</Text>
          <View className="mb-3 flex-row flex-wrap">
            {friendOptions.length ? (
              friendOptions.map((friend) => {
                const active = selectedFriendIds.includes(friend.id);
                return (
                  <Pressable
                    key={friend.id}
                    onPress={() => toggleFriend(friend.id)}
                    className={`mb-2 mr-2 rounded-full px-3 py-2 ${active ? "bg-gray-900" : "bg-gray-200"}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                      {friend.displayName || friend.username}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text className="text-sm text-gray-500">Add friends first to create circles.</Text>
            )}
          </View>
          <Pressable className="rounded-xl bg-gray-900 py-3" onPress={handleCreate}>
            <Text className="text-center font-semibold text-white">Create Circle</Text>
          </Pressable>
        </View>

        <View className="rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-semibold text-gray-700">Your circles</Text>
          {circles.length ? (
            circles.map((circle) => (
              <View key={circle.id} className="mb-3 rounded-xl border border-gray-200 p-3">
                <Text className="text-base font-semibold text-gray-900">{circle.name}</Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {circle.members?.length || 0} members
                </Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-gray-700">Live notifications</Text>
                  <Pressable
                    className={`rounded-full px-3 py-1.5 ${
                      circle.settings?.liveNotificationsEnabled ? "bg-emerald-600" : "bg-gray-300"
                    }`}
                    onPress={() =>
                      onToggleLiveNotifications?.({
                        circleId: circle.id,
                        liveNotificationsEnabled: !circle.settings?.liveNotificationsEnabled,
                      })
                    }
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        circle.settings?.liveNotificationsEnabled ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {circle.settings?.liveNotificationsEnabled ? "On" : "Off"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-500">No circles yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
