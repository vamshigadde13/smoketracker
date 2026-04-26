import * as Sharing from "expo-sharing";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as XLSX from "xlsx";

function sheetFromObjects(rows, emptyPlaceholder) {
  const data = rows?.length ? rows : [emptyPlaceholder];
  return XLSX.utils.json_to_sheet(data);
}

export async function shareSmokeTrackerSpreadsheet(payload) {
  const wb = XLSX.utils.book_new();

  const entryRows = (payload.entries || []).map((e) => ({
    id: e.id,
    timestamp_iso: new Date(e.timestamp).toISOString(),
    brand: e.brand ?? "",
    quantity: e.quantity ?? "",
    cost_inr: e.cost ?? "",
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(entryRows, {
      id: "",
      timestamp_iso: "",
      brand: "",
      quantity: "",
      cost_inr: "",
    }),
    "Smoke logs"
  );

  const presetRows = (payload.presets || []).map((p) => ({
    id: p.id,
    brand: p.brand ?? "",
    short_name: p.shortName ?? "",
    quantity: p.quantity ?? "",
    cost_per_smoke: p.costPerSmoke ?? "",
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(presetRows, {
      id: "",
      brand: "",
      short_name: "",
      quantity: "",
      cost_per_smoke: "",
    }),
    "Presets"
  );

  const prof = payload.profile || {};
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      [{ name: prof.name ?? "", alias: prof.alias ?? "", bio: prof.bio ?? "" }],
      { name: "", alias: "", bio: "" }
    ),
    "Profile"
  );

  const brandRows = (payload.brands || []).map((b) => ({
    id: b.id ?? "",
    name: b.name ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, sheetFromObjects(brandRows, { id: "", name: "" }), "Brands");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { key: "app", value: payload.app ?? "Smoke Tracker" },
      { key: "exported_at", value: payload.exportedAt ?? "" },
    ]),
    "Export info"
  );

  if (!cacheDirectory) throw new Error("File export is not available on this platform.");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const safeDate = (payload.exportedAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "");
  const uri = `${cacheDirectory}smoke-tracker-export-${safeDate}.xlsx`;
  await writeAsStringAsync(uri, base64, { encoding: "base64" });

  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export Smoke Tracker",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}

function esc(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildFullDataCsv(payload) {
  const lines = [];
  const row = (cells) => lines.push(cells.map(esc).join(","));
  row(["section", "SMOKE_LOGS"]);
  row(["id", "timestamp_iso", "brand", "quantity", "cost_inr"]);
  for (const e of payload.entries || []) row([e.id, new Date(e.timestamp).toISOString(), e.brand, e.quantity, e.cost ?? ""]);
  lines.push("");
  row(["section", "PRESETS"]);
  row(["id", "brand", "short_name", "quantity", "cost_per_smoke"]);
  for (const p of payload.presets || []) row([p.id, p.brand, p.shortName ?? "", p.quantity, p.costPerSmoke ?? ""]);
  lines.push("");
  row(["section", "PROFILE"]);
  row(["name", "alias", "bio"]);
  row([payload.profile?.name, payload.profile?.alias, payload.profile?.bio]);
  lines.push("");
  row(["section", "BRANDS"]);
  row(["id", "name"]);
  for (const b of payload.brands || []) row([b.id, b.name]);
  lines.push("");
  row(["section", "EXPORT_INFO"]);
  row(["key", "value"]);
  row(["app", payload.app ?? "Smoke Tracker"]);
  row(["exported_at", payload.exportedAt ?? ""]);
  return "\uFEFF" + lines.join("\r\n");
}

export async function shareSmokeTrackerCsv(payload) {
  if (!cacheDirectory) throw new Error("File export is not available on this platform.");
  const safeDate = (payload.exportedAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "");
  const uri = `${cacheDirectory}smoke-tracker-export-${safeDate}.csv`;
  await writeAsStringAsync(uri, buildFullDataCsv(payload), { encoding: "utf8" });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: "Export Smoke Tracker (CSV)",
  });
}
