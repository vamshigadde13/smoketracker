import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { MessageModal } from "../components/MessageModal";

export function PresetsScreen({ presets, onCreatePreset, onUpdatePreset, onDeletePreset }) {
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [costPerSmokeStr, setCostPerSmokeStr] = useState("");
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [pendingDeletePreset, setPendingDeletePreset] = useState(null);

  const resetForm = () => {
    setBrand(""); setQuantity(1); setCostPerSmokeStr(""); setEditingPresetId(null);
  };
  const handleSubmitPreset = async () => {
    if (!brand.trim()) return;
    const payload = { brand, quantity, costPerSmoke: costPerSmokeStr };
    if (editingPresetId) await onUpdatePreset({ id: editingPresetId, ...payload });
    else await onCreatePreset(payload);
    resetForm();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <View className="flex-1 p-5">
        <ScreenHeader title="Presets" icon="bookmark-outline" />
        <View className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="flash-outline" size={14} color="#6b7280" />
            <Text className="ml-1 text-sm font-semibold text-gray-500">{editingPresetId ? "Edit preset" : "New preset"}</Text>
          </View>
          <Text className="mb-1 text-sm font-medium text-gray-600">Brand</Text>
          <TextInput value={brand} onChangeText={setBrand} placeholder="Brand name" className="mb-3 rounded-xl border border-gray-200 px-3 py-3" />
          <Text className="mb-1 text-sm font-medium text-gray-600">How many</Text>
          <View className="mb-3 flex-row items-center"><Pressable onPress={() => setQuantity((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">-</Text></Pressable><Text className="mx-4 text-lg font-semibold text-gray-900">{quantity}</Text><Pressable onPress={() => setQuantity((p) => p + 1)} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">+</Text></Pressable></View>
          <Text className="mb-1 text-sm font-medium text-gray-600">Cost per smoke (optional)</Text>
          <TextInput value={costPerSmokeStr} onChangeText={setCostPerSmokeStr} placeholder="e.g. 20" keyboardType="decimal-pad" className="mb-3 rounded-xl border border-gray-200 px-3 py-3" />
          <Pressable className="rounded-xl bg-gray-900 py-3 active:bg-gray-800" onPress={handleSubmitPreset}><Text className="text-center font-semibold text-white">{editingPresetId ? "Update preset" : "Save preset"}</Text></Pressable>
        </View>
        <FlatList
          data={presets}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View className="mb-2 rounded-xl bg-white px-4 py-3 shadow-sm">
              <Text className="text-sm font-semibold text-gray-900">{item.brand}</Text>
              <Text className="text-xs text-gray-500">{item.quantity} {item.quantity === 1 ? "smoke" : "smokes"} {item.costPerSmoke != null ? `· ₹${item.costPerSmoke}` : ""}</Text>
              <View className="mt-2 flex-row">
                <Pressable onPress={() => { setEditingPresetId(item.id); setBrand(item.brand); setQuantity(item.quantity); setCostPerSmokeStr(item.costPerSmoke != null ? String(item.costPerSmoke) : ""); }} className="mr-2 rounded-lg bg-gray-100 px-3 py-2"><Text className="text-sm font-semibold text-gray-700">Edit</Text></Pressable>
                <Pressable onPress={() => setPendingDeletePreset(item)} className="rounded-lg bg-red-50 px-3 py-2"><Text className="text-sm font-semibold text-red-700">Delete</Text></Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text className="mt-6 text-center text-sm text-gray-500">No presets yet.</Text>}
        />
      </View>
      <MessageModal
        visible={Boolean(pendingDeletePreset)}
        title="Delete preset?"
        message={pendingDeletePreset ? `Remove preset "${pendingDeletePreset.brand}"?` : ""}
        cancelText="Cancel"
        confirmText="Delete"
        destructive
        onClose={() => setPendingDeletePreset(null)}
        onConfirm={async () => {
          if (pendingDeletePreset) await onDeletePreset(pendingDeletePreset.id);
          setPendingDeletePreset(null);
        }}
      />
    </SafeAreaView>
  );
}
