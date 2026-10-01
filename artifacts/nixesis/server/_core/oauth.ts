import {
  COOKIE_NAME,
  NIXESIS_API_BASE_PATH,
  NIXESIS_APP_URL,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getSafeReturnUri(returnUri: string | undefined): string {
  if (returnUri === NIXESIS_APP_URL) return returnUri;
  if (!returnUri) return "/";

  try {
    const target = new URL(returnUri);
    if (target.origin !== returnUri) return "/";

    const configuredOrigins = new Set(
      (process.env.CORS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
    if (target.protocol === "https:" && configuredOrigins.has(target.origin)) {
      return target.origin;
    }
    if (
      target.protocol === "http:" &&
      (target.hostname === "localhost" || target.hostname === "127.0.0.1")
    ) {
      return target.origin;
    }
  } catch {
    // Reject malformed, relative, and non-allowlisted return targets.
  }

  return "/";
}

export function registerOAuthRoutes(app: Express) {
  app.post(`${NIXESIS_API_BASE_PATH}/oauth/state`, (req: Request, res: Response) => {
    const nonce = req.body?.nonce;
    if (typeof nonce !== "string" || !/^[0-9a-f-]{36}$/i.test(nonce)) {
      res.status(400).json({ error: "A valid OAuth nonce is required" });
      return;
    }
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 10 * 60 * 1000,
    });
    res.sendStatus(204);
  });

  app.get(`${NIXESIS_API_BASE_PATH}/oauth/callback`, async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      const { returnUri } = decodeOAuthState(state);
      res.redirect(302, getSafeReturnUri(returnUri));
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
