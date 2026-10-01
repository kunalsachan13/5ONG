import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kunalsachan.song",
  appName: "5ONG",
  webDir: "public",
  server: {
    url: "https://5ong.vercel.app",
    cleartext: true,
  },
  backgroundColor: "#faf6ff",
  android: {
    allowMixedContent: true,
    backgroundColor: "#faf6ff",
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
