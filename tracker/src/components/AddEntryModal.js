import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatDateTime } from "../utils/date";
import { normalizeCost } from "../utils/money";

export function AddEntryModal({ visible, onClose, onSave, brands, presets, onOpenPresets, circles = [], friends = [] }) {
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [costStr, setCostStr] = useState("");
  const [presetUnitPrice, setPresetUnitPrice] = useState(null);
  const [shareToCircle, setShareToCircle] = useState(Boolean(circles?.length || friends?.length));
  const [selectedCircleIds, setSelectedCircleIds] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBrand("");
    setQuantity(1);
    setTimestamp(Date.now());
    setCostStr("");
    setPresetUnitPrice(null);
    const hasTargets = Boolean(circles?.length || friends?.length);
    setShareToCircle(hasTargets);
    setSelectedCircleIds(circles?.[0]?.id ? [String(circles[0].id)] : []);
    setSelectedFriendIds(friends?.[0]?.friend?.id ? [String(friends[0].friend.id)] : []);
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    if (!shareToCircle) return;
    if (!circles?.length && !friends?.length) {
      setShareToCircle(false);
      setSelectedCircleIds([]);
      setSelectedFriendIds([]);
      return;
    }
    setSelectedCircleIds((prev) => prev.filter((id) => circles.some((circle) => circle.id === id)));
    setSelectedFriendIds((prev) => prev.filter((id) => friends.some((f) => f?.friend?.id === id)));
    if (!selectedCircleIds.length && !selectedFriendIds.length) {
      if (circles[0]?.id) setSelectedCircleIds([String(circles[0].id)]);
      else if (friends[0]?.friend?.id) setSelectedFriendIds([String(friends[0].friend.id)]);
    }
  }, [visible, shareToCircle, circles, friends, selectedCircleIds.length, selectedFriendIds.length]);
  useEffect(() => {
    if (presetUnitPrice == null) return;
    setCostStr((presetUnitPrice * quantity).toFixed(2));
  }, [quantity, presetUnitPrice]);
  const timestampPreview = useMemo(() => formatDateTime(timestamp), [timestamp]);

  const handleSave = async () => {
    if (saving) return;
    if (!brand.trim()) return;
    const selectedCircleId = selectedCircleIds[0] || "";
    if (shareToCircle && !selectedCircleIds.length && !selectedFriendIds.length) return;
    try {
      setSaving(true);
      await onSave({
        brand,
        quantity,
        timestamp,
        cost: costStr,
        shareToCircle,
        shareCircleIds: selectedCircleIds,
        shareFriendIds: selectedFriendIds,
        ...(shareToCircle && selectedCircleId ? { circleId: selectedCircleId } : {}),
      });
    } finally {
      setSaving(false);
    }
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
  const toggleCircle = (circleId) => {
    const id = String(circleId || "");
    if (!id) return;
    setSelectedCircleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
  const toggleFriend = (friendId) => {
    const id = String(friendId || "");
    if (!id) return;
    setSelectedFriendIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5">
          <ScrollView showsVerticalScrollIndicator={false}>
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
            <Text className="mb-1 text-sm font-medium text-gray-600">Your presets</Text>
            {presets?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {presets.map((item) => (
                  <Pressable key={item.id} className="mr-2 rounded-full bg-gray-900 px-3 py-2" onPress={() => applyPreset(item)}>
                    <Text className="text-sm text-white">{item.brand} ({item.quantity})</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text className="mb-4 text-sm text-gray-500">No presets yet</Text>
            )}
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
            <View className="mb-5 rounded-xl border border-gray-200 px-3 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">Share with circles & friends 👥</Text>
              <Pressable
                className={`rounded-full px-3 py-1.5 ${shareToCircle ? "bg-emerald-600" : "bg-gray-300"}`}
                onPress={() => setShareToCircle((prev) => !prev)}
              >
                <Text className={`text-xs font-semibold ${shareToCircle ? "text-white" : "text-gray-700"}`}>
                  {shareToCircle ? "On" : "Off"}
                </Text>
              </Pressable>
            </View>
            {shareToCircle ? (
              <>
                <Text className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Circles</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {circles?.length ? (
                    circles.map((circle) => {
                      const active = selectedCircleIds.includes(circle.id);
                      return (
                        <Pressable
                          key={circle.id}
                          onPress={() => toggleCircle(circle.id)}
                          className={`mr-2 rounded-full border px-3 py-2 ${active ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"}`}
                        >
                          <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                            {circle.name}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text className="text-sm text-gray-500">No circles available</Text>
                  )}
                </ScrollView>
                <Text className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Friends</Text>
                {friends?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {friends.map((item) => {
                      const friend = item.friend || {};
                      const active = selectedFriendIds.includes(friend?.id);
                      return (
                        <Pressable
                          key={item.id || friend.id}
                          onPress={() => toggleFriend(friend?.id)}
                          className={`mr-2 rounded-full border px-3 py-2 ${active ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"}`}
                        >
                          <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                            {friend.displayName || friend.username}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text className="text-sm text-gray-500">No friends yet</Text>
                )}
              </>
            ) : null}
            </View>
            <View className="mb-2 flex-row gap-3">
              <Pressable className="flex-1 rounded-xl bg-gray-100 py-3" onPress={onClose} disabled={saving}><Text className="text-center font-semibold text-gray-700">Cancel</Text></Pressable>
              <Pressable className="flex-1 rounded-xl bg-gray-900 py-3" onPress={handleSave} disabled={saving}><Text className="text-center font-semibold text-white">{saving ? "Saving..." : "Save log"}</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}