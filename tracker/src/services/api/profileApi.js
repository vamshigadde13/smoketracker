import { apiRequest } from "./client";

const normalizeProfile = (profile) => ({
  name: String(profile?.name || "").trim(),
  alias: String(profile?.alias || "").trim(),
  bio: String(profile?.bio || "").trim(),
});

export const fetchProfileApi = async () => {
  const data = await apiRequest("/api/v1/profile");
  return normalizeProfile(data?.profile || {});
};

export const saveProfileApi = async (profile) => {
  const data = await apiRequest("/api/v1/profile", {
    method: "PUT",
    body: profile,
  });
  return normalizeProfile(data?.profile || {});
};

export const clearProfileApi = async () => {
  await apiRequest("/api/v1/profile", { method: "DELETE" });
};
