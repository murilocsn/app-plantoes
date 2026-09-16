# Mobile publication - phase 1

This document records the first preparation pass for publishing FinancPlantoes as
an installable app on Google Play and the Apple App Store.

## Secret audit result

- Local `.env` files are ignored by Git:
  - `.env`
  - `apps/api/.env`
  - `apps/web/.env`
- The only tracked env file is `.env.example`.
- No real `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, or `CRON_SECRET`
  value was found in the current tracked files.
- The Git history checked for `.env`, `apps/api/.env`, and `apps/web/.env`
  only shows `.env.example`; local env files do not appear tracked.
- A history scan found one README reference to `service_role`; it is guidance
  text, not an exposed value.
- `.env.example`, legacy files, and the Pages workflow contain Supabase public
  publishable configuration. These values are not server secrets, but the app
  must rely on Supabase RLS and API authorization for protection.
- Local `.env` contains test-user credentials. They are ignored, but should be
  rotated if they were ever shared outside this machine.

## Variable policy

Allowed in frontend/mobile builds:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`
- `VITE_VAPID_PUBLIC_KEY`

Never ship in frontend/mobile builds:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET`
- test user passwords
- upload keys, keystores, App Store Connect API keys, certificates, and
  provisioning profiles

## Production readiness for mobile

- Mobile builds cannot call `localhost` and should not rely on a relative
  `/api` path.
- `VITE_API_BASE_URL` must be an absolute HTTPS URL for production mobile
  builds.
- Confirmed production mobile API base URL:
  `https://app-plantoes.onrender.com/api`
- The API must allow the mobile/web origin strategy already expected by the app
  and must continue validating Supabase bearer tokens.
- Supabase RLS must remain the security boundary for user-owned data.
- Push reminders require VAPID private values only in Supabase Function secrets
  or server-side hosting secrets, never in the app bundle.

## Store identity decisions

Decide these before initializing Capacitor, because changing them later is
painful:

- App display name: `FinancPlantoes`
- Android package/application ID: `br.com.muriloneder.financplantoes`
- iOS bundle ID: `br.com.muriloneder.financplantoes`
- Store developer name: pending Play Console / Apple Developer account
- Privacy policy URL: pending
- Support email: pending

Recommended identifier format:

- Android: `br.com.muriloneder.financplantoes`
- iOS: `br.com.muriloneder.financplantoes`

Use a domain or identifier you control. If you do not have a domain, choose a
stable personal or business identifier and keep it forever.

## Accounts and tooling

- Google Play Console is required for Play Store publication.
- Apple Developer Program is required for App Store/TestFlight publication.
- iOS archive/upload requires macOS with Xcode, or a trusted cloud macOS build
  service.
- Capacitor is the recommended wrapper because it can generate both Android and
  iOS native projects from the same Vite/React build.

## Completed in this phase

- Secret exposure review without printing secret values.
- Confirmed local env files are ignored.
- Added `.gitignore` protection for mobile signing files and release artifacts.
- Documented mobile env policy and the decisions still needed before Capacitor.
- Installed Capacitor dependencies in the web workspace.
- Created `apps/web/capacitor.config.ts` with
  `br.com.muriloneder.financplantoes`.
- Added Android and iOS native projects under `apps/web/android` and
  `apps/web/ios`.
- Added mobile build/sync scripts to `apps/web/package.json`.
- Mobile builds now inject `https://app-plantoes.onrender.com/api` and use a
  relative Vite base (`./`) so native assets load inside Capacitor.
- Synchronized the current web build into Android and iOS.
- Confirmed Android target SDK is 36.

## Next step

Install/configure Java JDK and Android Studio, then run an Android debug build:

```powershell
cd apps/web/android
.\gradlew.bat assembleDebug
```

The first attempt stopped because `JAVA_HOME` is not set and `java` is not in
the PATH. After Android Studio/JDK is configured, generate a debug APK first,
then move to signed release `.aab` for Google Play.
