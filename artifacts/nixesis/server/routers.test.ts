import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function unauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function authenticatedContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: 42, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "test", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("protected Nixesis procedures", () => {
  it("rejects dashboard access without a session", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.dashboard.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects invalid habit log values before persistence", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.habits.log({ habitId: 0, loggedAt: "not-a-date", value: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps social and event data behind authentication", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.social.home()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.events.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.alerts.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reports Supabase backup availability only to signed-in users", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const status = await caller.supabase.status();
    expect(status.provider).toBe("supabase");
    expect(status.configured).toBe(true);
  });

  it("rejects malformed event dates before persistence", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.events.create({
      title: "Test event",
      eventType: "competition",
      metric: "habit_completions",
      startDate: "tomorrow",
      endDate: "later",
      inviteUserIds: [],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
