import { apiRequest } from "./client";

const normalizeBrand = (brand) => ({
  id: String(brand?._id || brand?.id || ""),
  name: String(brand?.name || ""),
});

export const fetchBrandsApi = async () => {
  const data = await apiRequest("/api/v1/brands");
  return (data?.brands || []).map(normalizeBrand);
};

export const createBrandApi = async (name) => {
  const data = await apiRequest("/api/v1/brands", {
    method: "POST",
    body: { name },
  });
  return normalizeBrand(data?.brand || {});
};

export const deleteBrandApi = async (id) => {
  await apiRequest(`/api/v1/brands/${id}`, { method: "DELETE" });
};
