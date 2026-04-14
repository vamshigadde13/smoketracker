import { API_BASE_URL } from "../../api";
import { getStoredAuthToken } from "../authProfile";

const withTimeout = async (promise, ms = 10000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const apiRequest = async (path, options = {}) => {
  const token = await getStoredAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await withTimeout(
    fetch(buildUrl(path), {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
    options.timeoutMs || 10000
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new ApiError(data?.message || "API request failed", response.status);
  }
  return data;
};
