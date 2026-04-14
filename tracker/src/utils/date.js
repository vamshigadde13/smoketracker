export const formatDateTime = (timestamp) => new Date(timestamp).toLocaleString();
export const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const isToday = (timestamp) => {
  const d = new Date(timestamp);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export const isYesterday = (timestamp) => {
  const d = new Date(timestamp);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
};

export const getDayKey = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const prevDayKey = (dayKey) => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getDayKey(dt.getTime());
};

export const formatHistoryDayLabel = (timestamp) => {
  if (isToday(timestamp)) return "Today";
  if (isYesterday(timestamp)) return "Yesterday";
  return new Date(timestamp).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const formatDayKeyShort = (dayKey) => {
  if (!dayKey) return "—";
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function computeLoggingStreak(entries) {
  const days = new Set(entries.map((e) => getDayKey(e.timestamp)));
  const today = getDayKey(Date.now());
  let count = 0;
  let k = days.has(today) ? today : prevDayKey(today);
  while (days.has(k)) {
    count += 1;
    k = prevDayKey(k);
  }
  if (days.has(today)) return { count, variant: "active" };
  if (count > 0) return { count, variant: "at_risk" };
  return { count: 0, variant: "cold" };
}

export function computeLoggingHighlights(entries) {
  const dayTotals = new Map();
  for (const e of entries) {
    const k = getDayKey(e.timestamp);
    dayTotals.set(k, (dayTotals.get(k) || 0) + (Number(e.quantity) || 0));
  }
  const keys = [...dayTotals.keys()].sort((a, b) => a.localeCompare(b));
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    run = prev && prevDayKey(k) === prev ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = k;
  }
  let bestDayKey = null;
  let bestDayAmount = 0;
  for (const [k, amt] of dayTotals.entries()) {
    if (amt > bestDayAmount || (amt === bestDayAmount && k > bestDayKey)) {
      bestDayAmount = amt;
      bestDayKey = k;
    }
  }
  return { longestStreak, bestDayKey, bestDayAmount };
}
