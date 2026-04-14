import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';

  return hostUri.split(':')[0];
};

const resolveApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl;

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:5000`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveApiBaseUrl();
