import {
  pgTable,
  uuid,
  timestamp,
  text,
  real,
  jsonb,
  integer,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";

// ── Auth.js tables (required by @auth/drizzle-adapter) ──────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  })
);

// ── Application tables ──────────────────────────────────────────────

export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("processing"),
  currentStep: text("current_step"),
  errorMessage: text("error_message"),
  originalFilename: text("original_filename").notNull(),
  durationSeconds: real("duration_seconds"),
  detectedLanguage: text("detected_language"),
  speakerRoster: jsonb("speaker_roster").default([]),
  eventName: text("event_name"),
  eventLocation: text("event_location"),
  interviewer: text("interviewer"),
  organization: text("organization"),
  summary: text("summary"),
  transcriptEnglish: jsonb("transcript_english"),
  transcriptOriginal: jsonb("transcript_original"),
  audioBlobUrl: text("audio_blob_url"),
});
