import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, Image, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ScreenHeader } from "../components/ScreenHeader";

const buildQrPayload = (uniqueCode) =>
  `app://add-friend?code=${encodeURIComponent(String(uniqueCode || "").trim().toLowerCase())}`;

const parseCodeFromQrPayload = (payload) => {
  const raw = String(payload || "").trim();
  if (!raw) return "";
  const match = raw.match(/code=([^&\s]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).trim();
  }
  return raw;
};

export function FriendsScreen({
  uniqueCode,
  friends = [],
  pending = [],
  circles = [],
  onAddByCode,
  onAccept,
  onReject,
  onCreateCircle,
  onToggleLiveNotifications,
  onRefresh,
}) {
  const [addVisible, setAddVisible] = useState(false);
  const [createCircleVisible, setCreateCircleVisible] = useState(false);
  const [myCodeVisible, setMyCodeVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [circleName, setCircleName] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [scanLocked, setScanLocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [requestActionById, setRequestActionById] = useState({});
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [togglingCircleId, setTogglingCircleId] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [error, setError] = useState("");
  const qrPayload = useMemo(() => buildQrPayload(uniqueCode), [uniqueCode]);
  const qrImageUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}`,
    [qrPayload]
  );

  const submitCode = async (candidate) => {
    if (sendingCode) return;
    const code = String(candidate || "").trim().toLowerCase();
    if (!code) return;
    try {
      setSendingCode(true);
      await onAddByCode?.(code);
      setCodeInput("");
      setError("");
      setAddVisible(false);
      setCameraVisible(false);
      setScanLocked(false);
    } catch (e) {
      setError(e?.message || "Unable to send friend request");
      setScanLocked(false);
    } finally {
      setSendingCode(false);
    }
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result?.granted) {
        setError("Camera permission is required to scan QR code");
        return;
      }
    }
    setError("");
    setScanLocked(false);
    setCameraVisible(true);
  };

  const toggleFriendForCircle = (id) =>
    setSelectedFriendIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const submitCircle = async () => {
    if (creatingCircle) return;
    const cleanName = String(circleName || "").trim();
    if (!cleanName || selectedFriendIds.length === 0) return;
    try {
      setCreatingCircle(true);
      await onCreateCircle?.({ name: cleanName, memberIds: selectedFriendIds });
      setCircleName("");
      setSelectedFriendIds([]);
    } finally {
      setCreatingCircle(false);
    }
  };

  const handleRequestAction = async (requestId, type) => {
    if (requestActionById[requestId]) return;
    try {
      setRequestActionById((prev) => ({ ...prev, [requestId]: type }));
      if (type === "accept") await onAccept?.(requestId);
      if (type === "reject") await onReject?.(requestId);
    } finally {
      setRequestActionById((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }
  };

  const handleToggleCircleNotifications = async (circleId, liveNotificationsEnabled) => {
    if (togglingCircleId) return;
    try {
      setTogglingCircleId(circleId);
      await onToggleLiveNotifications?.({ circleId, liveNotificationsEnabled });
    } finally {
      setTogglingCircleId("");
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: 26 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined}
      >
        <ScreenHeader title="Friends" subtitle="Private and opt-in" icon="people-outline" />
        <View className="mb-4 flex-row gap-2">
          <Pressable className="flex-1 rounded-xl bg-gray-900 py-3" onPress={() => setAddVisible(true)}>
            <Text className="text-center font-semibold text-white">Add Friend</Text>
          </Pressable>
          <Pressable className="flex-1 rounded-xl border border-gray-300 bg-white py-3" onPress={() => setCreateCircleVisible(true)}>
            <Text className="text-center font-semibold text-gray-800">Create Circle</Text>
          </Pressable>
        </View>

        {pending.length ? (
          <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-700">Pending requests</Text>
              <View className="rounded-full bg-gray-200 px-2.5 py-1">
                <Text className="text-xs font-semibold text-gray-700">{pending.length}</Text>
              </View>
            </View>
            {pending.map((request) => (
              <View key={request.id} className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="mr-3 flex-1">
                    <Text className="font-semibold text-gray-900">
                      {request.friend.displayName || request.friend.username}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">{request.friend.uniqueCode}</Text>
                  </View>
                  <View
                    className="rounded-full bg-gray-200 px-2.5 py-1"
                  >
                    <Text
                      className="text-[10px] font-semibold uppercase text-gray-700"
                    >
                      {request.isOutgoing ? "Sent" : "Incoming"}
                    </Text>
                  </View>
                </View>
                {request.isOutgoing ? (
                  <Text className="mt-3 text-xs text-gray-600">
                    Waiting for {request.friend.displayName || request.friend.username} to accept.
                  </Text>
                ) : (
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      className="flex-1 rounded-xl bg-gray-900 py-2.5"
                      onPress={() => handleRequestAction(request.id, "accept")}
                      disabled={Boolean(requestActionById[request.id])}
                    >
                      <Text className="text-center text-xs font-semibold text-white">
                        {requestActionById[request.id] === "accept" ? "Accepting..." : "Accept"}
                      </Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5"
                      onPress={() => handleRequestAction(request.id, "reject")}
                      disabled={Boolean(requestActionById[request.id])}
                    >
                      <Text className="text-center text-xs font-semibold text-gray-700">
                        {requestActionById[request.id] === "reject" ? "Declining..." : "Decline"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <View className="rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-semibold text-gray-700">Network</Text>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Circles</Text>
          {circles.length ? (
            circles.map((circle) => (
              <View key={circle.id} className="mb-2 rounded-xl border border-gray-200 px-3 py-2">
                <Text className="font-semibold text-gray-900">{circle.name}</Text>
                <Text className="text-xs text-gray-500">{circle.members?.length || 0} members</Text>
                <View className="mt-2 self-start rounded-full border border-gray-300 bg-white px-2.5 py-1">
                  <Text className="text-xs font-semibold text-gray-800">
                    🚬 {Number(circle.streak?.currentStreak || 0)} day streak
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-700">Live notifications</Text>
                  <Pressable
                    className={`rounded-full px-3 py-1.5 ${circle.settings?.liveNotificationsEnabled ? "bg-emerald-600" : "bg-gray-300"}`}
                    onPress={() => handleToggleCircleNotifications(circle.id, !circle.settings?.liveNotificationsEnabled)}
                    disabled={Boolean(togglingCircleId)}
                  >
                    <Text className={`text-xs font-semibold ${circle.settings?.liveNotificationsEnabled ? "text-white" : "text-gray-700"}`}>
                      {togglingCircleId === circle.id ? "..." : circle.settings?.liveNotificationsEnabled ? "On" : "Off"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text className="mb-3 text-sm text-gray-500">No circles yet</Text>
          )}
          <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Friends</Text>
          {friends.length ? (
            friends.map((item) => (
              <View key={item.id} className="mb-2 rounded-xl border border-gray-200 px-3 py-2">
                <Text className="font-semibold text-gray-900">{item.friend.displayName || item.friend.username}</Text>
                <Text className="text-xs text-gray-500">{item.friend.uniqueCode}</Text>
                <View className="mt-2 self-start rounded-full border border-gray-300 bg-white px-2.5 py-1">
                  <Text className="text-xs font-semibold text-gray-800">
                    🚬 {Number(item.friend?.streak?.currentStreak || 0)} day streak
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-500">No friends yet</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5">
            <Text className="mb-3 text-lg font-bold text-gray-900">Add friend</Text>
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Enter unique code</Text>
            <TextInput
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="vamshi#7392"
              autoCapitalize="none"
              className="mb-3 rounded-xl border border-gray-300 px-3 py-3"
            />
            <Pressable className="mb-3 rounded-xl bg-gray-900 py-3" onPress={() => submitCode(codeInput)} disabled={sendingCode}>
              <Text className="text-center font-semibold text-white">{sendingCode ? "Sending..." : "Send request"}</Text>
            </Pressable>
            <Pressable className="mb-3 rounded-xl bg-gray-100 py-3" onPress={openScanner}>
              <Text className="text-center font-semibold text-gray-700">Scan QR</Text>
            </Pressable>
            <Pressable className="mb-3 rounded-xl border border-gray-300 py-3" onPress={() => setMyCodeVisible(true)}>
              <Text className="text-center font-semibold text-gray-700">Show My QR</Text>
            </Pressable>
            {error ? <Text className="mb-2 text-sm text-red-600">{error}</Text> : null}
            <Pressable className="rounded-xl bg-gray-200 py-3" onPress={() => setAddVisible(false)}>
              <Text className="text-center font-semibold text-gray-700">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={myCodeVisible} transparent animationType="slide" onRequestClose={() => setMyCodeVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5">
            <Text className="mb-2 text-lg font-bold text-gray-900">My Code</Text>
            <Text className="mb-1 text-sm text-gray-600">Unique code</Text>
            <Text className="mb-3 text-base font-semibold text-gray-900">{uniqueCode || "Not available"}</Text>
            <Image source={{ uri: qrImageUrl }} style={{ width: 220, height: 220, alignSelf: "center" }} />
            <Text className="mt-3 text-center text-xs text-gray-500">{qrPayload}</Text>
            <Pressable className="mt-4 rounded-xl bg-gray-900 py-3" onPress={() => setMyCodeVisible(false)}>
              <Text className="text-center font-semibold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={createCircleVisible} transparent animationType="slide" onRequestClose={() => setCreateCircleVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5">
            <Text className="mb-3 text-lg font-bold text-gray-900">Create circle</Text>
            <TextInput
              value={circleName}
              onChangeText={setCircleName}
              placeholder="New circle name"
              className="mb-3 rounded-xl border border-gray-300 px-3 py-3"
            />
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Select friends</Text>
            <View className="mb-3 flex-row flex-wrap">
              {friends.length ? (
                friends.map((item) => {
                  const friend = item.friend;
                  const active = selectedFriendIds.includes(friend.id);
                  return (
                    <Pressable
                      key={friend.id}
                      onPress={() => toggleFriendForCircle(friend.id)}
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
            <Pressable
              className="mb-3 rounded-xl bg-gray-900 py-3"
              onPress={async () => {
                await submitCircle();
                setCreateCircleVisible(false);
              }}
              disabled={creatingCircle}
            >
              <Text className="text-center font-semibold text-white">{creatingCircle ? "Creating..." : "Create Circle"}</Text>
            </Pressable>
            <Pressable className="rounded-xl bg-gray-200 py-3" onPress={() => setCreateCircleVisible(false)}>
              <Text className="text-center font-semibold text-gray-700">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-base font-semibold text-white">Scan friend QR</Text>
            <Pressable onPress={() => setCameraVisible(false)} className="rounded-lg bg-white/20 px-3 py-2">
              <Text className="font-semibold text-white">Close</Text>
            </Pressable>
          </View>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              scanLocked
                ? undefined
                : ({ data }) => {
                    setScanLocked(true);
                    const parsedCode = parseCodeFromQrPayload(data);
                    void submitCode(parsedCode);
                  }
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
