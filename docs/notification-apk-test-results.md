# Notification APK Validation Checklist

Date: 2026-04-16

## Scope

Android release APK validation checklist for notification behavior.

## Results

- Permission grant + token registration: **NOT RUN (manual device test required)**
- Circle live notifications OFF => no push: **NOT RUN (manual device test required)**
- Circle live notifications ON + shared log => recipient push arrives: **NOT RUN (manual device test required)**
- Sender does not receive own live push: **NOT RUN (manual device test required)**
- Invalid token cleanup path works: **NOT RUN (manual device test required)**
- Daily/no-log reminders respect quiet hours: **NOT RUN (manual device test required)**

## Notes

- Server and app code paths for push token sync and Expo push delivery are implemented.
- These checks require at least two physical devices/installations to verify recipient/sender behavior.
- Run this checklist on release APK builds (not Expo Go) and update each row to PASS/FAIL with evidence.
