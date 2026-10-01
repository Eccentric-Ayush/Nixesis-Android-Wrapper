import { encodeOAuthState, NIXESIS_APP_URL } from "@shared/const";
import { Capacitor } from "@capacitor/core";
import { getApiBaseUrl } from "@/lib/api-base";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = async (options: { silent?: boolean } = {}) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  if (!oauthPortalUrl || !appId) {
    const message =
      "Sign-in is not configured. Set VITE_APP_ID and VITE_OAUTH_PORTAL_URL for this app.";
    console.error(`[OAuth] ${message}`);
    if (!options.silent) window.alert(message);
    return;
  }

  const apiBaseUrl = getApiBaseUrl();
  const redirectUri = `${apiBaseUrl}/oauth/callback`;
  const nonce = crypto.randomUUID();

  try {
    const response = await fetch(`${apiBaseUrl}/oauth/state`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce }),
    });
    if (!response.ok) {
      throw new Error(`OAuth state setup failed (${response.status})`);
    }
  } catch (error) {
    console.error("[OAuth] Could not prepare sign-in", error);
    if (!options.silent) {
      window.alert(
        "Sign-in could not connect to the Nixesis backend. Check your connection and try again.",
      );
    }
    return;
  }

  const state = encodeOAuthState({
    redirectUri,
    nonce,
    returnUri: Capacitor.isNativePlatform() ? NIXESIS_APP_URL : window.location.origin,
  });

  let url: URL;
  try {
    url = new URL(`${oauthPortalUrl.replace(/\/+$/, "")}/app-auth`);
  } catch (error) {
    console.error("[OAuth] Invalid VITE_OAUTH_PORTAL_URL", error);
    if (!options.silent) {
      window.alert("Sign-in is not configured with a valid OAuth portal URL.");
    }
    return;
  }
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
