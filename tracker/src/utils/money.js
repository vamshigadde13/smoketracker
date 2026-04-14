export const normalizeCost = (raw) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100) / 100;
};

export const entrySpend = (entry) => {
  const v = Number(entry?.cost);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export const entryHasCost = (entry) => entrySpend(entry) > 0;

export const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toFixed(2)}`;
};
