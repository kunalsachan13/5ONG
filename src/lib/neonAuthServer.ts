if (typeof window !== "undefined") {
  throw new Error("Security Error: @/lib/neonAuthServer cannot be imported on the client side.");
}

import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "a7a0882b918c4d6ac930e82370f497200d15d35bade0c4765b8a6f3fa298e436",
  },
});
