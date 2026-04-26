import { isToday } from "../utils/date";
import { entrySpend } from "../utils/money";

const qty = (entry) => Number(entry.quantity) || 0;
const startOfDayTs = (timestamp) => {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const getWeekStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
};
const getPeriod = (h) => (h >= 6 && h < 12 ? "Morning" : h < 18 ? "Afternoon" : h < 24 ? "Evening" : "Night");
const getRangeCutoff = (rangeKey) => {
  if (rangeKey === "all") return null;
  const dayCount = rangeKey === "7d" ? 7 : rangeKey === "90d" ? 90 : 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() - (dayCount - 1));
  return today.getTime();
};

export const getEntriesForRange = (entries, rangeKey) => {
  const cutoff = getRangeCutoff(rangeKey);
  if (cutoff == null) return [...entries];
  return entries.filter((entry) => entry.timestamp >= cutoff);
};

export const getDailyTotalsForRange = (entries, rangeKey) => {
  const filtered = getEntriesForRange(entries, rangeKey);
  const totalsByDay = new Map();
  filtered.forEach((entry) => {
    const d = new Date(entry.timestamp);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    totalsByDay.set(key, (totalsByDay.get(key) || 0) + qty(entry));
  });
  const days = [];
  if (rangeKey === "all") {
    [...totalsByDay.keys()]
      .sort((a, b) => a - b)
      .forEach((ts) => {
        days.push({
          timestamp: ts,
          label: new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          total: totalsByDay.get(ts) || 0,
        });
      });
    return days;
  }
  const cutoff = getRangeCutoff(rangeKey);
  if (cutoff == null) return [];
  const nowStart = startOfDayTs(Date.now());
  for (let t = cutoff; t <= nowStart; t += 86400000) {
    days.push({
      timestamp: t,
      label: new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      total: totalsByDay.get(t) || 0,
    });
  }
  return days;
};

export const getBrandCostInsights = (entries) => {
  const brandMap = entries.reduce((acc, entry) => {
    const name = String(entry.brand || "Unknown").trim() || "Unknown";
    if (!acc[name]) {
      acc[name] = {
        brand: name,
        smokes: 0,
        logs: 0,
        spend: 0,
        costLogs: 0,
      };
    }
    const quantity = qty(entry);
    const spend = entrySpend(entry);
    acc[name].smokes += quantity;
    acc[name].logs += 1;
    acc[name].spend += spend;
    if (spend > 0) acc[name].costLogs += 1;
    return acc;
  }, {});

  const brands = Object.values(brandMap).map((item) => ({
    ...item,
    avgCostPerSmoke: item.smokes > 0 ? item.spend / item.smokes : 0,
  }));

  const topBySmokes = [...brands].sort((a, b) => b.smokes - a.smokes).slice(0, 5);
  const topBySpend = [...brands].filter((b) => b.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 5);

  const totalSmokes = entries.reduce((sum, entry) => sum + qty(entry), 0);
  const totalSpend = entries.reduce((sum, entry) => sum + entrySpend(entry), 0);
  const costEntryCount = entries.filter((entry) => entrySpend(entry) > 0).length;

  return {
    topBySmokes,
    topBySpend,
    totalSmokes,
    totalSpend,
    costEntryCount,
    avgCostPerSmokeOverall: totalSmokes > 0 ? totalSpend / totalSmokes : 0,
  };
};

export const getCoachingInsights = (entries) => {
  if (!entries.length) {
    return {
      tips: ["Start by logging for 3 days to unlock personalized insights."],
      goal: "Log each smoke today to build your baseline.",
    };
  }

  const totalSmokes = entries.reduce((sum, entry) => sum + qty(entry), 0);
  const uniqueDays = new Set(entries.map((entry) => startOfDayTs(entry.timestamp))).size;
  const avgPerDay = uniqueDays > 0 ? totalSmokes / uniqueDays : 0;

  const hourMap = entries.reduce((acc, entry) => {
    const hour = new Date(entry.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + qty(entry);
    return acc;
  }, {});
  const [peakHourRaw] = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0] || [];
  const peakHour = peakHourRaw != null ? Number(peakHourRaw) : null;
  const peakWindow = peakHour == null ? null : `${String(peakHour).padStart(2, "0")}:00-${String((peakHour + 1) % 24).padStart(2, "0")}:00`;

  const brandMap = entries.reduce((acc, entry) => {
    const name = String(entry.brand || "Unknown").trim() || "Unknown";
    acc[name] = (acc[name] || 0) + qty(entry);
    return acc;
  }, {});
  const [topBrandName, topBrandSmokes] = Object.entries(brandMap).sort((a, b) => b[1] - a[1])[0] || [];

  const nightSmokes = entries.reduce((sum, entry) => {
    const h = new Date(entry.timestamp).getHours();
    return h >= 21 || h < 5 ? sum + qty(entry) : sum;
  }, 0);
  const nightShare = totalSmokes > 0 ? Math.round((nightSmokes / totalSmokes) * 100) : 0;

  const tips = [];
  if (peakWindow) tips.push(`Most smoking happens around ${peakWindow}. Plan a small delay in this window.`);
  if (topBrandName) tips.push(`${topBrandName} is your top brand (${topBrandSmokes} smokes in this range).`);
  if (nightShare >= 25) tips.push(`${nightShare}% of smokes are late-night. Reducing one late log can lower next-day total.`);
  if (tips.length < 3) tips.push(`Current average is ${avgPerDay.toFixed(1)} smokes/day. Try lowering it by 1 this week.`);

  const goal =
    avgPerDay >= 8
      ? "Goal: reduce by 1 smoke/day this week."
      : avgPerDay >= 4
        ? "Goal: keep one smoke-free hour block each evening."
        : "Goal: keep consistency and maintain your current pace.";

  return { tips: tips.slice(0, 3), goal };
};

export const getAnalyticsSummary = (entries) => {
  const todayEntries = entries.filter((e) => isToday(e.timestamp));
  const todayTotal = todayEntries.reduce((sum, e) => sum + qty(e), 0);
  const todayLogCount = todayEntries.length;
  const todaySpend = todayEntries.reduce((sum, e) => sum + entrySpend(e), 0);
  const weekEntries = entries.filter((e) => e.timestamp >= getWeekStart());
  const weekTotal = weekEntries.reduce((sum, e) => sum + qty(e), 0);
  const weekLogCount = weekEntries.length;
  const weekSpend = weekEntries.reduce((sum, e) => sum + entrySpend(e), 0);
  const n = new Date();
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.timestamp);
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const monthTotal = monthEntries.reduce((sum, e) => sum + qty(e), 0);
  const monthLogCount = monthEntries.length;
  const monthSpend = monthEntries.reduce((sum, e) => sum + entrySpend(e), 0);
  const allTimeSmokes = entries.reduce((sum, e) => sum + qty(e), 0);
  const allTimeLogs = entries.length;
  const allTimeSpend = entries.reduce((sum, e) => sum + entrySpend(e), 0);

  const brandMap = entries.reduce((acc, e) => {
    const k = e.brand || "Unknown";
    if (!acc[k]) acc[k] = { smokes: 0, logs: 0 };
    acc[k].smokes += qty(e);
    acc[k].logs += 1;
    return acc;
  }, {});
  const topBrands = Object.entries(brandMap)
    .map(([name, v]) => ({ name, smokes: v.smokes, logs: v.logs }))
    .sort((a, b) => b.smokes - a.smokes)
    .slice(0, 5);
  const [mostUsedBrand = "N/A"] = Object.entries(brandMap)
    .map(([k, v]) => [k, v.smokes])
    .sort((a, b) => b[1] - a[1])[0] || [];

  const hourMap = entries.reduce((acc, e) => {
    const h = new Date(e.timestamp).getHours();
    acc[h] = (acc[h] || 0) + qty(e);
    return acc;
  }, {});
  const [peakHourRaw] = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0] || [];
  const peakHour = peakHourRaw !== undefined ? Number(peakHourRaw) : null;
  const periodMap = entries.reduce((acc, e) => {
    const p = getPeriod(new Date(e.timestamp).getHours());
    acc[p] = (acc[p] || 0) + qty(e);
    return acc;
  }, {});
  const [peakPeriod = "N/A"] = Object.entries(periodMap).sort((a, b) => b[1] - a[1])[0] || [];

  return {
    todayTotal,
    todayLogCount,
    todaySpend,
    weekTotal,
    weekLogCount,
    weekSpend,
    monthTotal,
    monthLogCount,
    monthSpend,
    allTimeSmokes,
    allTimeLogs,
    allTimeSpend,
    topBrands,
    mostUsedBrand,
    peakHour,
    peakPeriod,
  };
};

export const getGoalProgress = ({ entries, goals }) => {
  const dailyLimit = Math.max(0, Number(goals?.dailyLimit) || 0);
  const weeklyLimit = Math.max(0, Number(goals?.weeklyLimit) || 0);
  const summary = getAnalyticsSummary(entries);
  const dailyUsed = summary.todayTotal;
  const weeklyUsed = summary.weekTotal;
  const dailyRemaining = dailyLimit > 0 ? dailyLimit - dailyUsed : null;
  const weeklyRemaining = weeklyLimit > 0 ? weeklyLimit - weeklyUsed : null;
  return {
    dailyLimit,
    weeklyLimit,
    dailyUsed,
    weeklyUsed,
    dailyRemaining,
    weeklyRemaining,
    dailyWithin: dailyLimit > 0 ? dailyUsed <= dailyLimit : true,
    weeklyWithin: weeklyLimit > 0 ? weeklyUsed <= weeklyLimit : true,
  };
};

export const getTriggerInsights = (entries) => {
  const triggerMap = entries.reduce((map, entry) => {
    const trigger = String(entry.trigger || "").trim();
    if (!trigger) return map;
    map.set(trigger, (map.get(trigger) || 0) + qty(entry));
    return map;
  }, new Map());
  const top = Array.from(triggerMap.entries())
    .map(([trigger, smokes]) => ({ trigger, smokes }))
    .sort((a, b) => b.smokes - a.smokes)
    .slice(0, 5);
  return {
    totalTaggedLogs: entries.filter((entry) => String(entry.trigger || "").trim()).length,
    top,
  };
};

export const getTypicalSmokingHour = (entries) => {
  if (!entries.length) return null;
  const hourMap = entries.reduce((acc, entry) => {
    const h = new Date(entry.timestamp).getHours();
    acc[h] = (acc[h] || 0) + qty(entry);
    return acc;
  }, {});
  const [peakHourRaw] = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0] || [];
  return peakHourRaw == null ? null : Number(peakHourRaw);
};

