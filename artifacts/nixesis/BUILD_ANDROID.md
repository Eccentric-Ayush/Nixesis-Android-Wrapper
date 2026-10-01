# Build Nixesis for Android

The Android project is under `artifacts/nixesis/android`. Rebuild its web
assets whenever the React app changes. Do not build the APK or AAB in Replit;
use Android Studio on a machine with the Android SDK installed.

## Configure the backend

The Android app does not host the Express/tRPC backend. Set `VITE_API_BASE_URL`
to the deployed backend's API base URL, including `/nixesis-api` and without a
trailing slash. For example:

```sh
VITE_API_BASE_URL="https://api.example.com/nixesis-api" \
  pnpm --filter @workspace/nixesis run build:android
```

Alternatively, create an untracked `.env.production.local` beside
`capacitor.config.ts` with that `VITE_API_BASE_URL`. Do not commit production
environment files. If the variable is missing in an Android build, the app
shows a configuration message instead of sending API requests to its local
WebView address.

The current `com.nixesis.app` application ID is provisional. If Nixesis already
has a Play Store listing, change it to that listing's existing application ID
before generating a release; Android treats application IDs as app identity.

The existing Manus sign-in flow also needs `VITE_APP_ID` and
`VITE_OAUTH_PORTAL_URL`. Register this callback with the OAuth service:

```text
https://YOUR_BACKEND_HOST/nixesis-api/oauth/callback
```

The backend prepares the short-lived OAuth state cookie before opening the
sign-in page, and the callback returns to the Android app through
`nixesis://auth/callback`.
For a separately hosted web client, include its exact HTTPS origin in
`CORS_ALLOWED_ORIGINS`; the callback uses that allowlist for browser return
redirects.

The separate API host must also have `OAUTH_SERVER_URL`, `VITE_APP_ID`,
`DATABASE_URL` (the source backend uses MySQL), and a private `JWT_SECRET`.
Store database credentials and `JWT_SECRET` in the backend host's secret
manager. Do not put them in `VITE_*` variables or the Android bundle. The
Replit preview can start without these settings, but backend login and
persistence will not work until they are configured.

## Backend CORS

When the Android app and API are on different origins, the API must:

- Allow these exact origins: `capacitor://localhost`, `http://localhost`, and
  `https://localhost` (Capacitor's default Android origin).
- Return `Access-Control-Allow-Credentials: true` and echo the requesting
  allowed origin in `Access-Control-Allow-Origin`; do not use `*` with
  credentials.
- Allow `GET`, `POST`, and `OPTIONS`, and the `Authorization`,
  `Content-Type`, `X-Requested-With`, and `trpc-accept` request headers.
- Handle preflight `OPTIONS` requests and serve the API over HTTPS so
  `SameSite=None; Secure` session cookies work.

The included Express backend already allows the three Capacitor origins.
Additional web origins can be comma-separated in `CORS_ALLOWED_ORIGINS`.

## Open and run in Android Studio

1. From this workspace, enter the Nixesis package and open the generated
   Android project:

   ```sh
   cd artifacts/nixesis
   npx cap open android
   ```

2. Let Android Studio finish Gradle sync. Select an installed emulator in the
   device menu and press **Run**.
3. To use a phone, enable Developer options and USB debugging, connect it over
   USB, approve the computer on the phone, select the device in Android Studio,
   and press **Run**.
4. After changing the web app or its backend URL, rebuild and sync before
   running again:

   ```sh
   pnpm run build:android
   ```

## Create a signed release

1. In Android Studio, choose **Build → Generate Signed Bundle / APK**.
2. Choose **Android App Bundle** for Google Play, or **APK** for direct
   installation.
3. Create or select a release keystore, choose the `release` build variant,
   complete the signing prompts, and generate the artifact.
4. Keep the keystore and its passwords in a secure password manager. Do not
   commit them to GitHub. Upload the signed AAB to the Play Console when ready.