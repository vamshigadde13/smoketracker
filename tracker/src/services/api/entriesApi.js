import { apiRequest } from "./client";

const normalizeEntry = (entry) => ({
  id: String(entry?._id || entry?.id || ""),
  brand: String(entry?.brand || ""),
  quantity: Number(entry?.quantity) || 1,
  timestamp: entry?.timestamp ? new Date(entry.timestamp).getTime() : Date.now(),
  ...(entry?.cost === null || entry?.cost === undefined ? {} : { cost: Number(entry.cost) }),
});

export const fetchEntriesApi = async () => {
  const data = await apiRequest("/api/v1/entries");
  return (data?.entries || []).map(normalizeEntry).sort((a, b) => b.timestamp - a.timestamp);
};

export const createEntryApi = async (payload) => {
  const data = await apiRequest("/api/v1/entries", {
    method: "POST",
    body: {
      brand: payload.brand,
      quantity: payload.quantity,
      timestamp: payload.timestamp,
      cost: payload.cost,
    },
  });
  return normalizeEntry(data?.entry || {});
};

export const updateEntryApi = async (payload) => {
  const data = await apiRequest(`/api/v1/entries/${payload.id}`, {
    method: "PUT",
    body: {
      brand: payload.brand,
      quantity: payload.quantity,
      timestamp: payload.timestamp,
      cost: payload.cost,
    },
  });
  return normalizeEntry(data?.entry || {});
};

export const deleteEntryApi = async (id) => {
  await apiRequest(`/api/v1/entries/${id}`, { method: "DELETE" });
};
