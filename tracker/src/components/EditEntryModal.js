import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatDateTime } from "../utils/date";

export function EditEntryModal({ visible, entry, brands, onClose, onSave }) {
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [costStr, setCostStr] = useState("");
  const [timestamp, setTimestamp] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [trigger, setTrigger] = useState("");
  const triggerOptions = ["stress", "after_meal", "social", "boredom", "work_break", "commute"];

  useEffect(() => {
    if (!visible || !entry) return;
    setBrand(entry.brand || "");
    setQuantity(Math.max(1, Number(entry.quantity) || 1));
    setCostStr(entry.cost != null ? String(entry.cost) : "");
    setTimestamp(Number(entry.timestamp) || Date.now());
    setTrigger(String(entry.trigger || ""));
    setSaving(false);
  }, [visible, entry]);

  const timestampPreview = useMemo(() => formatDateTime(timestamp), [timestamp]);

  const handleSubmit = async () => {
    if (!entry || saving || !brand.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: entry.id, brand, quantity, cost: costStr, timestamp, trigger });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5">
          <Text className="mb-4 text-xl font-bold text-gray-900">Edit log</Text>
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
          <Text className="mb-1 text-sm font-medium text-gray-600">How many</Text>
          <View className="mb-4 flex-row items-center">
            <Pressable onPress={() => setQuantity((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">-</Text></Pressable>
            <Text className="mx-4 text-lg font-semibold text-gray-900">{quantity}</Text>
            <Pressable onPress={() => setQuantity((p) => p + 1)} className="rounded-lg border border-gray-300 px-4 py-2"><Text className="text-lg">+</Text></Pressable>
          </View>
          <Text className="mb-1 text-sm font-medium text-gray-600">Cost for this log (rupees)</Text>
          <TextInput value={costStr} onChangeText={setCostStr} placeholder="e.g. 50" keyboardType="decimal-pad" className="mb-4 rounded-xl border border-gray-200 px-3 py-3" />
          <Text className="mb-1 text-sm font-medium text-gray-600">Time</Text>
          <View className="mb-5 rounded-xl border border-gray-200 px-3 py-3">
            <Text className="text-gray-700">{timestampPreview}</Text>
            <Pressable onPress={() => setTimestamp(Date.now())} className="mt-2 self-start">
              <Text className="text-sm font-semibold text-gray-900">Use current time</Text>
            </Pressable>
          </View>
          <Text className="mb-1 text-sm font-medium text-gray-600">Trigger (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {triggerOptions.map((item) => {
              const active = trigger === item;
              return (
                <Pressable
                  key={item}
                  className={`mr-2 rounded-full border px-3 py-2 ${active ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"}`}
                  onPress={() => setTrigger((prev) => (prev === item ? "" : item))}
                >
                  <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                    {item.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="flex-row gap-3">
            <Pressable className="flex-1 rounded-xl bg-gray-100 py-3" onPress={onClose} disabled={saving}><Text className="text-center font-semibold text-gray-700">Cancel</Text></Pressable>
            <Pressable className={`flex-1 rounded-xl py-3 ${saving ? "bg-gray-700" : "bg-gray-900"}`} onPress={handleSubmit} disabled={saving}><Text className="text-center font-semibold text-white">{saving ? "Saving..." : "Save changes"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
