import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import { isSupabaseConfigured, uploadStravaScreenshot } from "./supabase";
import {
  createCustomHabit,
  createEvent,
  deleteHabitLog,
  getAlerts,
  getDashboardData,
  getEventRows,
  getHabitLogs,
  getRecentStravaActivities,
  getOrCreateProfile,
  getSocialHome,
  getUserByOpenId,
  joinEvent,
  markAlertsRead,
  respondToFriendRequest,
  saveStravaActivity,
  saveWeeklyInsight,
  searchPeople,
  sendFriendRequest,
  upsertHabitLog,
} from "./db";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates");

function getWeekStart(date = new Date()) {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday.toISOString().slice(0, 10);
}

function llmText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : "text" in part ? part.text : "").join("\n");
  return "";
}

const parseStravaSchema = {
  type: "object",
  properties: {
    distanceKm: { type: "number" }, durationSeconds: { type: "integer" }, pace: { type: "string" }, activityDate: { type: "string", description: "YYYY-MM-DD" },
  }, required: ["distanceKm", "durationSeconds", "pace", "activityDate"], additionalProperties: false,
};
const parseLogSchema = {
  type: "object", properties: { entries: { type: "array", items: { type: "object", properties: { habitType: { type: "string", enum: ["reading", "gym", "sleep", "custom"] }, value: { type: "number" }, date: { type: "string", description: "YYYY-MM-DD" }, note: { type: "string" } }, required: ["habitType", "value", "date"], additionalProperties: false } } }, required: ["entries"], additionalProperties: false,
};
const summarySchema = { type: "object", properties: { content: { type: "string" }, actionableSuggestion: { type: "string" } }, required: ["content", "actionableSuggestion"], additionalProperties: false };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  supabase: router({
    status: protectedProcedure.query(() => ({ configured: isSupabaseConfigured(), provider: isSupabaseConfigured() ? "supabase" as const : "manus" as const })),
  }),

  dashboard: router({
    get: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user)),
    profile: protectedProcedure.query(({ ctx }) => getOrCreateProfile(ctx.user)),
  }),

  habits: router({
    logs: protectedProcedure.input(z.object({ from: dateSchema, to: dateSchema })).query(({ ctx, input }) => getHabitLogs(ctx.user.id, input.from, input.to)),
    log: protectedProcedure.input(z.object({ habitId: z.number().int().positive(), loggedAt: dateSchema, value: z.number().nonnegative(), note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => upsertHabitLog({ ...input, userId: ctx.user.id, value: String(input.value) })),
    removeLog: protectedProcedure.input(z.object({ habitId: z.number().int().positive(), loggedAt: dateSchema })).mutation(({ ctx, input }) => deleteHabitLog(ctx.user.id, input.habitId, input.loggedAt)),
    create: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), icon: z.string().max(32).default("target"), type: z.enum(["reading", "gym", "sleep", "custom"]).default("custom"), frequencyType: z.enum(["daily", "weekly_count", "specific_weekdays"]).default("daily"), targetValue: z.number().positive(), unit: z.string().min(1).max(32).default("times") })).mutation(({ ctx, input }) => createCustomHabit({ ...input, userId: ctx.user.id, targetValue: String(input.targetValue), isActive: true })),
  }),

  social: router({
    home: protectedProcedure.query(({ ctx }) => getSocialHome(ctx.user.id)),
    search: protectedProcedure.input(z.object({ query: z.string().min(2).max(120) })).query(({ ctx, input }) => searchPeople(ctx.user.id, input.query)),
    sendRequest: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => sendFriendRequest(ctx.user.id, input.userId)),
    respond: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), accept: z.boolean() })).mutation(({ ctx, input }) => respondToFriendRequest(ctx.user.id, input.requestId, input.accept)),
  }),

  events: router({
    list: protectedProcedure.query(({ ctx }) => getEventRows(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().min(3).max(160), description: z.string().max(1200).optional(), eventType: z.enum(["competition", "group_goal", "meetup"]), metric: z.enum(["reading_minutes", "gym_sessions", "sleep_hours", "habit_completions"]), startDate: dateSchema, endDate: dateSchema, goalValue: z.number().positive().optional(), inviteUserIds: z.array(z.number().int().positive()).max(50).default([]) })).mutation(({ ctx, input }) => createEvent({ organizerId: ctx.user.id, title: input.title, description: input.description, eventType: input.eventType, metric: input.metric, startDate: input.startDate, endDate: input.endDate, goalValue: input.goalValue === undefined ? null : String(input.goalValue), status: "upcoming" }, input.inviteUserIds)),
    join: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(({ ctx, input }) => joinEvent(ctx.user.id, input.eventId)),
  }),

  alerts: router({
    list: protectedProcedure.query(({ ctx }) => getAlerts(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ alertId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => markAlertsRead(ctx.user.id, input.alertId)),
  }),

  ai: router({
    parseNaturalLanguage: protectedProcedure.input(z.object({ text: z.string().min(2).max(1000) })).mutation(async ({ input }) => {
      const response = await invokeLLM({ messages: [{ role: "system", content: "You are Nixesis habit parser. Extract only explicit habit actions from the user's text. Return strict JSON entries. Never invent values or dates." }, { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}. Parse this habit log: ${input.text}` }], response_format: { type: "json_schema", json_schema: { name: "habit_log_entries", strict: true, schema: parseLogSchema } }, max_tokens: 500 });
      return JSON.parse(llmText(response.choices[0]?.message.content));
    }),
    weeklySummary: protectedProcedure.mutation(async ({ ctx }) => {
      const weekStart = getWeekStart();
      const dashboard = await getDashboardData(ctx.user);
      if (dashboard.insight?.weekStart === weekStart) return dashboard.insight;
      const start = new Date(); start.setDate(start.getDate() - 6);
      const from = start.toISOString().slice(0, 10); const to = new Date().toISOString().slice(0, 10);
      const activities = await getRecentStravaActivities(ctx.user.id, from, to);
      const response = await invokeLLM({ messages: [{ role: "system", content: "You are the Nixesis performance coach. Write a concise, warm 3-sentence weekly assessment and one specific actionable suggestion. Be encouraging, concrete, and never judgmental. Return strict JSON." }, { role: "user", content: JSON.stringify({ logs: dashboard.logs, activities, profile: dashboard.profile }) }], response_format: { type: "json_schema", json_schema: { name: "weekly_assessment", strict: true, schema: summarySchema } }, max_tokens: 600 });
      const parsed = JSON.parse(llmText(response.choices[0]?.message.content)) as { content: string; actionableSuggestion: string };
      return saveWeeklyInsight({ userId: ctx.user.id, weekStart, content: parsed.content, actionableSuggestion: parsed.actionableSuggestion });
    }),
    parseStrava: protectedProcedure.input(z.object({ imageUrl: z.string().url() })).mutation(async ({ input }) => {
      const response = await invokeLLM({ messages: [{ role: "system", content: "You extract running metrics from Strava screenshots. Read only visible values and return strict JSON. If a value is not visible, use the best literal interpretation without adding commentary." }, { role: "user", content: [{ type: "text", text: "Extract distance, duration, pace, and activity date from this screenshot." }, { type: "image_url", image_url: { url: input.imageUrl, detail: "high" } }] }], response_format: { type: "json_schema", json_schema: { name: "strava_metrics", strict: true, schema: parseStravaSchema } }, max_tokens: 400 });
      return JSON.parse(llmText(response.choices[0]?.message.content));
    }),
  }),

  strava: router({
    upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(160), contentType: z.string().regex(/^image\//), base64: z.string().min(100) })).mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      let supabaseUpload: Awaited<ReturnType<typeof uploadStravaScreenshot>> = null;
      try {
        supabaseUpload = await uploadStravaScreenshot({ userKey: ctx.user.openId, fileName: safeName, contentType: input.contentType, data: Buffer.from(input.base64, "base64") });
      } catch (error) {
        console.warn("[Supabase] Screenshot upload failed; using Manus storage fallback:", error instanceof Error ? error.message : error);
      }
      if (supabaseUpload) return { ...supabaseUpload, storageProvider: "supabase" as const };
      const uploaded = await storagePut(`${ctx.user.id}-strava/${crypto.randomUUID()}-${safeName}`, Buffer.from(input.base64, "base64"), input.contentType);
      const signedUrl = await storageGetSignedUrl(uploaded.key);
      return { ...uploaded, signedUrl, storageProvider: isSupabaseConfigured() ? "manus-fallback" as const : "manus" as const };
    }),
    confirm: protectedProcedure.input(z.object({ sourceScreenshotUrl: z.string().min(1), distanceKm: z.number().nonnegative(), durationSeconds: z.number().int().nonnegative(), pace: z.string().max(32), activityDate: dateSchema })).mutation(({ ctx, input }) => saveStravaActivity({ ...input, userId: ctx.user.id, distanceKm: String(input.distanceKm), verified: true })),
  }),
});

export type AppRouter = typeof appRouter;
