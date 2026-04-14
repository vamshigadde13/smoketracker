import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../api";

const TOKEN_KEYS = ["token", "authToken", "accessToken", "jwt", "userToken"];

const readTokenFromPossibleShapes = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed.trim() || null;
    if (parsed && typeof parsed === "object") {
      return (
        String(
          parsed.token ||
            parsed.accessToken ||
            parsed.jwt ||
            parsed.authToken ||
            ""
        ).trim() || null
      );
    }
  } catch {
    return trimmed;
  }
  return trimmed;
};

export const getStoredAuthToken = async () => {
  for (const key of TOKEN_KEYS) {
    const value = await AsyncStorage.getItem(key);
    const token = readTokenFromPossibleShapes(value);
    if (token) return token;
  }
  return null;
};

export const clearStoredAuthToken = async () => {
  await AsyncStorage.multiRemove(TOKEN_KEYS);
};

export const getLoggedInUserProfile = async () => {
  try {
    const token = await getStoredAuthToken();
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/api/v1/user/currentuser`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.user;
    if (!user) return null;

    const registrationName =
      String(user.displayName || user.username || "").trim() || "";

    return {
      name: registrationName,
      username: String(user.username || "").trim(),
      displayName: String(user.displayName || "").trim(),
    };
  } catch {
    return null;
  }
};
