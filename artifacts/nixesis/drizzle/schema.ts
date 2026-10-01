import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  readingGoalMinutes: int("readingGoalMinutes").default(20).notNull(),
  gymWeeklyTarget: int("gymWeeklyTarget").default(4).notNull(),
  sleepGoalHours: decimal("sleepGoalHours", { precision: 4, scale: 2 }).default("8.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export const habits = mysqlTable("habits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["reading", "gym", "sleep", "custom"]).default("custom").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  icon: varchar("icon", { length: 32 }).default("target").notNull(),
  frequencyType: mysqlEnum("frequencyType", ["daily", "weekly_count", "specific_weekdays"]).default("daily").notNull(),
  targetValue: decimal("targetValue", { precision: 10, scale: 2 }).default("1").notNull(),
  unit: varchar("unit", { length: 32 }).default("times").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userActiveIdx: index("habits_user_active_idx").on(table.userId, table.isActive) }));

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

export const habitLogs = mysqlTable("habit_logs", {
  id: int("id").autoincrement().primaryKey(),
  habitId: int("habitId").notNull().references(() => habits.id),
  userId: int("userId").notNull().references(() => users.id),
  loggedAt: date("loggedAt", { mode: "string" }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userLoggedIdx: index("habit_logs_user_logged_idx").on(table.userId, table.loggedAt),
  habitDateUnique: uniqueIndex("habit_logs_habit_date_unique").on(table.habitId, table.loggedAt),
}));

export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = typeof habitLogs.$inferInsert;

export const stravaActivities = mysqlTable("strava_activities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  sourceScreenshotUrl: text("sourceScreenshotUrl"),
  distanceKm: decimal("distanceKm", { precision: 8, scale: 2 }),
  durationSeconds: int("durationSeconds"),
  pace: varchar("pace", { length: 32 }),
  activityDate: date("activityDate", { mode: "string" }).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userDateIdx: index("strava_user_date_idx").on(table.userId, table.activityDate) }));

export type StravaActivity = typeof stravaActivities.$inferSelect;
export type InsertStravaActivity = typeof stravaActivities.$inferInsert;

export const weeklyInsights = mysqlTable("weekly_insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  weekStart: date("weekStart", { mode: "string" }).notNull(),
  content: text("content").notNull(),
  actionableSuggestion: text("actionableSuggestion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userWeekUnique: uniqueIndex("weekly_insights_user_week_unique").on(table.userId, table.weekStart) }));

export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type InsertWeeklyInsight = typeof weeklyInsights.$inferInsert;

export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull().references(() => users.id),
  addresseeId: int("addresseeId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pairUnique: uniqueIndex("friendships_pair_unique").on(table.requesterId, table.addresseeId),
  requesterIdx: index("friendships_requester_idx").on(table.requesterId, table.status),
  addresseeIdx: index("friendships_addressee_idx").on(table.addresseeId, table.status),
}));

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  organizerId: int("organizerId").notNull().references(() => users.id),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", ["competition", "group_goal", "meetup"]).default("competition").notNull(),
  metric: mysqlEnum("metric", ["reading_minutes", "gym_sessions", "sleep_hours", "habit_completions"]).default("habit_completions").notNull(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }).notNull(),
  goalValue: decimal("goalValue", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["upcoming", "active", "completed", "cancelled"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ organizerIdx: index("events_organizer_idx").on(table.organizerId, table.status), datesIdx: index("events_dates_idx").on(table.startDate, table.endDate) }));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export const eventParticipants = mysqlTable("event_participants", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => events.id),
  userId: int("userId").notNull().references(() => users.id),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({ eventUserUnique: uniqueIndex("event_participants_event_user_unique").on(table.eventId, table.userId), eventIdx: index("event_participants_event_idx").on(table.eventId) }));

export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = typeof eventParticipants.$inferInsert;

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  kind: mysqlEnum("kind", ["friend_request", "friend_accepted", "event_invite", "event_joined", "event_update", "competition_result", "system"]).default("system").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 255 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userReadIdx: index("alerts_user_read_idx").on(table.userId, table.isRead, table.createdAt) }));

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
