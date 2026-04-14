import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatDateTime } from "../utils/date";
import { normalizeCost } from "../utils/money";

export function AddEntryModal({ visible, onClose, onSave, brands, presets, onOpenPresets }) {
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [costStr, setCostStr] = useState("");
  const [presetUnitPrice, setPresetUnitPrice] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setBrand("");
    setQuantity(1);
    setTimestamp(Date.now());
    setCostStr("");
    setPresetUnitPrice(null);
  }, [visible]);
  useEffect(() => {
    if (presetUnitPrice == null) return;
    setCostStr((presetUnitPrice * quantity).toFixed(2));
  }, [quantity, presetUnitPrice]);
  const timestampPreview = useMemo(() => formatDateTime(timestamp), [timestamp]);

  const handleSave = async () => {
    if (!brand.trim()) return;
    await onSave({ brand, quantity, timestamp, cost: costStr });
  };

  const applyPreset = (item) => {
    setBrand(item.brand || item.name);
    setQuantity(item.quantity);
    const u = normalizeCost(item.costPerSmoke);
    if (u !== undefined) setPresetUnitPrice(u);
    else {
      setPresetUnitPrice(null);
      setCostStr("");
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5">
          <Text className="mb-4 text-xl font-bold text-gray-900">Log a smoke</Text>
          <Text className="mb-1 text-sm font-medium text-gray-600">Brand</Text>
          <TextInput value={brand} onChangeText={setBrand} placeholder="Brand name" className="mb-2 rounded-xl border border-gray-200 px-3 py-3" />
          {brands?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {brands.map((item) => (
                <Pressable key={item.id || item.name || item} className="mr-2 rounded-full bg-gray-100 px-3 py-2" onPress={() => setBrand(item.name || item)}>
                  <Text className="text-sm text-gray-700">{item.name || item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {presets?.length ? (
            <>
              <Text className="mb-1 text-sm font-medium text-gray-600">Your presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {presets.map((item) => (
                  <Pressable key={item.id} className="mr-2 rounded-full bg-gray-900 px-3 py-2" onPress={() => applyPreset(item)}>
                    <Text className="text-sm text-white">{item.brand} ({item.quantity})</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
          <Pressable className="mb-4 self-start rounded-lg bg-gray-100 px-3 py-2" onPress={onOpenPresets}>
            <Text className="text-sm font-semibold text-gray-700">Edit presets</Text>
          </Pressable>
          <Text className="mb-1 text-sm font-medium text-gray-600">How many</Text>
          <View className="mb-4 flex-row items-center">
            <Pressable onPress={() => setQuantity((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">-</Text></Pressable>
            <Text className="mx-4 text-lg font-semibold text-gray-900">{quantity}</Text>
            <Pressable onPress={() => setQuantity((p) => p + 1)} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">+</Text></Pressable>
          </View>
          <Text className="mb-1 text-sm font-medium text-gray-600">Cost for this log (rupees, optional)</Text>
          <TextInput value={costStr} onChangeText={(t) => { setPresetUnitPrice(null); setCostStr(t); }} placeholder="e.g. 50" keyboardType="decimal-pad" className="mb-4 rounded-xl border border-gray-200 px-3 py-3" />
          <Text className="mb-1 text-sm font-medium text-gray-600">Time</Text>
          <View className="mb-5 rounded-xl border border-gray-200 px-3 py-3">
            <Text className="text-gray-700">{timestampPreview}</Text>
            <Pressable onPress={() => setTimestamp(Date.now())} className="mt-2 self-start"><Text className="text-sm font-semibold text-gray-900">Use current time</Text></Pressable>
          </View>
          <View className="flex-row gap-3">
            <Pressable className="flex-1 rounded-xl bg-gray-100 py-3" onPress={onClose}><Text className="text-center font-semibold text-gray-700">Cancel</Text></Pressable>
            <Pressable className="flex-1 rounded-xl bg-gray-900 py-3" onPress={handleSave}><Text className="text-center font-semibold text-white">Save log</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

