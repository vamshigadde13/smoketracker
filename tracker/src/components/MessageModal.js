import { Modal, Pressable, Text, View } from "react-native";

export function MessageModal({
  visible,
  title,
  message,
  confirmText = "OK",
  cancelText,
  destructive = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/30 px-6">
        <View className="w-full max-w-md rounded-2xl bg-white p-5">
          <Text className="text-lg font-bold text-gray-900">{title}</Text>
          <Text className="mt-2 text-sm text-gray-600">{message}</Text>
          <View className="mt-5 flex-row justify-end">
            {cancelText ? (
              <Pressable onPress={onClose} className="mr-2 rounded-lg bg-gray-100 px-4 py-2">
                <Text className="text-sm font-semibold text-gray-700">{cancelText}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onConfirm}
              className={`rounded-lg px-4 py-2 ${destructive ? "bg-red-600" : "bg-gray-900"}`}
            >
              <Text className="text-sm font-semibold text-white">{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
