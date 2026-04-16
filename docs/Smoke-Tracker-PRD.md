# Smoke Tracker — Product specification

**Last updated:** April 2026

> Source of truth: align `prd.txt` in the repo root with this document when updating features.

---

## 1. Overview

A mobile app that helps users track smoking habits by logging each session and viewing simple analytics: frequency, brands, spend, and patterns.

- **Account-based:** users sign up and sign in before tracking.
- **Offline-tolerant:** writes are applied locally first and queued for background sync when network is unavailable.
- **Fast, minimal UX:** goal is to log in seconds.
- **Hosted API backend:** app defaults to the deployed API, with env-based base URL override support.

## 2. Goals

**Primary**

- Increase awareness of smoking habits.
- Track: time, brand, quantity, optional cost per log.
- Simple analytics (totals, brands, peaks, streaks).

**Secondary**

- Support reduction through awareness (no medical claims).
- Keep logging to 1–2 taps where possible.
- Keep data resilient across unstable connectivity with automatic sync recovery.

## 3. Target users

People who want to track usage, compare days, and understand patterns with a simple account-based experience and reliable sync.

## 4. Shipped features (current build)

### Stack

- **Frontend:** React Native (Expo), JavaScript, NativeWind (Tailwind-style).
- **Persistence:** `@react-native-async-storage/async-storage`.
- **Navigation:** bottom tabs (React Navigation).
- **Backend access:** token-authenticated API (`fetch`/`axios`) with hosted default base URL.

### 4.0 Authentication

- **Sign up:** create account using username + password.
- **Sign in:** authenticate and store token locally for subsequent API requests.
- **Session gate:** unauthenticated users see Login/Register flow; authenticated users enter main tracker tabs.
- **Logout:** Profile action clears auth token on device.

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
- Name is registration-controlled; alias and bio are editable in app.
- **Your data:** export `.xlsx` (multi-sheet) with CSV fallback; share via device sheet; no upload.
- **Notifications:** daily check-in / no-log nudge toggles, quiet hours, reminder time, permission prompt.
- **Sync status:** queued operations count, last success time, last error, and manual "Sync now" action.
- **Danger zone:** clear logs+brands, presets, profile, or all app data (confirmed).
- Stats: logs, brands, presets counts.
- Header subtitle: “On this device”.

### 4.6 Presets (modal from Add entry)

- Create / edit / delete: brand, quantity, optional cost per smoke.
- Used for quick logging from Home and the add modal.

### 4.7 Friends & Circles (optional)

- **Friend code:** each user gets a unique `<username>#NNNN` code at signup.
- **Add friend:** send request via friend code or QR payload (`app://add-friend?code=<friendCode>`).
- **Mutual model:** requests are pending until accepted; no public follower graph.
- **Circles:** private small groups for sharing logs (2-10 members).
- **Share toggle on log:** users explicitly choose per-entry share (`shareToCircle` + `circleId`).
- **Live circle notifications:** default OFF, controlled at circle level, triggered only on explicitly shared logs.

### 4.8 Shared UI

- **ConfirmModal** for destructive actions.
- **MessageModal** for non-blocking messages (e.g. export errors).
- **ScreenHeader** on secondary tabs.

## 5. Data model (as implemented)

| Entity | Fields |
|--------|--------|
| Smoke entry | id, timestamp, brand, quantity, optional cost, shareToCircle, optional circleId |
| Brand | id, name |
| Preset | id, brand, quantity, optional costPerSmoke |
| Profile | name, alias, bio (+ extensions in storage) |
| Notification settings | enabledDailyCheckin, enabledNoLogNudge, dailyTime, quiet hours, permissionAsked |
| Sync queue op | entity, op, payload, queued timestamps/status |
| Auth/session | token (device storage), user identity from auth endpoints |
| Friend | id, userId, friendUserId, status |
| Circle | id, name, createdBy |
| Circle member | id, circleId, userId, role |
| Circle settings | circleId, liveNotificationsEnabled (default false) |

Primary data is API-backed with AsyncStorage cache + queue-based offline fallback (`tracker/src/services/storage.js` and sync queue helpers).

## 6. Analytics (implemented)

- Aggregations by day / week / month; week starts Sunday (matches Home “This week”).
- Brand counts; peak hour; morning / afternoon / evening / night buckets.
- Spend sums where cost is present.

## 7. Sync behavior (implemented)

- Local-first writes for entries, brands, presets, profile, and notification settings.
- On API failure, operations are queued and retried via flush on app activation and refresh.
- Read paths prefer API and fall back to local cache when unavailable.
- Profile shows queue health and supports manual sync trigger.

## 8. Non-goals (v1)

- No multi-account switching on a single session flow.
- No public social feed or global user search.
- No social features or ads.

## 9. Future enhancements

- Goals (e.g. max smokes per day), reminders.
- Charts (line/pie) where they add clear value.
- Stronger conflict resolution semantics for offline edits.
- iOS polish and store checklist.

## 10. Success metrics (product)

- Repeat logging (e.g. streak maintenance).
- Logs per active user per week.
- Retention proxies (return sessions).
- Queue drain reliability (pending op age / sync success rate).

## 11. Risks

- Users may stop logging; streak and light copy reinforce habit.
- Over-complex UI; keep primary flows short.
- Connectivity failures can delay server consistency; queue visibility and retry reduce impact.
- Privacy: auth + synced data implies backend data handling requirements in addition to local messaging.
