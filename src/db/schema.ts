import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { Track } from "@/lib/types";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlistTracks = pgTable("playlist_tracks", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id")
    .notNull()
    .references(() => playlists.id, { onDelete: "cascade" }),
  trackId: text("track_id").notNull(),
  track: jsonb("track").$type<Track>().notNull(),
  position: integer("position").notNull().default(0),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const likedTracks = pgTable(
  "liked_tracks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull(),
    track: jsonb("track").$type<Track>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("liked_user_track").on(t.userId, t.trackId)],
);

export const listeningLogs = pgTable("listening_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trackId: text("track_id").notNull(),
  track: jsonb("track").$type<Track>().notNull(),
  secondsListened: integer("seconds_listened").notNull().default(0),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  code: text("code").primaryKey(),
  hostId: integer("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  state: jsonb("state").$type<RoomState | null>(),
  stateUpdatedAt: timestamp("state_updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    id: serial("id").primaryKey(),
    code: text("code")
      .notNull()
      .references(() => rooms.code, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
  },
  (t) => [unique("room_member_unique").on(t.code, t.userId)],
);

export interface RoomState {
  track: Track | null;
  queue: Track[];
  index: number;
  position: number;
  playing: boolean;
  seq: number;
}
