import { apiRequest } from "./client";

const normalizePreset = (preset) => ({
  id: String(preset?._id || preset?.id || ""),
  brand: String(preset?.brand || ""),
  ...(String(preset?.shortName || "").trim() ? { shortName: String(preset.shortName).trim() } : {}),
  quantity: Number(preset?.quantity) || 1,
  ...(preset?.costPerSmoke === null || preset?.costPerSmoke === undefined ? {} : { costPerSmoke: Number(preset.costPerSmoke) }),
});

export const fetchPresetsApi = async () => {
  const data = await apiRequest("/api/v1/presets");
  return (data?.presets || []).map(normalizePreset);
};

export const createPresetApi = async (payload) => {
  const data = await apiRequest("/api/v1/presets", {
    method: "POST",
    body: payload,
  });
  return normalizePreset(data?.preset || {});
};

export const updatePresetApi = async (payload) => {
  const data = await apiRequest(`/api/v1/presets/${payload.id}`, {
    method: "PUT",
    body: payload,
  });
  return normalizePreset(data?.preset || {});
};

export const deletePresetApi = async (id) => {
  await apiRequest(`/api/v1/presets/${id}`, { method: "DELETE" });
};
