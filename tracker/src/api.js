import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const VERCEL_API_BASE_URL = "https://smoketracker-puce.vercel.app";
const LOCALHOST_ANDROID_EMULATOR = "http://10.0.2.2:5000";

const resolveExpoHost = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.hostUri,
    Constants.manifest?.debuggerHost,
    NativeModules?.SourceCode?.scriptURL,
  ].filter(Boolean);

  for (const raw of candidates) {
    const text = String(raw);
    const match = text.match(/^(?:https?:\/\/)?([^/:]+)/);
    if (match?.[1] && match[1] !== "localhost") {
      return match[1];
    }
  }
  return null;
};

const resolveApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl;
  if (!__DEV__) return VERCEL_API_BASE_URL;

  const host = resolveExpoHost();
  if (host) return `http://${host}:5000`;

  if (Platform.OS === "android") return LOCALHOST_ANDROID_EMULATOR;

  return VERCEL_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();
