# Smoke Tracker — Product specification

**Last updated:** April 2026

> Source of truth: align `prd.txt` in the repo root with this document when updating features.

---

## 1. Overview

A mobile app that helps users track smoking habits by logging each session and viewing simple analytics: frequency, brands, spend, and patterns.

- **Offline-first:** data stays on the device (AsyncStorage).
- **Fast, minimal UX:** goal is to log in seconds.
- **Companion server:** optional Express API scaffold (in-memory); the shipped app does not require it for daily use.

## 2. Goals

**Primary**

- Increase awareness of smoking habits.
- Track: time, brand, quantity, optional cost per log.
- Simple analytics (totals, brands, peaks, streaks).

**Secondary**

- Support reduction through awareness (no medical claims).
- Keep logging to 1–2 taps where possible.

## 3. Target users

People who want to track usage, compare days, and understand patterns without signing up or syncing to the cloud.

## 4. Shipped features (current build)

### Stack

- **Frontend:** React Native (Expo), JavaScript, NativeWind (Tailwind-style).
- **Persistence:** `@react-native-async-storage/async-storage`.
- **Navigation:** bottom tabs (React Navigation).

### 4.1 Home

- **Header:** optional greeting (profile name/alias) + “Smoke Tracker” subtitle.
- **Daily logging streak:** consecutive local days with ≥1 log; flame badge with count; “at risk” hint if today is not logged but the streak was active through yesterday.
- **Today card:** smokes logged, comparison vs yesterday, log count, optional spend.
- **This week:** total (Sun–today).
- **Primary CTA:** Log smoke (opens add modal).
- **Quick presets:** horizontal chips for one-tap log with quantity and optional cost.
- **Recent brands:** one-tap log (1 smoke) by brand.
- **At a glance:** all-time smokes, tracked spend, last log, latest logs preview.
- **Pull-to-refresh** to reload storage.

### 4.2 Add entry (modal)

- Brand (text + suggestions from history).
- Quantity (default 1).
- Optional cost (per log), INR-style formatting in UI.
- Timestamp (auto; adjustable in UI as implemented).
- Link to manage **Presets** (full-screen preset editor).

### 4.3 History

- **Tabs:** Today | Month.
- **Today:** sectioned list by day, newest first; delete with confirmation; empty state; pull-to-refresh.
- **Month:** calendar heatmap by day; month navigation; optional brand filter; optional two-tap date range + range summary (logs, total smokes, by brand); tap a day for that day’s logs.
- **Header:** consistent title + “Smoke Tracker” + icon.

### 4.4 Insights (Analytics)

- Summary metrics: today / month totals, log counts, spend where cost exists.
- Brand highlights, peak hour, time-of-day periods.
- Spending section (INR; logs with cost only).
- Empty state when there are no entries.

### 4.5 Profile

- Editable profile: name, alias, bio (local).
- **Your data:** export `.xlsx` (multi-sheet) with CSV fallback; share via device sheet; no upload.
- **Danger zone:** clear all local data (confirmed).
- Stats: logs, brands, presets counts.
- Header subtitle: “On this device”.

### 4.6 Presets (modal from Add entry)

- Create / edit / delete: brand, quantity, optional cost per smoke.
- Used for quick logging from Home and the add modal.

### 4.7 Shared UI

- **ConfirmModal** for destructive actions.
- **MessageModal** for non-blocking messages (e.g. export errors).
- **ScreenHeader** on secondary tabs.

## 5. Data model (as implemented)

| Entity | Fields |
|--------|--------|
| Smoke entry | id, timestamp, brand, quantity, optional cost |
| Brand | id, name |
| Preset | id, brand, quantity, optional costPerSmoke |
| Profile | name, alias, bio (+ extensions in storage) |

All JSON in AsyncStorage (`tracker/src/constants/storageKeys`).

## 6. Analytics (implemented)

- Aggregations by day / week / month; week starts Sunday (matches Home “This week”).
- Brand counts; peak hour; morning / afternoon / evening / night buckets.
- Spend sums where cost is present.

## 7. Non-goals (v1)

- No login/signup.
- No cloud sync in-app (manual export only).
- No social features or ads.

## 8. Future enhancements

- Goals (e.g. max smokes per day), reminders.
- Charts (line/pie) where they add clear value.
- Optional cloud backup.
- iOS polish and store checklist.

## 9. Success metrics (product)

- Repeat logging (e.g. streak maintenance).
- Logs per active user per week.
- Retention proxies (return sessions).

## 10. Risks

- Users may stop logging; streak and light copy reinforce habit.
- Over-complex UI; keep primary flows short.
- Privacy: local data; messaging on Profile and export.
