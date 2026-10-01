import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    media: { access: "public_read" },
  },
  functions: {
    api: { name: "api", source: "./hello.ts" },
  },
});
