import { describe, expect, it } from "vitest";

describe("Supabase connection", () => {
  it("accepts the configured server credentials", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url, "SUPABASE_URL must be configured").toMatch(/^https:\/\/[^/]+\.supabase\.co\/?$/);
    expect(key, "SUPABASE_SERVICE_ROLE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${url!.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
      },
    });

    const body = await response.text();
    expect(response.status, body).not.toBe(401);
    expect(response.status, body).not.toBe(403);
  }, 15_000);
});
