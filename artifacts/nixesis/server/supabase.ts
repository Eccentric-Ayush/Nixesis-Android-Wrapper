import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_STRAVA_BUCKET = "nixesis-strava-screenshots";
const DEFAULT_BACKUP_BUCKET = "nixesis-backups";

let client: SupabaseClient | null = null;
const bucketReady = new Map<string, Promise<void>>();

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return {
    url: url.replace(/\/$/, ""),
    key,
    stravaBucket: process.env.SUPABASE_STRAVA_BUCKET || DEFAULT_STRAVA_BUCKET,
    backupBucket: process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BACKUP_BUCKET,
  };
}

export function isSupabaseConfigured() {
  return Boolean(config());
}

function getClient() {
  const values = config();
  if (!values) return null;
  if (!client) {
    client = createClient(values.url, values.key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return { client, stravaBucket: values.stravaBucket, backupBucket: values.backupBucket };
}

function userFolder(userKey: string) {
  return createHash("sha256").update(userKey).digest("hex").slice(0, 24);
}

async function ensureBucket(bucket: string, allowedMimeTypes: string[]) {
  const supabase = getClient();
  if (!supabase) return null;
  if (!bucketReady.has(bucket)) {
    const ready = (async () => {
      const { error } = await supabase.client.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: "15MB",
        allowedMimeTypes,
      });
      if (error && !/already exists/i.test(error.message) && Number(error.statusCode) !== 409) {
        throw new Error(`Supabase bucket setup failed: ${error.message}`);
      }
    })().catch((error) => {
      bucketReady.delete(bucket);
      throw error;
    });
    bucketReady.set(bucket, ready);
  }
  await bucketReady.get(bucket);
  return supabase;
}

export type NixesisSnapshot = {
  schemaVersion: 1;
  syncedAt: string;
  user: unknown;
  profile: unknown;
  habits: unknown[];
  habitLogs: unknown[];
  stravaActivities: unknown[];
  weeklyInsights: unknown[];
  friendships: unknown[];
  events: unknown[];
  eventParticipants: unknown[];
  alerts: unknown[];
  streaks: unknown[];
};

export async function syncSnapshotToSupabase(userKey: string, snapshot: NixesisSnapshot) {
  const supabase = await ensureBucket(config()?.backupBucket || DEFAULT_BACKUP_BUCKET, ["application/json"]);
  if (!supabase) return { synced: false as const, reason: "not-configured" as const };
  const bucket = supabase.backupBucket;
  const path = `users/${userFolder(userKey)}/snapshot.json`;
  const { error } = await supabase.client.storage.from(bucket).upload(
    path,
    Buffer.from(JSON.stringify(snapshot), "utf8"),
    { contentType: "application/json", cacheControl: "3600", upsert: true },
  );
  if (error) throw new Error(`Supabase snapshot upload failed: ${error.message}`);
  return { synced: true as const, bucket, path, url: `supabase://${bucket}/${path}` };
}

export async function uploadStravaScreenshot(input: {
  userKey: string;
  fileName: string;
  contentType: string;
  data: Buffer;
}) {
  const supabase = await ensureBucket(config()?.stravaBucket || DEFAULT_STRAVA_BUCKET, ["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!supabase) return null;
  const bucket = supabase.stravaBucket;
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `users/${userFolder(input.userKey)}/strava/${randomUUID()}-${safeName}`;
  const { error } = await supabase.client.storage.from(bucket).upload(path, input.data, {
    contentType: input.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Supabase screenshot upload failed: ${error.message}`);
  const signed = await supabase.client.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Supabase screenshot signing failed: ${signed.error?.message || "empty signed URL"}`);
  }
  return {
    key: path,
    url: `supabase://${bucket}/${path}`,
    signedUrl: signed.data.signedUrl,
  };
}
