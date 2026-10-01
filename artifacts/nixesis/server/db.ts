import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  alerts,
  eventParticipants,
  events,
  friendships,
  habits,
  habitLogs,
  profiles,
  stravaActivities,
  users,
  weeklyInsights,
  type InsertAlert,
  type InsertEvent,
  type InsertHabit,
  type InsertHabitLog,
  type InsertProfile,
  type InsertStravaActivity,
  type InsertUser,
  type InsertWeeklyInsight,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { syncSnapshotToSupabase, type NixesisSnapshot } from "./supabase";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

function requireDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  if (!_db) throw new Error("Database is not available");
  return _db;
}

function calculateStreakSnapshot(logRows: Array<{ habitId: number; loggedAt: string; value: unknown }>) {
  const byHabit = new Map<number, string[]>();
  for (const row of logRows) {
    if (Number(row.value) <= 0) continue;
    const dates = byHabit.get(row.habitId) ?? [];
    dates.push(row.loggedAt);
    byHabit.set(row.habitId, dates);
  }
  return Array.from(byHabit.entries()).map(([habitId, dates]) => {
    const unique = Array.from(new Set(dates)).sort().reverse();
    let current = 0;
    for (let index = 0; index < unique.length; index += 1) {
      const expected = new Date(`${unique[0]}T00:00:00Z`);
      expected.setUTCDate(expected.getUTCDate() - index);
      if (unique[index] !== expected.toISOString().slice(0, 10)) break;
      current += 1;
    }
    return { habitId, currentStreak: current, loggedDates: unique };
  });
}

async function syncUserSnapshot(userId: number) {
  const db = requireDb();
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) return { synced: false as const, reason: "user-not-found" as const };
  const profile = (await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1))[0] ?? null;
  const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
  const logs = await db.select().from(habitLogs).where(eq(habitLogs.userId, userId));
  const activities = await db.select().from(stravaActivities).where(eq(stravaActivities.userId, userId));
  const insights = await db.select().from(weeklyInsights).where(eq(weeklyInsights.userId, userId));
  const friendshipRows = await db.select().from(friendships).where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)));
  const ownedEvents = await db.select().from(events).where(eq(events.organizerId, userId));
  const joinedEventIds = await db.select().from(eventParticipants).where(eq(eventParticipants.userId, userId));
  const allEventIds = Array.from(new Set([...ownedEvents.map((event) => event.id), ...joinedEventIds.map((row) => row.eventId)]));
  const eventRows = allEventIds.length ? await db.select().from(events).where(inArray(events.id, allEventIds)) : [];
  const participantRows = allEventIds.length ? await db.select().from(eventParticipants).where(inArray(eventParticipants.eventId, allEventIds)) : [];
  const userAlerts = await db.select().from(alerts).where(eq(alerts.userId, userId));
  const snapshot: NixesisSnapshot = {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    user,
    profile,
    habits: userHabits,
    habitLogs: logs,
    stravaActivities: activities,
    weeklyInsights: insights,
    friendships: friendshipRows,
    events: eventRows,
    eventParticipants: participantRows,
    alerts: userAlerts,
    streaks: calculateStreakSnapshot(logs),
  };
  return syncSnapshotToSupabase(user.openId, snapshot);
}

async function persistSupabaseSnapshot(userId: number) {
  try {
    return await syncUserSnapshot(userId);
  } catch (error) {
    console.warn("[Supabase] Snapshot sync failed:", error instanceof Error ? error.message : error);
    return { synced: false as const, reason: "sync-failed" as const };
  }
}

function queueSupabaseSnapshot(userId: number) {
  void persistSupabaseSnapshot(userId);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOrCreateProfile(user: User) {
  const db = requireDb();
  const existing = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (existing[0]) return existing[0];
  const displayName = user.name?.trim() || "Winter arcer";
  await db.insert(profiles).values({ userId: user.id, displayName, timezone: "UTC" } satisfies InsertProfile);
  const created = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return created[0];
}

export async function getOrCreateDefaultHabits(userId: number) {
  const db = requireDb();
  const existing = await db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
  if (existing.length > 0) return existing;
  const defaults: InsertHabit[] = [
    { userId, type: "reading", name: "Reading", icon: "book", frequencyType: "daily", targetValue: "20", unit: "minutes" },
    { userId, type: "gym", name: "Gym consistency", icon: "dumbbell", frequencyType: "weekly_count", targetValue: "4", unit: "sessions" },
    { userId, type: "sleep", name: "Sleep window", icon: "moon", frequencyType: "daily", targetValue: "8", unit: "hours" },
  ];
  await db.insert(habits).values(defaults);
  return db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
}

export async function getHabitLogs(userId: number, from: string, to: string) {
  const db = requireDb();
  return db.select({ id: habitLogs.id, habitId: habitLogs.habitId, loggedAt: habitLogs.loggedAt, value: habitLogs.value, note: habitLogs.note })
    .from(habitLogs).where(and(eq(habitLogs.userId, userId), gte(habitLogs.loggedAt, from), lte(habitLogs.loggedAt, to))).orderBy(desc(habitLogs.loggedAt));
}

export async function getDashboardData(user: User) {
  const profile = await getOrCreateProfile(user);
  const activeHabits = await getOrCreateDefaultHabits(user.id);
  const end = new Date().toISOString().slice(0, 10);
  const startDate = new Date(); startDate.setDate(startDate.getDate() - 6);
  const logs = await getHabitLogs(user.id, startDate.toISOString().slice(0, 10), end);
  const insight = await getLatestWeeklyInsight(user.id);
  queueSupabaseSnapshot(user.id);
  return { profile, habits: activeHabits, logs, insight };
}

export async function upsertHabitLog(input: InsertHabitLog) {
  const db = requireDb();
  const existing = await db.select().from(habitLogs).where(and(eq(habitLogs.habitId, input.habitId), eq(habitLogs.loggedAt, input.loggedAt))).limit(1);
  if (existing[0]) {
    await db.update(habitLogs).set({ value: input.value, note: input.note ?? null }).where(eq(habitLogs.id, existing[0].id));
    const updated = await db.select().from(habitLogs).where(eq(habitLogs.id, existing[0].id)).limit(1);
    await persistSupabaseSnapshot(input.userId);
    return updated[0];
  }
  await db.insert(habitLogs).values(input);
  const created = await db.select().from(habitLogs).where(and(eq(habitLogs.habitId, input.habitId), eq(habitLogs.loggedAt, input.loggedAt))).limit(1);
  await persistSupabaseSnapshot(input.userId);
  return created[0];
}

export async function deleteHabitLog(userId: number, habitId: number, loggedAt: string) {
  const db = requireDb();
  await db.delete(habitLogs).where(and(eq(habitLogs.userId, userId), eq(habitLogs.habitId, habitId), eq(habitLogs.loggedAt, loggedAt)));
  await persistSupabaseSnapshot(userId);
  return { success: true } as const;
}

export async function createCustomHabit(input: InsertHabit) {
  const db = requireDb();
  await db.insert(habits).values(input);
  const created = await db.select().from(habits).where(and(eq(habits.userId, input.userId), eq(habits.name, input.name))).orderBy(desc(habits.id)).limit(1);
  await persistSupabaseSnapshot(input.userId);
  return created[0];
}

export async function saveStravaActivity(input: InsertStravaActivity) {
  const db = requireDb();
  await db.insert(stravaActivities).values(input);
  const created = await db.select().from(stravaActivities).where(and(eq(stravaActivities.userId, input.userId), eq(stravaActivities.activityDate, input.activityDate))).orderBy(desc(stravaActivities.id)).limit(1);
  await persistSupabaseSnapshot(input.userId);
  return created[0];
}

export async function getRecentStravaActivities(userId: number, from: string, to: string) {
  const db = requireDb();
  return db.select({ id: stravaActivities.id, distanceKm: stravaActivities.distanceKm, durationSeconds: stravaActivities.durationSeconds, pace: stravaActivities.pace, activityDate: stravaActivities.activityDate, verified: stravaActivities.verified })
    .from(stravaActivities).where(and(eq(stravaActivities.userId, userId), gte(stravaActivities.activityDate, from), lte(stravaActivities.activityDate, to))).orderBy(desc(stravaActivities.activityDate));
}

export async function getLatestWeeklyInsight(userId: number) {
  const db = requireDb();
  const result = await db.select().from(weeklyInsights).where(eq(weeklyInsights.userId, userId)).orderBy(desc(weeklyInsights.weekStart)).limit(1);
  return result[0];
}

export async function saveWeeklyInsight(input: InsertWeeklyInsight) {
  const db = requireDb();
  const existing = await db.select().from(weeklyInsights).where(and(eq(weeklyInsights.userId, input.userId), eq(weeklyInsights.weekStart, input.weekStart))).limit(1);
  if (existing[0]) {
    await db.update(weeklyInsights).set({ content: input.content, actionableSuggestion: input.actionableSuggestion ?? null }).where(eq(weeklyInsights.id, existing[0].id));
    const updated = await db.select().from(weeklyInsights).where(eq(weeklyInsights.id, existing[0].id)).limit(1);
    await persistSupabaseSnapshot(input.userId);
    return updated[0];
  }
  await db.insert(weeklyInsights).values(input);
  const created = await db.select().from(weeklyInsights).where(and(eq(weeklyInsights.userId, input.userId), eq(weeklyInsights.weekStart, input.weekStart))).limit(1);
  await persistSupabaseSnapshot(input.userId);
  return created[0];
}

function userSummary(user: User, profile?: { displayName: string } | null) {
  return { id: user.id, name: profile?.displayName || user.name || "Nixesis member", email: user.email };
}

export async function searchPeople(userId: number, query: string) {
  const db = requireDb();
  const normalized = `%${query.trim().toLowerCase()}%`;
  const results = await db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.role, "user"), sql`${users.id} <> ${userId}`, or(sql`lower(${users.email}) like ${normalized}`, sql`lower(${users.name}) like ${normalized}`)));
  return results.filter(({ user }) => user.id !== userId).slice(0, 12).map(({ user, profile }) => userSummary(user, profile));
}

export async function getFriendRows(userId: number) {
  const db = requireDb();
  const rows = await db.select({ friendship: friendships, user: users, profile: profiles }).from(friendships)
    .innerJoin(users, or(eq(users.id, friendships.requesterId), eq(users.id, friendships.addresseeId)))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))));
  const unique = new Map<number, { user: User; profile: typeof profiles.$inferSelect | null }>();
  rows.forEach((row) => { if (row.user.id !== userId) unique.set(row.user.id, { user: row.user, profile: row.profile }); });
  return Array.from(unique.values());
}

async function progressForUser(userId: number, from: string, to: string) {
  const db = requireDb();
  const logs = await db.select({ value: habitLogs.value, type: habits.type }).from(habitLogs).innerJoin(habits, eq(habits.id, habitLogs.habitId))
    .where(and(eq(habitLogs.userId, userId), gte(habitLogs.loggedAt, from), lte(habitLogs.loggedAt, to)));
  return {
    readingMinutes: logs.filter((row) => row.type === "reading").reduce((sum, row) => sum + Number(row.value), 0),
    gymSessions: logs.filter((row) => row.type === "gym").filter((row) => Number(row.value) > 0).length,
    completedHabits: logs.filter((row) => Number(row.value) > 0).length,
  };
}

export async function getSocialHome(userId: number) {
  const db = requireDb();
  const since = new Date(); since.setDate(since.getDate() - 6);
  const from = since.toISOString().slice(0, 10); const to = new Date().toISOString().slice(0, 10);
  const friends = await getFriendRows(userId);
  const friendProgress = await Promise.all(friends.map(async ({ user, profile }) => ({ ...userSummary(user, profile), progress: await progressForUser(user.id, from, to) })));
  const pendingIncoming = await db.select({ friendship: friendships, user: users, profile: profiles }).from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")));
  const pendingOutgoing = await db.select({ friendship: friendships, user: users, profile: profiles }).from(friendships)
    .innerJoin(users, eq(users.id, friendships.addresseeId)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(friendships.requesterId, userId), eq(friendships.status, "pending")));
  return {
    friends: friendProgress,
    incoming: pendingIncoming.map(({ friendship, user, profile }) => ({ requestId: friendship.id, ...userSummary(user, profile) })),
    outgoing: pendingOutgoing.map(({ friendship, user, profile }) => ({ requestId: friendship.id, ...userSummary(user, profile) })),
  };
}

async function addAlert(input: InsertAlert) {
  const db = requireDb();
  await db.insert(alerts).values(input);
}

export async function sendFriendRequest(requesterId: number, addresseeId: number) {
  const db = requireDb();
  if (requesterId === addresseeId) throw new Error("You cannot add yourself");
  const existing = await db.select().from(friendships).where(or(and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)), and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId)))).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(friendships).values({ requesterId, addresseeId, status: "pending" });
  const created = await db.select().from(friendships).where(and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId))).limit(1);
  const requester = await db.select().from(users).where(eq(users.id, requesterId)).limit(1);
  await addAlert({ userId: addresseeId, kind: "friend_request", title: "New friend request", message: `${requester[0]?.name || "A Nixesis member"} wants to share progress with you.`, link: "/social" });
  await persistSupabaseSnapshot(requesterId);
  await persistSupabaseSnapshot(addresseeId);
  return created[0];
}

export async function respondToFriendRequest(userId: number, requestId: number, accept: boolean) {
  const db = requireDb();
  const request = await db.select().from(friendships).where(and(eq(friendships.id, requestId), eq(friendships.addresseeId, userId), eq(friendships.status, "pending"))).limit(1);
  if (!request[0]) throw new Error("Friend request not found");
  await db.update(friendships).set({ status: accept ? "accepted" : "declined" }).where(eq(friendships.id, requestId));
  if (accept) {
    const accepter = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await addAlert({ userId: request[0].requesterId, kind: "friend_accepted", title: "Friend request accepted", message: `${accepter[0]?.name || "Your friend"} is now sharing progress with you.`, link: "/social" });
  }
  await persistSupabaseSnapshot(userId);
  await persistSupabaseSnapshot(request[0].requesterId);
  return { success: true } as const;
}

export async function getEventRows(userId: number) {
  const db = requireDb();
  const eventRows = await db.select({ event: events, organizer: users }).from(events).innerJoin(users, eq(users.id, events.organizerId)).orderBy(desc(events.startDate)).limit(30);
  const ids = eventRows.map(({ event }) => event.id);
  const participantRows = ids.length ? await db.select({ participant: eventParticipants, user: users, profile: profiles }).from(eventParticipants).innerJoin(users, eq(users.id, eventParticipants.userId)).leftJoin(profiles, eq(profiles.userId, users.id)).where(inArray(eventParticipants.eventId, ids)) : [];
  return eventRows.map(({ event, organizer }) => ({
    ...event,
    organizer: { id: organizer.id, name: organizer.name || "Nixesis member" },
    isJoined: participantRows.some(({ participant }) => participant.eventId === event.id && participant.userId === userId),
    participants: participantRows.filter(({ participant }) => participant.eventId === event.id).map(({ user, profile }) => ({ id: user.id, name: profile?.displayName || user.name || "Member", email: user.email })),
  }));
}

export async function createEvent(input: InsertEvent, inviteUserIds: number[]) {
  const db = requireDb();
  await db.insert(events).values(input);
  const created = await db.select().from(events).where(and(eq(events.organizerId, input.organizerId), eq(events.title, input.title))).orderBy(desc(events.id)).limit(1);
  const event = created[0];
  if (!event) throw new Error("Event creation failed");
  await db.insert(eventParticipants).values({ eventId: event.id, userId: input.organizerId });
  const recipientIds = Array.from(new Set(inviteUserIds.filter((id) => id !== input.organizerId)));
  if (recipientIds.length) {
    await db.insert(eventParticipants).values(recipientIds.map((userId) => ({ eventId: event.id, userId })));
    await Promise.all(recipientIds.map((userId) => addAlert({ userId, kind: "event_invite", title: "You were invited to an event", message: `${input.title} is ready for your next rep.`, link: "/events" })));
  }
  await persistSupabaseSnapshot(input.organizerId);
  await Promise.all(recipientIds.map((userId) => persistSupabaseSnapshot(userId)));
  return event;
}

export async function joinEvent(userId: number, eventId: number) {
  const db = requireDb();
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event[0]) throw new Error("Event not found");
  const existing = await db.select().from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId))).limit(1);
  if (!existing[0]) {
    await db.insert(eventParticipants).values({ eventId, userId });
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await addAlert({ userId: event[0].organizerId, kind: "event_joined", title: "Someone joined your event", message: `${user[0]?.name || "A member"} joined ${event[0].title}.`, link: "/events" });
  }
  await persistSupabaseSnapshot(userId);
  await persistSupabaseSnapshot(event[0].organizerId);
  return { success: true } as const;
}

export async function getAlerts(userId: number) {
  const db = requireDb();
  const rows = await db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt)).limit(30);
  return { rows, unreadCount: rows.filter((row) => !row.isRead).length };
}

export async function markAlertsRead(userId: number, alertId?: number) {
  const db = requireDb();
  if (alertId) await db.update(alerts).set({ isRead: true }).where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));
  else await db.update(alerts).set({ isRead: true }).where(eq(alerts.userId, userId));
  await persistSupabaseSnapshot(userId);
  return { success: true } as const;
}
