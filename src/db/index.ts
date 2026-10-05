if (typeof window !== "undefined") {
  throw new Error("Security Error: @/db cannot be imported on the client side.");
}

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";

// Neon HTTP Serverless Client (optimized for Netlify/Serverless & Local)
export const sql = databaseUrl ? neon(databaseUrl) : null;
export const db = sql ? drizzle(sql, { schema }) : null;

