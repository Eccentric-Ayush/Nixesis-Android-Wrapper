import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nixesis.app",
  appName: "Nixesis",
  webDir: "dist/public",
  backgroundColor: "#14120f",
  server: {
    androidScheme: "https",
  },
};

export default config;